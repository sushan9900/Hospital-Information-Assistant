# ==============================================================================
# Hospital Information Assistance — RAG Pydantic Schemas
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Defines request and response shapes for all RAG (Retrieval Augmented
#   Generation) API endpoints.
#
# WHAT IS RAG:
#   RAG is a technique where:
#   1. A user asks a question
#   2. The question is converted into a vector embedding
#   3. Similar embeddings are searched in Qdrant vector database
#   4. The most relevant hospital data is retrieved as "context"
#   5. The context + question are sent to Groq LLM
#   6. The LLM generates an answer grounded in real hospital data
#
# RAG ENDPOINTS:
#   POST /rag/embed   — Embed all hospital data (doctors, depts) into Qdrant
#   POST /rag/search  — Semantic vector search (returns matching records)
#   POST /rag/ask     — Full RAG pipeline (search + LLM answer)
#   DELETE /rag/delete      — Delete a specific record from Qdrant
#   DELETE /rag/delete-all  — Delete all embeddings from the collection
#   POST /rag/rebuild — Re-embed all data from scratch
# ==============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ------------------------------------------------------------------------------
# RAG EMBED REQUEST SCHEMA (REQUEST)
# WHY: The embed endpoint reads all hospital data from PostgreSQL and
#      converts it into vector embeddings stored in Qdrant.
#      The client can optionally force a rebuild (delete old + re-embed).
# INPUT: Sent in the request body of POST /rag/embed (admin only)
# ------------------------------------------------------------------------------
class RAGEmbedRequest(BaseModel):
    """
    Schema for triggering the embedding process.
    Reads hospital data from PostgreSQL and stores embeddings in Qdrant.
    Used in: POST /rag/embed (admin only)
    """

    # If True, delete existing embeddings first before re-embedding
    # Useful when data has changed and needs a fresh rebuild
    force_rebuild: bool = Field(
        default=False,
        description="If True, delete existing embeddings and rebuild from scratch",
        examples=[False]
    )

    # Optional: embed only a specific data type
    # "doctors" → embed only doctor profiles
    # "departments" → embed only department info
    # "all" → embed everything (default)
    data_type: str = Field(
        default="all",
        description="What data to embed: 'doctors', 'departments', or 'all'",
        examples=["all"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "force_rebuild": False,
                    "data_type": "all"
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# RAG EMBED RESPONSE SCHEMA (RESPONSE)
# WHY: Returns a summary of the embedding operation — how many records
#      were processed and how long it took.
# OUTPUT: Returned from POST /rag/embed
# ------------------------------------------------------------------------------
class RAGEmbedResponse(BaseModel):
    """
    Schema for the response after the embedding process completes.
    Used in: POST /rag/embed response
    """

    success: bool = Field(description="Whether embedding completed successfully")
    message: str = Field(description="Human-readable status message")

    # Total number of records embedded into Qdrant
    total_embedded: int = Field(
        description="Total number of records embedded",
        examples=[25]
    )

    # Breakdown of how many of each type were embedded
    doctors_embedded: int = Field(
        default=0,
        description="Number of doctor records embedded"
    )

    departments_embedded: int = Field(
        default=0,
        description="Number of department records embedded"
    )

    # How long the embedding took (in seconds)
    time_taken_seconds: Optional[float] = Field(
        default=None,
        description="Time taken to complete the embedding process"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True,
                    "message": "Successfully embedded 25 records into Qdrant.",
                    "total_embedded": 25,
                    "doctors_embedded": 20,
                    "departments_embedded": 5,
                    "time_taken_seconds": 12.4
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# RAG SEARCH REQUEST SCHEMA (REQUEST)
# WHY: Allows semantic vector search without generating an AI response.
#      Useful for debugging — see what records Qdrant finds for a query.
# INPUT: Sent in the request body of POST /rag/search
# ------------------------------------------------------------------------------
class RAGSearchRequest(BaseModel):
    """
    Schema for performing a semantic vector search in Qdrant.
    Returns the most relevant hospital records for the given query.
    Used in: POST /rag/search
    """

    # The search query (converted to a vector embedding for comparison)
    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="The search query to find relevant hospital information",
        examples=["cardiologist with experience in heart surgery"]
    )

    # How many top results to return
    top_k: int = Field(
        default=5,
        ge=1,      # At least 1 result
        le=20,     # Maximum 20 results to avoid overwhelming responses
        description="Number of top results to return (1-20)",
        examples=[5]
    )

    # Optional: filter results by data type
    # "doctor" → search only doctor embeddings
    # "department" → search only department embeddings
    # None → search all embeddings
    filter_type: Optional[str] = Field(
        default=None,
        description="Filter results by type: 'doctor', 'department', or None for all",
        examples=["doctor"]
    )

    # Minimum similarity score threshold (0.0 to 1.0)
    # Results below this score are excluded
    score_threshold: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score (0.0 to 1.0). Results below this are excluded.",
        examples=[0.3]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "query": "experienced cardiologist available on weekdays",
                    "top_k": 5,
                    "filter_type": "doctor",
                    "score_threshold": 0.3
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# SEARCH RESULT ITEM SCHEMA
# WHY: Represents a single result returned from Qdrant semantic search.
#      Each result has an id, score, and the original data payload.
# OUTPUT: Nested inside RAGSearchResponse
# ------------------------------------------------------------------------------
class SearchResultItem(BaseModel):
    """
    A single result from a Qdrant semantic search.
    Includes the similarity score and the original data payload.
    """

    # The Qdrant point ID (matches the record ID from PostgreSQL)
    point_id: str = Field(description="Qdrant point ID of this result")

    # Similarity score (0.0 = no match, 1.0 = perfect match)
    score: float = Field(description="Cosine similarity score (0.0 to 1.0)")

    # The type of record: "doctor" or "department"
    record_type: str = Field(description="Type of record: 'doctor' or 'department'")

    # The original record ID from PostgreSQL
    record_id: int = Field(description="Original database record ID")

    # The content that was embedded (e.g., doctor's bio + name)
    content: str = Field(description="The text content that was embedded")

    # Additional metadata stored alongside the embedding
    metadata: dict = Field(
        default={},
        description="Additional metadata (e.g., name, specialization, department)"
    )


# ------------------------------------------------------------------------------
# RAG SEARCH RESPONSE SCHEMA (RESPONSE)
# WHY: Returns the list of semantically similar records found in Qdrant.
# OUTPUT: Returned from POST /rag/search
# ------------------------------------------------------------------------------
class RAGSearchResponse(BaseModel):
    """
    Schema for the semantic search results from Qdrant.
    Used in: POST /rag/search response
    """

    success: bool = Field(description="Whether the search was successful")
    query: str = Field(description="The original search query")
    total_results: int = Field(description="Number of results returned")
    results: List[SearchResultItem] = Field(
        description="List of search results ordered by similarity score"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True,
                    "query": "experienced cardiologist",
                    "total_results": 2,
                    "results": [
                        {
                            "point_id": "doctor_1",
                            "score": 0.92,
                            "record_type": "doctor",
                            "record_id": 1,
                            "content": "Dr. Sarah Johnson - Cardiologist with 10 years experience...",
                            "metadata": {
                                "name": "Dr. Sarah Johnson",
                                "specialization": "Cardiologist",
                                "department": "Cardiology"
                            }
                        }
                    ]
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# RAG ASK REQUEST SCHEMA (REQUEST)
# WHY: The main RAG endpoint — user asks a question and gets an AI answer
#      grounded in real hospital data retrieved from Qdrant.
# INPUT: Sent in the request body of POST /rag/ask
# ------------------------------------------------------------------------------
class RAGAskRequest(BaseModel):
    """
    Schema for the full RAG pipeline — semantic search + AI answer.
    Used in: POST /rag/ask

    Flow:
    1. question → embed → Qdrant search → retrieve context
    2. context + question → Groq LLM → AI answer
    """

    # The user's question
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="The question to answer using hospital data",
        examples=["Which cardiologist has the most experience?"]
    )

    # How many Qdrant results to use as context for the LLM
    top_k: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of Qdrant results to use as context (1-10)",
        examples=[3]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "question": "Which cardiologist has the most experience and what days are they available?",
                    "top_k": 3
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# RAG ASK RESPONSE SCHEMA (RESPONSE)
# WHY: Returns the AI-generated answer along with the source context
#      that was used — so users can verify the answer's source.
# OUTPUT: Returned from POST /rag/ask
# ------------------------------------------------------------------------------
class RAGAskResponse(BaseModel):
    """
    Schema for the full RAG pipeline response.
    Includes the AI answer and the source context used to generate it.
    Used in: POST /rag/ask response
    """

    success: bool = Field(description="Whether the RAG pipeline completed successfully")
    question: str = Field(description="The original question asked")

    # The AI-generated answer
    answer: str = Field(description="AI-generated answer based on hospital data")

    # The context retrieved from Qdrant used to generate the answer
    # Showing sources builds user trust in the AI response
    sources: List[SearchResultItem] = Field(
        default=[],
        description="Source records from Qdrant used to generate the answer"
    )

    # Whether the AI found relevant information or had to say "I don't know"
    has_relevant_context: bool = Field(
        description="Whether relevant hospital data was found for this question"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True,
                    "question": "Which cardiologist has the most experience?",
                    "answer": "Based on our hospital records, Dr. Sarah Johnson in the Cardiology department has the most experience with 10 years of practice. She is available on Monday, Wednesday, and Friday.",
                    "sources": [
                        {
                            "point_id": "doctor_1",
                            "score": 0.94,
                            "record_type": "doctor",
                            "record_id": 1,
                            "content": "Dr. Sarah Johnson - Cardiologist - 10 years experience",
                            "metadata": {"name": "Dr. Sarah Johnson"}
                        }
                    ],
                    "has_relevant_context": True
                }
            ]
        }
    }


