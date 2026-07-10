# ==============================================================================
# Hospital Information Assistance — Qdrant Vector Database Service
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file handles ALL operations with Qdrant Cloud vector database.
#   Qdrant is used by the RAG (Retrieval Augmented Generation) system to:
#   - Store vector embeddings of hospital data (doctors, departments)
#   - Search for semantically similar records given a user query
#
# HOW VECTOR SEARCH WORKS:
#   1. Doctor/department text is converted into a 384-dimensional vector
#      (a list of 384 numbers that capture the semantic meaning of the text)
#   2. Vectors are stored in Qdrant with metadata (name, specialization, etc.)
#   3. When a user asks a question, it's also converted to a vector
#   4. Qdrant finds the stored vectors most similar to the query vector
#      (using cosine similarity — measures the "angle" between vectors)
#   5. The matching records are returned as context for the LLM
#
# EMBEDDING MODEL:
#   - Model: BAAI/bge-small-en-v1.5
#   - Dimensions: 384
#   - Similarity: Cosine
#   - Library: FastEmbed (runs locally — no OpenAI key needed)
#
# TERMINOLOGY:
#   - Collection: Like a table in SQL — stores all vectors for a topic
#   - Point: Like a row — one vector + its ID + metadata (payload)
#   - Payload: Metadata attached to a point (name, type, etc.)
#   - Vector: The 384-dimensional number array representing text meaning
# ==============================================================================

from typing import Optional
from fastembed import TextEmbedding
from qdrant_client import QdrantClient, AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    ScoredPoint
)
import uuid
from fastapi import HTTPException, status

from app.config import settings

def generate_point_id(raw_id: str) -> str:
    """
    Ensures the point ID is a valid UUID string.
    If raw_id is already a valid UUID, returns it.
    Otherwise, generates a deterministic UUID based on raw_id.
    """
    try:
        uuid.UUID(raw_id)
        return raw_id
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, raw_id))


# ==============================================================================
# EMBEDDING MODEL (FastEmbed)
# WHY: We initialize the embedding model once at module level so it's
#      loaded into memory once and reused for all requests.
#      Loading the model takes ~2-3 seconds — doing it per request would be slow.
#
# WHAT: TextEmbedding loads the BAAI/bge-small-en-v1.5 model locally.
#       The model converts text strings into 384-dimensional vectors.
# ==============================================================================
_embedding_model: Optional[TextEmbedding] = None


def get_embedding_model() -> TextEmbedding:
    """
    Returns the FastEmbed TextEmbedding model, loading it on first call.
    Uses lazy initialization — loaded once, reused for all requests.

    Returns:
        TextEmbedding model ready to generate embeddings.
    """
    global _embedding_model
    if _embedding_model is None:
        # Load the model — this downloads the model file on first run
        _embedding_model = TextEmbedding(
            model_name=settings.EMBEDDING_MODEL  # "BAAI/bge-small-en-v1.5"
        )
    return _embedding_model


