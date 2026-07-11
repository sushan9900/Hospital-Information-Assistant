# ==============================================================================
# Hospital Information Assistance — AI Chatbot Service
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file implements the AI chatbot using LangChain and Groq.
#   The chatbot is session-based — each user has their own conversation memory
#   so the AI can remember what was said earlier in the conversation.
#
# HOW IT WORKS:
#   1. User sends a message with a session_id
#   2. LangChain loads the conversation history for that session_id
#   3. The history + new message are sent to Groq LLM
#   4. Groq generates a context-aware reply
#   5. The reply is saved to the session history for future messages
#
# KEY COMPONENTS:
#   - ChatGroq               → Groq LLM integration via LangChain
#   - ChatPromptTemplate     → System prompt + message history template
#   - RunnableWithMessageHistory → Automatically manages memory per session
#   - ChatMessageHistory     → Stores conversation turns per session_id
#
# TECHNOLOGY:
#   - LangChain Core (runnables, prompts, message history)
#   - Groq API (llama3-8b-8192 model by default)
#   - In-memory session store (dict) — one ChatMessageHistory per session_id
# ==============================================================================

import uuid
import asyncio
from datetime import datetime
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory

from fastapi import HTTPException, status

from app.config import settings
from app.models.chat_session import ChatSession
from app.models.user import User
from app.schemas.chatbot import (
    ChatRequest,
    ChatResponse,
    SessionCreateRequest,
    SessionResponse,
    SessionListResponse,
    ChatMessage,
    ChatHistoryResponse
)
from app.services.qdrant_service import QdrantService


# ==============================================================================
# IN-MEMORY SESSION STORE
# WHY: LangChain's RunnableWithMessageHistory needs a way to store and retrieve
#      conversation histories. We use a simple Python dict where:
#        key   = session_id (string)
#        value = ChatMessageHistory object (holds all messages for that session)
#
# NOTE: This is an in-memory store — histories are lost when the server restarts.
#       For production, replace with a Redis or database-backed store.
# ==============================================================================
_session_store: Dict[str, ChatMessageHistory] = {}


def get_session_history(session_id: str) -> ChatMessageHistory:
    """
    Retrieves or creates a ChatMessageHistory for the given session_id.
    Called automatically by RunnableWithMessageHistory for every message.

    Args:
        session_id: Unique identifier for the conversation session.

    Returns:
        ChatMessageHistory object containing all past messages for this session.
    """
    # If this session doesn't exist yet, create an empty history for it
    if session_id not in _session_store:
        _session_store[session_id] = ChatMessageHistory()

    return _session_store[session_id]


# ==============================================================================
# SYSTEM PROMPT
# WHY: The system prompt tells the AI how to behave — its personality,
#      its role, and what it should and shouldn't do.
# WHAT: Defines the AI as a Hospital Information Assistant.
# ==============================================================================
HOSPITAL_SYSTEM_PROMPT = """You are a helpful, professional, and friendly AI assistant for the Hospital Information Assistance system.

Your role is to help users find information about the hospital, its departments, doctors, services, and appointment scheduling.

Strict Guidelines:
1. GREETINGS & INTRODUCTIONS: You are allowed to respond to greetings (e.g., "Hello", "Hi", "Good morning", "Hey"), thank the user, and engage in polite conversational filler or introduce your capabilities as the Hospital Information Assistant. You should invite them to ask about hospital departments, doctors, appointment scheduling, and services.
2. FACTUAL QUESTIONS: For any factual questions about the hospital, its departments, doctors, fees, schedules, appointments, or services, you MUST rely ONLY on the provided context below. Do NOT use external pre-trained knowledge, and do NOT assume or invent any details not explicitly mentioned in the context.
3. INSUFFICIENT INFORMATION: If a factual question about the hospital, a doctor, a department, or an appointment cannot be answered using the provided context, you must state:
   "I don't have enough information about that in our hospital records. Please contact the hospital directly for more details."
4. NO MEDICAL ADVICE: Do NOT provide medical diagnoses, treatment advice, or prescribe medications under any circumstances. If the user asks about medical symptoms, personal advice, or health guidelines, politely refuse and state that you can only assist with hospital administration, schedules, departments, and doctors.
5. CONVERSATION HISTORY: Use the conversation history to maintain context for follow-up questions, especially when discussing records.
6. FORMATTING: Present your answers in a professional, structured manner using Markdown formatting (such as bullet points, bold text, headers, and simple tables where appropriate) to make them readable and easy to follow.

Context interpretation:
- The context may include TWO sections:
  a) "Semantic Search Results" — text descriptions of doctor/department records.
  b) "Live Database Query Results" — raw JSON rows fetched directly from the database in real-time.
- When the Live Database Query Results contain a JSON array with a "count" field (e.g. [{{"count": 5}}]),
  interpret it as the exact number of matching records and state that number in your answer.
- When the Live Database Query Results contain rows of doctor or department data, summarize them clearly.
- The Live Database Query Results are always the most up-to-date and accurate data — prefer them over Semantic Search Results when both are present.

Relevant context from the hospital database:
{context}
"""



