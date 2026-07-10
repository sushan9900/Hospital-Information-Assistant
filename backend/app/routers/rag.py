# ==============================================================================
# Hospital Information Assistance — RAG Router
# ==============================================================================
# WHY THIS FILE EXISTS:
#   Defines all HTTP endpoints for the Retrieval Augmented Generation (RAG) system.
#   It handles vector search queries, document embedding, and Q&A grounding
#   using our Qdrant vector database and Groq LLM.
#
# ENDPOINTS:
#   POST   /rag/embed      → Seed/update Qdrant vector database (admin only)
#   POST   /rag/search     → Perform semantic vector search (public)
#   POST   /rag/ask        → Ask a question using the RAG pipeline (public)
#   DELETE /rag/delete     → Delete a specific embedding point (admin only)
#   DELETE /rag/delete-all → Clear all points from the collection (admin only)
#   POST   /rag/rebuild    → Rebuild all database embeddings from scratch (admin only)
# ==============================================================================

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.rag import (
    RAGEmbedRequest,
    RAGEmbedResponse,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGAskRequest,
    RAGAskResponse,
    RAGDeleteRequest,
    RAGOperationResponse
)
from app.services.rag_service import RAGService

# Create the router — all routes here will be prefixed with /rag (registered in main.py)
router = APIRouter()


# ==============================================================================
# EMBED ALL DATA (ADMIN ONLY)
# Method: POST
# Path:   /rag/embed
# Access: Admin only
# ==============================================================================
@router.post(
    "/embed",
    response_model=RAGEmbedResponse,
    status_code=status.HTTP_200_OK,
    summary="Seed or update the Qdrant vector database",
    description="""
    Reads doctors and departments from PostgreSQL, generates embeddings,
    and updates Qdrant.
    
    If `force_rebuild` is true, the collection is reset before embedding.
    Admin access required.
    """
)
async def embed_all_data(
    embed_request: RAGEmbedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> RAGEmbedResponse:
    """
    Generate vector embeddings for all database doctors and departments.

    Authentication Required: Yes (Admin only)

    Request Body:
    - force_rebuild: If True, resets the Qdrant collection first
    - data_type: What to embed ('all', 'doctors', or 'departments')

    Returns:
    - counts and time taken statistics
    """
    return await RAGService.embed_all(db=db, embed_request=embed_request)


# ==============================================================================
# SEMANTIC SEARCH
# Method: POST
# Path:   /rag/search
# Access: Public
# ==============================================================================
@router.post(
    "/search",
    response_model=RAGSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Perform semantic vector search",
    description="""
    Finds matching hospital records using cosine vector similarity.
    Does NOT invoke the LLM to generate an answer — just returns matching documents.
    """
)
async def semantic_search(
    search_request: RAGSearchRequest
) -> RAGSearchResponse:
    """
    Search for semantically similar items in Qdrant.

    Request Body:
    - query: User query text string
    - top_k: Maximum results to return (default: 5)
    - filter_type: Optional type filter ('doctor' or 'department')
    - score_threshold: Minimum cosine similarity score (default: 0.3)

    Returns:
    - List of matching records ordered by similarity score
    """
    return await RAGService.semantic_search(search_request=search_request)


# ==============================================================================
# RAG ASK (Q&A PIPELINE)
# Method: POST
# Path:   /rag/ask
# Access: Public
# ==============================================================================
@router.post(
    "/ask",
    response_model=RAGAskResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask a question grounded in hospital records",
    description="""
    Full RAG pipeline:
    1. Search Qdrant for hospital documents relevant to the question.
    2. Build context and feed it along with the question to Groq LLM.
    3. Generate and return the answer along with search sources used.
    """
)
async def rag_ask(
    ask_request: RAGAskRequest
) -> RAGAskResponse:
    """
    Perform complete RAG QA cycle: search -> context injection -> LLM answer.

    Request Body:
    - question: The search/QA question
    - top_k: How many search results to retrieve as context (default: 3)

    Returns:
    - answer: AI-generated response text
    - sources: Match details used in generating the answer
    - has_relevant_context: True if matching documents were found
    """
    return await RAGService.rag_ask(ask_request=ask_request)


# ==============================================================================
# DELETE SINGLE EMBEDDING (ADMIN ONLY)
# Method: DELETE
# Path:   /rag/delete
# Access: Admin only
# ==============================================================================
@router.delete(
    "/delete",
    response_model=RAGOperationResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a specific embedding point from Qdrant",
    description="Deletes a single vector from Qdrant by its point ID. Admin access required."
)
async def delete_embedding(
    delete_request: RAGDeleteRequest,
    current_user: User = Depends(get_current_admin)
) -> RAGOperationResponse:
    """
    Delete a single embedding from the collection.

    Authentication Required: Yes (Admin only)

    Request Body:
    - point_id: Point ID format 'doctor_X' or 'department_Y'
    """
    return await RAGService.delete_embedding(delete_request=delete_request)


# ==============================================================================
# DELETE ALL EMBEDDINGS (ADMIN ONLY)
# Method: DELETE
# Path:   /rag/delete-all
# Access: Admin only
# ==============================================================================
@router.delete(
    "/delete-all",
    response_model=RAGOperationResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete all embeddings from the collection",
    description="Resets the Qdrant collection by deleting and recreating it empty. Admin access required."
)
async def delete_all_embeddings(
    current_user: User = Depends(get_current_admin)
) -> RAGOperationResponse:
    """
    Reset and empty the vector collection.

    Authentication Required: Yes (Admin only)
    """
    return await RAGService.delete_all_embeddings()


# ==============================================================================
# REBUILD ALL EMBEDDINGS (ADMIN ONLY)
# Method: POST
# Path:   /rag/rebuild
# Access: Admin only
# ==============================================================================
@router.post(
    "/rebuild",
    response_model=RAGEmbedResponse,
    status_code=status.HTTP_200_OK,
    summary="Rebuild all database embeddings from scratch",
    description="Clears the vector database and rebuilds all embeddings using PostgreSQL data. Admin access required."
)
async def rebuild_all_embeddings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> RAGEmbedResponse:
    """
    Perform a complete reset and re-embedding of hospital data.

    Authentication Required: Yes (Admin only)
    """
    return await RAGService.rebuild_all(db=db)
