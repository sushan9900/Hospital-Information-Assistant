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
from datetime import datetime
from typing import Optional
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
_session_store: dict[str, ChatMessageHistory] = {}


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
HOSPITAL_SYSTEM_PROMPT = """You are a helpful and professional AI assistant for the Hospital Information Assistance system.

Your role is to:
- Answer questions about the hospital, its departments, doctors, and services
- Help patients understand appointment procedures and hospital policies
- Provide general health information and guidance (not medical diagnoses)
- Assist with navigating hospital services and finding the right department

Guidelines:
- Always be polite, empathetic, and professional in your responses
- If you don't have specific information, politely say so and suggest contacting the hospital directly
- Do NOT provide specific medical diagnoses or prescribe medications
- Do NOT share any private patient information
- Keep responses clear, concise, and easy to understand
- Use the conversation history to maintain context and avoid repeating yourself

If asked about something outside your scope (like personal advice, non-medical topics), 
politely redirect the conversation back to hospital-related topics.
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
                temperature=0.7,        # 0=deterministic, 1=creative. 0.7 is balanced
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
            # The prompt has two parts:
            #   a) System message: tells the AI its role and rules
            #   b) MessagesPlaceholder: inserts the conversation history here
            #      so the AI can see all previous messages
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
        3. Invoke the LangChain chain (loads history → sends to Groq → saves reply)
        4. Update the ChatSession DB record with message count and preview
        5. Return the AI response

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

        try:
            # Step 3: Invoke the LangChain chain with memory
            # The chain automatically:
            #   - Loads conversation history for this session_id
            #   - Builds the prompt with history + new message
            #   - Sends to Groq LLM
            #   - Saves the new message + AI reply to memory
            chain = AIService._get_chain()

            response = await chain.ainvoke(
                {"input": chat_request.message},
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
