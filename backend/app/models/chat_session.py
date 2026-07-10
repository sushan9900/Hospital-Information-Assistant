# ==============================================================================
# Hospital Information Assistance — Chat Session Model
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file defines the "chat_sessions" table in our PostgreSQL database.
#   When a user starts a conversation with the AI chatbot, a session is created.
#   The session_id is used by LangChain's RunnableWithMessageHistory to keep
#   track of conversation history — so the AI remembers previous messages.
#
# HOW SESSION-BASED MEMORY WORKS:
#   1. User sends a message with a session_id
#   2. LangChain loads the conversation history for that session_id
#   3. The AI replies using the full conversation context
#   4. The new message + reply are added to the history
#   5. Next time the user sends a message, the history is loaded again
#
# RELATIONSHIPS:
#   ChatSession belongs to → User (each session is owned by one user)
# ==============================================================================

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# ------------------------------------------------------------------------------
# CHAT SESSION MODEL (DATABASE TABLE)
# WHY: Represents the "chat_sessions" table — tracks AI chatbot conversations.
# WHAT: Each row is one chat session between a user and the AI assistant.
# ------------------------------------------------------------------------------
class ChatSession(Base):
    """
    SQLAlchemy model for the 'chat_sessions' database table.

    Columns:
        id           - Primary key, auto-incremented integer
        user_id      - Foreign key → users.id (the user who owns this session)
        session_id   - Unique string ID used by LangChain for memory lookup
        title        - Optional title for the session (e.g., first message preview)
        is_active    - Whether this session is still active or archived
        created_at   - Timestamp when the session was created (auto-set)
        updated_at   - Timestamp when the session was last updated (auto-set)

    Relationships:
        user         - The User who owns this chat session
    """

    # The name of the database table this model maps to
    __tablename__ = "chat_sessions"

    # --------------------------------------------------------------------------
    # PRIMARY KEY
    # WHY: Unique database identifier for each chat session record.
    # WHAT: Auto-incrementing integer primary key.
    # --------------------------------------------------------------------------
    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True
    )

    # --------------------------------------------------------------------------
    # USER FOREIGN KEY
    # WHY: Links the chat session to the user who created it.
    #      This allows us to show a user their own chat history.
    # WHAT: References the "users" table's "id" column.
    #       If the user is deleted, their sessions are also deleted (CASCADE).
    # --------------------------------------------------------------------------
    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",        # References the id column in the users table
            ondelete="CASCADE" # If user deleted, delete their sessions too
        ),
        nullable=False,        # Every session must belong to a user
        index=True             # Indexed for fast "my sessions" queries
    )

    # --------------------------------------------------------------------------
    # SESSION ID
    # WHY: This is the key used by LangChain's RunnableWithMessageHistory
    #      to store and retrieve conversation history in memory.
    #      It must be unique so different users don't share history.
    # WHAT: A unique string (UUID recommended) generated when creating a session.
    #       Example: "550e8400-e29b-41d4-a716-446655440000"
    # --------------------------------------------------------------------------
    session_id = Column(
        String(100),
        nullable=False,  # Required — LangChain needs this to find the history
        unique=True,     # Each session has a globally unique ID
        index=True       # Indexed for fast lookups by session_id
    )

    # --------------------------------------------------------------------------
    # TITLE
    # WHY: A short label shown in the chat history sidebar so users can
    #      identify their previous conversations easily.
    # WHAT: Optional string, typically the first few words of the first message.
    #       Example: "What are the cardiology department hours?"
    # --------------------------------------------------------------------------
    title = Column(
        String(255),
        nullable=True,                           # Optional
        default="New Conversation",              # Default title if none provided
        server_default="New Conversation"
    )

    # --------------------------------------------------------------------------
    # IS ACTIVE
    # WHY: Allows users to archive old sessions without deleting them.
    #      Inactive sessions are hidden from the UI but preserved in the DB.
    # WHAT: Boolean flag — True means the session is active and visible.
    # --------------------------------------------------------------------------
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,          # New sessions are active by default
        server_default="true"
    )

    # --------------------------------------------------------------------------
    # MESSAGE COUNT
    # WHY: Tracks how many messages have been exchanged in this session.
    #      Useful for analytics and for showing session stats in the UI.
    # WHAT: Integer that increments with each message. Starts at 0.
    # --------------------------------------------------------------------------
    message_count = Column(
        Integer,
        nullable=False,
        default=0,       # Starts at zero when session is created
        server_default="0"
    )

    # --------------------------------------------------------------------------
    # LAST MESSAGE PREVIEW
    # WHY: Shows a preview of the last message in the chat history list,
    #      so users can quickly identify which conversation they want.
    # WHAT: Optional short text (truncated version of the last message).
    # --------------------------------------------------------------------------
    last_message = Column(
        Text,
        nullable=True  # Optional — updated after each message exchange
    )

    # --------------------------------------------------------------------------
    # TIMESTAMPS
    # WHY: Tracks when sessions were started and last used.
    #      Also used to sort sessions by most recent activity.
    # --------------------------------------------------------------------------
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()  # Set by DB on INSERT
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),  # Set on INSERT
        onupdate=func.now()         # Auto-updated whenever a message is added
    )

    # --------------------------------------------------------------------------
    # RELATIONSHIPS
    # WHY: Links ChatSession back to User for easy access.
    #      Allows: session.user → User object
    # --------------------------------------------------------------------------

    # Many chat sessions belong to one user
    # Access like: session.user → User object
    user = relationship(
        "User",
        back_populates="chat_sessions",
        lazy="select"
    )

    # --------------------------------------------------------------------------
    # STRING REPRESENTATION
    # WHY: Useful for debugging — shows meaningful info when printing.
    # --------------------------------------------------------------------------
    def __repr__(self) -> str:
        return (
            f"<ChatSession id={self.id} "
            f"user_id={self.user_id} "
            f"session_id='{self.session_id}' "
            f"messages={self.message_count}>"
        )
