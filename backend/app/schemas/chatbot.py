# ==============================================================================
# Hospital Information Assistance — Chatbot Pydantic Schemas
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Defines request and response shapes for the AI Chatbot API endpoints.
#   The chatbot uses LangChain with session-based memory — each conversation
#   has a unique session_id so the AI remembers previous messages.
#
# HOW THE CHATBOT WORKS:
#   1. Client creates or reuses a session_id
#   2. Client sends POST /chat with { session_id, message }
#   3. Server loads conversation history for that session_id
#   4. Groq LLM generates a response using the history + new message
#   5. Server returns the AI reply and updates the session
#
# SCHEMAS:
#   - ChatRequest         : What the client sends for each message
#   - ChatResponse        : What the server returns (AI reply)
#   - SessionCreateRequest: To create a new named session
#   - SessionResponse     : Session details returned from the API
#   - ChatHistoryResponse : Previous messages in a session
# ==============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ------------------------------------------------------------------------------
# CHAT REQUEST SCHEMA (REQUEST)
# WHY: Defines what the client must send with every chat message.
#      The session_id is critical — it tells LangChain which conversation
#      history to load so the AI can remember previous messages.
# INPUT: Sent in the request body of POST /chat
# ------------------------------------------------------------------------------
class ChatRequest(BaseModel):
    """
    Schema for sending a message to the AI chatbot.
    Used in: POST /chat

    session_id: Unique identifier for the conversation session.
                The same session_id must be reused across messages
                to maintain conversation history (memory).

    message: The user's message to the AI assistant.
    """

    # Unique session identifier — used by LangChain to load conversation history
    # Generate a UUID on the frontend when starting a new conversation
    # Example: "550e8400-e29b-41d4-a716-446655440000"
    session_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique session ID for conversation memory. Use a UUID.",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )

    # The user's message text
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,       # Limit to prevent abuse
        description="The user's message to the AI assistant",
        examples=["What are the working hours of the Cardiology department?"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "session_id": "550e8400-e29b-41d4-a716-446655440000",
                    "message": "What are the working hours of the Cardiology department?"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# CHAT RESPONSE SCHEMA (RESPONSE)
# WHY: Defines what the server returns after processing a chat message.
#      Returns the AI's reply along with session metadata.
# OUTPUT: Returned from POST /chat
# ------------------------------------------------------------------------------
class ChatResponse(BaseModel):
    """
    Schema for the AI chatbot's response to a message.
    Used in: POST /chat response

    Contains the AI-generated reply and session information.
    """

    # Whether the request was successful
    success: bool = Field(
        description="Whether the AI response was generated successfully"
    )

    # The session ID this response belongs to
    session_id: str = Field(
        description="The session ID this response belongs to"
    )

    # The user's original message (echoed back for confirmation)
    user_message: str = Field(
        description="The user's original message"
    )

    # The AI assistant's reply
    ai_response: str = Field(
        description="The AI assistant's generated response"
    )

    # Total number of messages in this session after this exchange
    message_count: Optional[int] = Field(
        default=None,
        description="Total messages in this session including this exchange"
    )

    # Timestamp of when the response was generated
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp of the AI response"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True,
                    "session_id": "550e8400-e29b-41d4-a716-446655440000",
                    "user_message": "What are the working hours of the Cardiology department?",
                    "ai_response": "The Cardiology department is open Monday through Friday from 8:00 AM to 6:00 PM. For emergencies, please call our 24/7 helpline.",
                    "message_count": 2,
                    "timestamp": "2024-12-25T10:30:00Z"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# SESSION CREATE REQUEST SCHEMA (REQUEST)
# WHY: Allows the client to create a named chat session in the database.
#      The title helps users identify their conversations later.
# INPUT: Sent in the request body of POST /chat/sessions
# ------------------------------------------------------------------------------
class SessionCreateRequest(BaseModel):
    """
    Schema for creating a new named chat session.
    Used in: POST /chat/sessions

    The session_id is optionally provided by the client (UUID recommended).
    If not provided, the server generates one automatically.
    """

    # Optional custom session ID — server generates one if not provided
    session_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional custom session ID. If not provided, server generates a UUID.",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )

    # Optional title for the session shown in the chat history list
    title: Optional[str] = Field(
        default="New Conversation",
        max_length=255,
        description="Optional title for this conversation session",
        examples=["Questions about Cardiology"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Questions about Cardiology"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# SESSION RESPONSE SCHEMA (RESPONSE)
# WHY: Returns the full details of a chat session.
# OUTPUT: Returned from POST /chat/sessions, GET /chat/sessions
# ------------------------------------------------------------------------------
class SessionResponse(BaseModel):
    """
    Schema for returning chat session details.
    Used in: POST /chat/sessions, GET /chat/sessions, GET /chat/sessions/{id}
    """

    id: int = Field(description="Database ID of the session")
    user_id: int = Field(description="ID of the user who owns this session")
    session_id: str = Field(description="Unique session identifier for LangChain")
    title: Optional[str] = Field(description="Session title / label")
    is_active: bool = Field(description="Whether the session is active")
    message_count: int = Field(description="Total messages in this session")
    last_message: Optional[str] = Field(description="Preview of the last message")
    created_at: datetime = Field(description="When the session was created")
    updated_at: datetime = Field(description="When the session was last active")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "user_id": 2,
                    "session_id": "550e8400-e29b-41d4-a716-446655440000",
                    "title": "Questions about Cardiology",
                    "is_active": True,
                    "message_count": 6,
                    "last_message": "Thank you for the information!",
                    "created_at": "2024-12-25T10:00:00Z",
                    "updated_at": "2024-12-25T10:30:00Z"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# SESSION LIST RESPONSE SCHEMA (RESPONSE)
# WHY: Returns all chat sessions for a user (their chat history list).
# OUTPUT: Returned from GET /chat/sessions
# ------------------------------------------------------------------------------
class SessionListResponse(BaseModel):
    """
    Schema for returning a list of the user's chat sessions.
    Used in: GET /chat/sessions
    """

    total: int = Field(description="Total number of sessions for this user")
    sessions: List[SessionResponse] = Field(description="List of chat sessions")

    model_config = {"from_attributes": True}


# ------------------------------------------------------------------------------
# CHAT MESSAGE SCHEMA
# WHY: Represents a single message in a conversation history.
#      Used when retrieving the full message history of a session.
# ------------------------------------------------------------------------------
class ChatMessage(BaseModel):
    """
    Represents a single message in a chat conversation.
    Used inside ChatHistoryResponse.
    """

    # Who sent this message: "human" (user) or "ai" (assistant)
    role: str = Field(
        description="Message sender: 'human' or 'ai'",
        examples=["human"]
    )

    # The content of the message
    content: str = Field(
        description="The message text",
        examples=["What doctors are available in Cardiology?"]
    )


# ------------------------------------------------------------------------------
# CHAT HISTORY RESPONSE SCHEMA (RESPONSE)
# WHY: Returns the full conversation history of a session.
#      Used to display previous messages when a user reopens a session.
# OUTPUT: Returned from GET /chat/sessions/{session_id}/history
# ------------------------------------------------------------------------------
class ChatHistoryResponse(BaseModel):
    """
    Schema for returning the full message history of a chat session.
    Used in: GET /chat/sessions/{session_id}/history
    """

    session_id: str = Field(description="The session ID")
    title: Optional[str] = Field(description="Session title")
    messages: List[ChatMessage] = Field(
        default=[],
        description="List of all messages in the session (in order)"
    )
    total_messages: int = Field(description="Total number of messages")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "session_id": "550e8400-e29b-41d4-a716-446655440000",
                    "title": "Questions about Cardiology",
                    "messages": [
                        {"role": "human", "content": "What doctors are in Cardiology?"},
                        {"role": "ai", "content": "The Cardiology department has Dr. Sarah Johnson..."}
                    ],
                    "total_messages": 2
                }
            ]
        }
    }