def embed_text(text: str) -> list[float]:
    """
    Converts a text string into a 384-dimensional vector embedding.
    Uses FastEmbed with the BAAI/bge-small-en-v1.5 model.

    Args:
        text: The text string to embed (e.g., doctor bio, department description).

    Returns:
        A list of 384 floats representing the semantic meaning of the text.

    Example:
        embed_text("Cardiologist with 10 years experience") 
        → [0.023, -0.154, 0.891, ...]  (384 numbers)
    """
    model = get_embedding_model()
    # embed() returns a generator — we get the first (and only) result
    embeddings = list(model.embed([text]))
    return embeddings[0].tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Converts multiple text strings into vectors in one batch call.
    More efficient than calling embed_text() in a loop.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors, one per input text.
    """
    model = get_embedding_model()
    embeddings = list(model.embed(texts))
    return [e.tolist() for e in embeddings]


# ==============================================================================
# QDRANT CLIENT
# WHY: The QdrantClient is the connection to Qdrant Cloud.
#      We create it once and reuse across all service methods.
# ==============================================================================
_qdrant_client: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    """
    Returns the Qdrant client, creating it on first call.
    Connects to Qdrant Cloud using URL and API key from settings.

    Returns:
        QdrantClient connected to the Qdrant Cloud instance.
    """
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
        )
    return _qdrant_client


# ==============================================================================
# QDRANT SERVICE CLASS
# ==============================================================================
class QdrantService:

    # --------------------------------------------------------------------------
    # CHECK IF COLLECTION EXISTS
    # WHY: Before performing operations on a collection, we need to verify
    #      it exists. This prevents cryptic Qdrant errors.
    # WHAT: Returns True if the collection exists, False otherwise.
    # INPUT:  collection_name → name of the Qdrant collection to check
    # OUTPUT: True or False
    # --------------------------------------------------------------------------
    @staticmethod
    def collection_exists(collection_name: str) -> bool:
        """
        Checks if a Qdrant collection with the given name exists.

        Args:
            collection_name: Name of the collection to check.

        Returns:
            True if the collection exists, False otherwise.
        """
        try:
            client = get_qdrant_client()
            collections = client.get_collections()
            collection_names = [c.name for c in collections.collections]
            return collection_name in collection_names
        except Exception:
            return False

    # --------------------------------------------------------------------------
    # CREATE COLLECTION
    # WHY: Before storing vectors, the collection must exist in Qdrant.
    #      If it already exists, we can optionally skip or recreate it.
    # WHAT: Creates a new Qdrant collection configured for:
    #       - 384 dimensions (matching BAAI/bge-small-en-v1.5)
    #       - Cosine similarity metric
    # INPUT:
    #   - collection_name → name for the new collection
    #   - recreate → if True, delete existing collection first
    # OUTPUT: True if created successfully
    # --------------------------------------------------------------------------
    @staticmethod
    def create_collection(
        collection_name: str,
        recreate: bool = False
    ) -> bool:
        """
        Creates a Qdrant collection for storing hospital data embeddings.
        Configured for 384-dimensional cosine similarity vectors.

        Args:
            collection_name: Name of the collection to create.
            recreate: If True, delete the existing collection first.

        Returns:
            True if the collection was created successfully.
        """
        client = get_qdrant_client()

        # If recreate=True, delete the existing collection first
        if recreate and QdrantService.collection_exists(collection_name):
            client.delete_collection(collection_name)

        # Only create if it doesn't already exist
        if not QdrantService.collection_exists(collection_name):
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=settings.EMBEDDING_DIMENSIONS,  # 384 dimensions
                    distance=Distance.COSINE             # Cosine similarity metric
                )
            )
            from qdrant_client.models import PayloadSchemaType
            client.create_payload_index(
                collection_name=collection_name,
                field_name="type",
                field_schema=PayloadSchemaType.KEYWORD
            )

        return True

    # --------------------------------------------------------------------------
    # UPSERT POINTS
    # WHY: "Upsert" = Update if exists, Insert if new.
    #      We use upsert instead of insert so re-running the embed endpoint
    #      doesn't create duplicates — it just updates existing records.
    # WHAT: Stores vector embeddings with metadata into Qdrant.
    # INPUT:
    #   - collection_name → which collection to store in
    #   - points → list of dicts, each with: id, vector, payload
    #     Example: [{"id": "doctor_1", "vector": [...], "payload": {...}}]
    # OUTPUT: True if upserted successfully
    # --------------------------------------------------------------------------
    @staticmethod
    def upsert_points(
        collection_name: str,
        points: list[dict]
    ) -> bool:
        """
        Inserts or updates vector points in a Qdrant collection.
        Uses upsert to avoid duplicates on re-embedding.

        Args:
            collection_name: Target collection name.
            points: List of point dicts with 'id', 'vector', and 'payload'.
                   Example payload: {"type": "doctor", "name": "Dr. Sarah", ...}

        Returns:
            True if upserted successfully.

        Raises:
            HTTPException 500: If Qdrant upsert fails.
        """
        try:
            client = get_qdrant_client()

            # Convert dict list to PointStruct objects (Qdrant's format)
            qdrant_points = [
                PointStruct(
                    id=generate_point_id(point["id"]),        # Must be string or integer
                    vector=point["vector"],# The 384-dimensional embedding
                    payload=point["payload"]  # Metadata (name, type, etc.)
                )
                for point in points
            ]

            # Upsert all points in one batch operation (efficient)
            client.upsert(
                collection_name=collection_name,
                points=qdrant_points
            )

            return True

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upsert points into Qdrant: {str(e)}"
            )

    # --------------------------------------------------------------------------
    # SEARCH
    # WHY: The core of the RAG system — find vectors most similar to the query.
    #      Given a user question, find the most relevant hospital records.
    # WHAT: Converts the query to a vector and searches Qdrant for similar ones.
    # INPUT:
    #   - collection_name → which collection to search
    #   - query_text → the user's search query (will be embedded)
    #   - top_k → how many results to return (default: 5)
    #   - score_threshold → minimum similarity score (0.0-1.0, default: 0.3)
    #   - filter_type → optional: "doctor" or "department" to filter by type
    # OUTPUT: List of ScoredPoint objects with id, score, and payload
    # --------------------------------------------------------------------------
    @staticmethod
    def search(
        collection_name: str,
        query_text: str,
        top_k: int = 5,
        score_threshold: float = 0.3,
        filter_type: Optional[str] = None
    ) -> list[ScoredPoint]:
        """
        Performs semantic vector search in Qdrant.
        Converts the query text to a vector and finds similar stored vectors.

        Args:
            collection_name: Collection to search in.
            query_text: The user's search query (will be embedded to a vector).
            top_k: Maximum number of results to return.
            score_threshold: Minimum similarity score (0.0=no match, 1.0=perfect).
            filter_type: Optional type filter ("doctor" or "department").

        Returns:
            List of ScoredPoint objects ordered by similarity score (highest first).

        Raises:
            HTTPException 404: If the collection does not exist.
            HTTPException 500: If the search fails.
        """

        # Check that the collection exists before searching
        if not QdrantService.collection_exists(collection_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Qdrant collection '{collection_name}' not found. "
                       f"Please run POST /rag/embed first to create and populate the collection."
            )

        try:
            client = get_qdrant_client()

            # Convert the query text to a vector embedding
            query_vector = embed_text(query_text)

            # Build optional filter (to search only doctors or only departments)
            search_filter = None
            if filter_type is not None:
                search_filter = Filter(
                    must=[
                        FieldCondition(
                            key="type",               # The "type" field in payload
                            match=MatchValue(value=filter_type)  # "doctor" or "department"
                        )
                    ]
                )

            # Perform the vector search
            response = client.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=top_k,
                score_threshold=score_threshold,  # Exclude low-similarity results
                query_filter=search_filter,
                with_payload=True  # Include the metadata (payload) in results
            )

            return response.points

        except HTTPException:
            raise  # Re-raise HTTPExceptions as-is
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Qdrant search failed: {str(e)}"
            )

    # --------------------------------------------------------------------------
    # DELETE POINT
    # WHY: When a doctor or department is removed from PostgreSQL, we should
    #      also remove their embedding from Qdrant to keep data in sync.
    # WHAT: Deletes a single point from the Qdrant collection by its ID.
    # INPUT:
    #   - collection_name → the collection to delete from
    #   - point_id → the ID of the point to delete (e.g., "doctor_1")
    # OUTPUT: True if deleted successfully
    # --------------------------------------------------------------------------
    @staticmethod
    def delete_point(
        collection_name: str,
        point_id: str
    ) -> bool:
        """
        Deletes a single embedding point from Qdrant by its ID.
        Call this when a doctor or department is deleted from PostgreSQL.

        Args:
            collection_name: The collection containing the point.
            point_id: The ID of the point to delete (e.g., "doctor_1").

        Returns:
            True if deleted successfully.

        Raises:
            HTTPException 404: If the collection doesn't exist.
            HTTPException 500: If deletion fails.
        """

        if not QdrantService.collection_exists(collection_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Collection '{collection_name}' not found."
            )

        try:
            from qdrant_client.models import PointIdsList
            client = get_qdrant_client()

            uuid_point_id = generate_point_id(point_id)
            client.delete(
                collection_name=collection_name,
                points_selector=PointIdsList(points=[uuid_point_id])
            )

            return True

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete point '{point_id}': {str(e)}"
            )

    # --------------------------------------------------------------------------
    # DELETE ALL POINTS
    # WHY: Allows a full reset — deletes and recreates the collection.
    #      Used before a complete re-embedding of all hospital data.
    # WHAT: Deletes the entire collection and recreates it empty.
    # INPUT:  collection_name → the collection to reset
    # OUTPUT: True if reset successfully
    # --------------------------------------------------------------------------
    @staticmethod
    def delete_all_points(collection_name: str) -> bool:
        """
        Deletes the entire Qdrant collection and recreates it empty.
        Use before a full re-embedding to start fresh.

        Args:
            collection_name: The collection to reset.

        Returns:
            True if the collection was successfully reset.
        """
        try:
            client = get_qdrant_client()

            # Delete the collection if it exists
            if QdrantService.collection_exists(collection_name):
                client.delete_collection(collection_name)

            # Recreate it empty
            QdrantService.create_collection(collection_name)

            return True

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to reset collection '{collection_name}': {str(e)}"
            )

    # --------------------------------------------------------------------------
    # GET COLLECTION INFO
    # WHY: Returns statistics about the Qdrant collection — useful for admin
    #      dashboards to show how many embeddings are currently stored.
    # WHAT: Queries Qdrant for collection metadata.
    # INPUT:  collection_name → the collection to inspect
    # OUTPUT: Dict with collection statistics
    # --------------------------------------------------------------------------
    @staticmethod
    def get_collection_info(collection_name: str) -> dict:
        """
        Returns metadata and statistics about a Qdrant collection.

        Args:
            collection_name: The collection to inspect.

        Returns:
            Dict with name, status, vector count, and config info.
        """
        if not QdrantService.collection_exists(collection_name):
            return {
                "exists": False,
                "name": collection_name,
                "points_count": 0,
                "message": "Collection does not exist. Run POST /rag/embed to create it."
            }

        try:
            client = get_qdrant_client()
            info = client.get_collection(collection_name)

            return {
                "exists": True,
                "name": collection_name,
                "points_count": info.points_count,
                "vectors_count": info.vectors_count,
                "status": str(info.status),
                "dimensions": settings.EMBEDDING_DIMENSIONS,
                "distance_metric": "Cosine"
            }

        except Exception as e:
            return {
                "exists": True,
                "name": collection_name,
                "error": str(e)
            }