# ------------------------------------------------------------------------------
# RAG DELETE REQUEST SCHEMA (REQUEST)
# WHY: Allows admin to delete a specific embedding from Qdrant
#      (e.g., when a doctor is removed from the system).
# INPUT: Sent in the request body of DELETE /rag/delete
# ------------------------------------------------------------------------------
class RAGDeleteRequest(BaseModel):
    """
    Schema for deleting a specific record's embedding from Qdrant.
    Used in: DELETE /rag/delete (admin only)
    """

    # The Qdrant point ID to delete (format: "doctor_1" or "department_2")
    point_id: str = Field(
        ...,
        description="The Qdrant point ID to delete (e.g., 'doctor_1')",
        examples=["doctor_1"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [{"point_id": "doctor_1"}]
        }
    }


# ------------------------------------------------------------------------------
# RAG GENERAL RESPONSE SCHEMA (RESPONSE)
# WHY: A simple reusable response for admin operations (delete, rebuild).
# OUTPUT: Returned from DELETE /rag/delete, DELETE /rag/delete-all, POST /rag/rebuild
# ------------------------------------------------------------------------------
class RAGOperationResponse(BaseModel):
    """
    General purpose response for RAG admin operations.
    Used in: DELETE /rag/delete, DELETE /rag/delete-all, POST /rag/rebuild
    """

    success: bool = Field(description="Whether the operation was successful")
    message: str = Field(description="Human-readable result message")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True,
                    "message": "Successfully deleted embedding for point 'doctor_1'."
                }
            ]
        }
    }