# ==============================================================================
# AI SERVICE CLASS
# ==============================================================================
class AIService:

    # --------------------------------------------------------------------------
    # CLASS-LEVEL LLM INSTANCE
    # WHY: Creating the ChatGroq instance once at the class level is efficient.
    #      We reuse the same LLM object for all requests instead of recreating
    #      it on every API call (which would be slower and wasteful).
    # --------------------------------------------------------------------------
    _llm: Optional[ChatGroq] = None
    _chain_with_history: Optional[RunnableWithMessageHistory] = None

    @classmethod
    def _get_llm(cls) -> ChatGroq:
        """
        Returns the ChatGroq LLM instance, creating it if needed.
        Lazy initialization — only created when first needed.

        Returns:
            ChatGroq instance configured with Groq API key and model.
        """
        if cls._llm is None:
            cls._llm = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
                temperature=0.0,        # 0.0 is completely deterministic and strictly follows prompt instructions
                max_tokens=1024,        # Max tokens in AI response
            )
        return cls._llm

    @classmethod
    def _get_chain(cls) -> RunnableWithMessageHistory:
        """
        Builds and returns the LangChain chain with session-based memory.
        The chain connects: Prompt Template → LLM → Message History

        Returns:
            RunnableWithMessageHistory that manages conversation memory.
        """
        if cls._chain_with_history is None:

            # Step 1: Build the prompt template
            # The prompt has three parts:
            #   a) System message: tells the AI its role, rules, and database context
            #   b) MessagesPlaceholder: inserts the conversation history here
            #   c) Human message: inserts current user message
            prompt = ChatPromptTemplate.from_messages([
                ("system", HOSPITAL_SYSTEM_PROMPT),
                MessagesPlaceholder(variable_name="history"),  # Chat history goes here
                ("human", "{input}"),                          # Current user message
            ])

            # Step 2: Connect prompt → LLM (this is the "chain")
            chain = prompt | cls._get_llm()

            # Step 3: Wrap the chain with message history management
            # RunnableWithMessageHistory automatically:
            #   - Loads history BEFORE sending to LLM (using get_session_history)
            #   - Saves the new message + AI reply AFTER getting a response
            cls._chain_with_history = RunnableWithMessageHistory(
                chain,
                get_session_history,            # Function to load/create history
                input_messages_key="input",     # Key for the user's message
                history_messages_key="history", # Key for conversation history
            )

        return cls._chain_with_history

    # --------------------------------------------------------------------------
    # SEND CHAT MESSAGE
    # WHY: The main function — handles one round of conversation.
    #      Loads session history, sends message to Groq, saves response.
    # WHAT: Processes a user message and returns the AI's reply.
    # INPUT:
    #   - db: AsyncSession → database session (to update ChatSession record)
    #   - chat_request: ChatRequest → session_id + message from client
    #   - current_user: User → the logged-in user (for DB record)
    # OUTPUT: ChatResponse with AI reply and session metadata
    # --------------------------------------------------------------------------
    @staticmethod
    async def send_message(
        db: AsyncSession,
        chat_request: ChatRequest,
        current_user: User
    ) -> ChatResponse:
        """
        Processes a user message through the LangChain + Groq pipeline.

        Steps:
        1. Validate the message is not empty
        2. Get or create the ChatSession DB record for this session_id
        3. Search Qdrant for relevant database context
        4. Invoke the LangChain chain (loads history → sends to Groq with context → saves reply)
        5. Update the ChatSession DB record with message count and preview
        6. Return the AI response

        Args:
            db: Async database session.
            chat_request: Contains session_id and the user's message.
            current_user: The logged-in user sending the message.

        Returns:
            ChatResponse with the AI's reply and session metadata.

        Raises:
            HTTPException 400: If the message is empty.
            HTTPException 500: If Groq API call fails.
        """

        # Step 1: Validate message is not empty or whitespace
        if not chat_request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty."
            )

        # Step 2: Get or create ChatSession record in PostgreSQL
        # This tracks the session in the database (not the in-memory history)
        db_session = await AIService._get_or_create_db_session(
            db=db,
            session_id=chat_request.session_id,
            user_id=current_user.id
        )

        # Step 3: Search Qdrant for hospital documents relevant to the message
        context_str = "No relevant context found."
        try:
            results = await asyncio.to_thread(
                QdrantService.search,
                collection_name=settings.QDRANT_COLLECTION_NAME,
                query_text=chat_request.message,
                top_k=3,
                score_threshold=0.3
            )
            if results:
                context_parts = []
                for i, result in enumerate(results, 1):
                    payload = result.payload or {}
                    context_parts.append(
                        f"[Record {i}]\n"
                        f"Type: {payload.get('type', 'Unknown').title()}\n"
                        f"Content: {payload.get('content', 'No content available')}\n"
                    )
                context_str = "\n".join(context_parts)
        except Exception as e:
            # If Qdrant is not set up or search fails, fall back to default
            import logging
            logging.getLogger(__name__).error(f"QDRANT SEARCH ERROR: {str(e)}", exc_info=True)
            pass

        # Step 3.5: Live database context — run a real-time SQL SELECT query
        # grounded on the user's question to supplement semantic search results.
        # Fails silently so chat is never blocked by DB errors.
        from app.services.db_context_service import get_db_context
        live_db_context = ""
        try:
            live_db_context = await get_db_context(user_query=chat_request.message, db=db)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"LIVE DB CONTEXT ERROR: {str(e)}", exc_info=True)

        # Combine: Qdrant semantic results + live SQL query results
        combined_parts = []
        if context_str and context_str != "No relevant context found.":
            combined_parts.append("--- Semantic Search Results ---\n" + context_str)
        if live_db_context and not live_db_context.startswith("Database query context failed"):
            combined_parts.append("--- Live Database Query Results ---\n" + live_db_context)
        combined_context_str = "\n\n".join(combined_parts) if combined_parts else "No relevant context found."

        try:
            # Step 4: Invoke the LangChain chain with memory
            # The chain automatically:
            #   - Loads conversation history for this session_id
            #   - Builds the prompt with history + context + new message
            #   - Sends to Groq LLM
            #   - Saves the new message + AI reply to memory
            chain = AIService._get_chain()

            response = await chain.ainvoke(
                {"input": chat_request.message, "context": combined_context_str},
                config={"configurable": {"session_id": chat_request.session_id}}
            )

            # Extract the AI's text response
            ai_reply = response.content

        except Exception as e:
            # Handle Groq API errors gracefully
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI service error: {str(e)}. Please try again."
            )

        # Step 4: Update the ChatSession DB record
        db_session.message_count += 2  # +1 for user message, +1 for AI reply
        db_session.last_message = chat_request.message[:200]  # Store preview

        # Update title if it's still the default (use the first user message)
        if db_session.title == "New Conversation" or db_session.message_count == 2:
            # Use the first 50 characters of the message as the title
            db_session.title = chat_request.message[:50] + (
                "..." if len(chat_request.message) > 50 else ""
            )

        await db.flush()

        # Step 5: Return the response
        return ChatResponse(
            success=True,
            session_id=chat_request.session_id,
            user_message=chat_request.message,
            ai_response=ai_reply,
            message_count=db_session.message_count,
            timestamp=datetime.utcnow()
        )

    # --------------------------------------------------------------------------
    # GET OR CREATE DB SESSION
    # WHY: We track sessions in both the in-memory store (for LangChain)
    #      AND in PostgreSQL (for user history UI and analytics).
    # WHAT: Finds existing ChatSession or creates a new one.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - session_id: str → the session identifier
    #   - user_id: int → the user who owns this session
    # OUTPUT: ChatSession SQLAlchemy model object
    # --------------------------------------------------------------------------
    @staticmethod
    async def _get_or_create_db_session(
        db: AsyncSession,
        session_id: str,
        user_id: int
    ) -> ChatSession:
        """
        Retrieves an existing ChatSession from the database,
        or creates a new one if it doesn't exist.

        Args:
            db: Async database session.
            session_id: Unique session identifier.
            user_id: ID of the user who owns this session.

        Returns:
            The existing or newly created ChatSession object.
        """

        # Try to find existing session
        result = await db.execute(
            select(ChatSession).where(ChatSession.session_id == session_id)
        )
        db_session = result.scalar_one_or_none()

        if db_session is None:
            # Create a new session record in the database
            db_session = ChatSession(
                user_id=user_id,
                session_id=session_id,
                title="New Conversation",
                is_active=True,
                message_count=0
            )
            db.add(db_session)
            await db.flush()
            await db.refresh(db_session)

        return db_session

    # --------------------------------------------------------------------------
    # CREATE SESSION
    # WHY: Allows users to explicitly create a named session before chatting.
    # WHAT: Creates a new ChatSession record in PostgreSQL with a custom title.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - session_data: SessionCreateRequest → optional session_id and title
    #   - current_user: User → the logged-in user
    # OUTPUT: SessionResponse with the new session details
    # --------------------------------------------------------------------------
    @staticmethod
    async def create_session(
        db: AsyncSession,
        session_data: SessionCreateRequest,
        current_user: User
    ) -> SessionResponse:
        """
        Creates a new named chat session for the user.

        Args:
            db: Async database session.
            session_data: Optional custom session_id and title.
            current_user: The logged-in user creating the session.

        Returns:
            SessionResponse with the created session's details.

        Raises:
            HTTPException 409: If a session with that session_id already exists.
        """

        # Generate a UUID session_id if one wasn't provided
        session_id = session_data.session_id or str(uuid.uuid4())

        # Check if a session with this ID already exists
        existing = await db.execute(
            select(ChatSession).where(ChatSession.session_id == session_id)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A session with ID '{session_id}' already exists."
            )

        # Create the new session
        new_session = ChatSession(
            user_id=current_user.id,
            session_id=session_id,
            title=session_data.title or "New Conversation",
            is_active=True,
            message_count=0
        )

        db.add(new_session)
        await db.flush()
        await db.refresh(new_session)

        return SessionResponse.model_validate(new_session)

    # --------------------------------------------------------------------------
    # GET MY SESSIONS
    # WHY: Shows users their conversation history list in the sidebar.
    # WHAT: Returns all ChatSession records for the current user.
    # INPUT:
    #   - db: AsyncSession → database session
    #   - current_user: User → the logged-in user
    #   - skip, limit: pagination
    # OUTPUT: SessionListResponse with user's sessions
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_my_sessions(
        db: AsyncSession,
        current_user: User,
        skip: int = 0,
        limit: int = 20
    ) -> SessionListResponse:
        """
        Returns all chat sessions belonging to the current user.
        Ordered by most recently active.

        Args:
            db: Async database session.
            current_user: The logged-in user.
            skip: Pagination offset.
            limit: Max sessions to return.

        Returns:
            SessionListResponse with total count and list of sessions.
        """

        from sqlalchemy import func

        # Count total sessions for this user
        count_result = await db.execute(
            select(func.count(ChatSession.id))
            .where(ChatSession.user_id == current_user.id)
        )
        total = count_result.scalar_one()

        # Fetch sessions, most recently active first
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .order_by(ChatSession.updated_at.desc())
        )
        sessions = result.scalars().all()

        return SessionListResponse(
            total=total,
            sessions=[SessionResponse.model_validate(s) for s in sessions]
        )

    # --------------------------------------------------------------------------
    # GET CHAT HISTORY
    # WHY: Allows users to reload a previous conversation and see all messages.
    # WHAT: Returns the in-memory message history for a session_id.
    # INPUT:
    #   - session_id: str → the session to retrieve history for
    #   - db: AsyncSession → to verify the session belongs to this user
    #   - current_user: User → for access control
    # OUTPUT: ChatHistoryResponse with all messages in order
    # --------------------------------------------------------------------------
    @staticmethod
    async def get_chat_history(
        db: AsyncSession,
        session_id: str,
        current_user: User
    ) -> ChatHistoryResponse:
        """
        Returns the full conversation history for a session.
        Retrieves from the in-memory store (LangChain's memory).

        Args:
            db: Async database session.
            session_id: The session ID to retrieve history for.
            current_user: The user requesting the history (access control).

        Returns:
            ChatHistoryResponse with all messages in the session.

        Raises:
            HTTPException 404: If the session is not found or doesn't belong to user.
        """

        # Verify the session exists and belongs to this user
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.session_id == session_id,
                ChatSession.user_id == current_user.id
            )
        )
        db_session = result.scalar_one_or_none()

        if db_session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session '{session_id}' not found."
            )

        # Get the in-memory history for this session
        history = get_session_history(session_id)

        # Convert LangChain message objects to our ChatMessage schema
        messages = []
        for msg in history.messages:
            # LangChain messages have a 'type' attribute: 'human' or 'ai'
            role = "human" if msg.type == "human" else "ai"
            messages.append(ChatMessage(role=role, content=msg.content))

        return ChatHistoryResponse(
            session_id=session_id,
            title=db_session.title,
            messages=messages,
            total_messages=len(messages)
        )

    # --------------------------------------------------------------------------
    # CLEAR SESSION HISTORY
    # WHY: Allows users to reset a conversation without deleting the session.
    # WHAT: Clears the in-memory message history for a session.
    # INPUT:
    #   - session_id: str → the session to clear
    #   - db: AsyncSession → database session
    #   - current_user: User → access control
    # OUTPUT: Dict with success message
    # --------------------------------------------------------------------------
    @staticmethod
    async def clear_session_history(
        db: AsyncSession,
        session_id: str,
        current_user: User
    ) -> dict:
        """
        Clears the conversation history for a session.
        The session DB record remains — only the message history is cleared.

        Args:
            db: Async database session.
            session_id: The session to clear.
            current_user: The user requesting the clear.

        Returns:
            A dict with a success message.

        Raises:
            HTTPException 404: If the session is not found.
        """

        # Verify session ownership
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.session_id == session_id,
                ChatSession.user_id == current_user.id
            )
        )
        db_session = result.scalar_one_or_none()

        if db_session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session '{session_id}' not found."
            )

        # Clear in-memory history
        if session_id in _session_store:
            _session_store[session_id].clear()

        # Reset the DB session stats
        db_session.message_count = 0
        db_session.last_message = None
        db_session.title = "New Conversation"
        await db.flush()

        return {"message": f"Conversation history for session '{session_id}' has been cleared."}
