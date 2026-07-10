# ==============================================================================
# Hospital Information Assistance — RAG Service
# ==============================================================================
# WHY THIS FILE EXISTS:
#   This file implements the complete RAG (Retrieval Augmented Generation)
#   pipeline that connects PostgreSQL data → Qdrant vectors → Groq LLM.
#
# WHAT IS RAG:
#   RAG improves AI responses by grounding them in real data:
#   - WITHOUT RAG: AI guesses based on training data (may be wrong/outdated)
#   - WITH RAG: AI answers based on YOUR actual hospital data (accurate)
#
# COMPLETE RAG PIPELINE:
#   1. Read doctors & departments from PostgreSQL
#   2. Convert text to 384-dim vectors using FastEmbed
#   3. Store vectors + metadata in Qdrant Cloud
#   4. When user asks a question:
#      a. Embed the question into a vector
#      b. Search Qdrant for similar vectors (cosine similarity)
#      c. Retrieve the matching hospital records as "context"
#      d. Send context + question to Groq LLM
#      e. Return the AI-generated answer grounded in hospital data
# ==============================================================================

import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.models.doctor import Doctor
from app.models.department import Department
from app.services.qdrant_service import QdrantService, embed_text
from app.schemas.rag import (
    RAGEmbedRequest,
    RAGEmbedResponse,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGAskRequest,
    RAGAskResponse,
    RAGDeleteRequest,
    RAGOperationResponse,
    SearchResultItem
)


# ==============================================================================
# RAG SYSTEM PROMPT
# WHY: The system prompt tells the LLM how to use the retrieved context.
#      It must be grounded — only answer from the provided context.
# ==============================================================================
RAG_SYSTEM_PROMPT = """You are an intelligent Hospital Information Assistant.

You will be provided with relevant hospital information retrieved from our database.
Your job is to answer the user's question ONLY based on the provided context.

Rules:
- Answer ONLY using the information provided in the context below
- If the context does not contain enough information to answer, say:
  "I don't have enough information about that in our hospital records. 
   Please contact the hospital directly for more details."
- Be concise, helpful, and professional
- If multiple doctors/departments are relevant, mention all of them
- Do not make up information that is not in the context

Context from Hospital Database:
{context}
"""


# ==============================================================================
# RAG SERVICE CLASS
# ==============================================================================
class RAGService:

    # --------------------------------------------------------------------------
    # HELPER: BUILD CONTEXT STRING FROM SEARCH RESULTS
    # WHY: The LLM needs the retrieved records formatted as readable text,
    #      not as raw Qdrant point objects.
    # WHAT: Converts a list of ScoredPoint results into a formatted string.
    # INPUT:  results → list of ScoredPoint objects from Qdrant
    # OUTPUT: A formatted string to inject into the LLM prompt as context
    # --------------------------------------------------------------------------
    @staticmethod
    def _build_context_string(results: list) -> str:
        """
        Converts Qdrant search results into a readable context string for the LLM.

        Args:
            results: List of ScoredPoint objects from Qdrant search.

        Returns:
            Formatted string with all relevant hospital information.
        """
        if not results:
            return "No relevant hospital information found."

        context_parts = []
        for i, result in enumerate(results, 1):
            payload = result.payload or {}

            # Build a readable block for each result
            context_parts.append(
                f"[Record {i} - Similarity: {result.score:.2f}]\n"
                f"Type: {payload.get('type', 'Unknown').title()}\n"
                f"Content: {payload.get('content', 'No content available')}\n"
            )

        return "\n".join(context_parts)

    # --------------------------------------------------------------------------
    # HELPER: BUILD SEARCH RESULT ITEMS
    # WHY: Converts raw Qdrant ScoredPoint objects into our Pydantic schema.
    # WHAT: Maps Qdrant results to SearchResultItem objects for the response.
    # INPUT:  results → list of ScoredPoint objects
    # OUTPUT: list of SearchResultItem objects
    # --------------------------------------------------------------------------
    @staticmethod
    def _build_search_result_items(results: list) -> list[SearchResultItem]:
        """
        Converts Qdrant ScoredPoint objects into SearchResultItem Pydantic models.

        Args:
            results: List of ScoredPoint objects from Qdrant search.

        Returns:
            List of SearchResultItem ready for API response.
        """
        items = []
        for result in results:
            payload = result.payload or {}
            items.append(
                SearchResultItem(
                    point_id=str(result.id),
                    score=result.score,
                    record_type=payload.get("type", "unknown"),
                    record_id=payload.get("record_id", 0),
                    content=payload.get("content", ""),
                    metadata={
                        k: v for k, v in payload.items()
                        if k not in ["content", "type", "record_id"]
                    }
                )
            )
        return items

    # --------------------------------------------------------------------------
    # EMBED ALL HOSPITAL DATA
    # WHY: Reads all doctors and departments from PostgreSQL, converts their
    #      text into vector embeddings, and stores them in Qdrant.
    #      Must be run at least once before the RAG search/ask endpoints work.
    # WHAT: Full embedding pipeline:
    #       PostgreSQL → text construction → FastEmbed → Qdrant upsert
    # INPUT:
    #   - db: AsyncSession → database session to read from PostgreSQL
    #   - embed_request: RAGEmbedRequest → options (force_rebuild, data_type)
    # OUTPUT: RAGEmbedResponse with counts and timing
    # --------------------------------------------------------------------------
    @staticmethod
    async def embed_all(
        db: AsyncSession,
        embed_request: RAGEmbedRequest
    ) -> RAGEmbedResponse:
        """
        Reads hospital data from PostgreSQL and embeds it into Qdrant.
        This must be called at least once before search/ask endpoints work.

        Steps:
        1. Create/verify the Qdrant collection
        2. Read doctors from PostgreSQL (if data_type is "all" or "doctors")
        3. Read departments from PostgreSQL (if data_type is "all" or "departments")
        4. Build text content for each record
        5. Embed text into 384-dim vectors using FastEmbed
        6. Upsert all points into Qdrant

        Args:
            db: Async database session.
            embed_request: Options for the embedding operation.

        Returns:
            RAGEmbedResponse with counts and timing information.
        """

        start_time = time.time()
        collection_name = settings.QDRANT_COLLECTION_NAME
        doctors_embedded = 0
        departments_embedded = 0

        # Step 1: Create or recreate the Qdrant collection
        QdrantService.create_collection(
            collection_name=collection_name,
            recreate=embed_request.force_rebuild  # Delete old if force_rebuild=True
        )

        # Step 2: Embed doctors (if data_type is "all" or "doctors")
        if embed_request.data_type in ["all", "doctors"]:
            # Read all doctors from PostgreSQL
            from sqlalchemy.orm import selectinload
            result = await db.execute(
                select(Doctor).options(selectinload(Doctor.department))
            )
            doctors = result.scalars().all()

            # Build points list for Qdrant
            doctor_points = []
            for doctor in doctors:
                # Build the text content to embed
                # Include all meaningful text fields for rich semantic search
                content_parts = [
                    f"Doctor: {doctor.full_name}",
                    f"Specialization: {doctor.specialization}",
                ]
                if doctor.qualification:
                    content_parts.append(f"Qualification: {doctor.qualification}")
                if doctor.experience_years:
                    content_parts.append(f"Experience: {doctor.experience_years} years")
                if doctor.bio:
                    content_parts.append(f"About: {doctor.bio}")
                if doctor.available_days:
                    content_parts.append(f"Available: {doctor.available_days}")
                if doctor.consultation_fee:
                    content_parts.append(f"Fee: {doctor.consultation_fee}")
                if doctor.department:
                    content_parts.append(f"Department: {doctor.department.name}")

                content = " | ".join(content_parts)

                # Generate the embedding vector for this doctor
                vector = embed_text(content)

                # Build the Qdrant point
                doctor_points.append({
                    "id": f"doctor_{doctor.id}",  # Unique point ID
                    "vector": vector,
                    "payload": {
                        "type": "doctor",
                        "record_id": doctor.id,
                        "content": content,
                        "name": doctor.full_name,
                        "specialization": doctor.specialization,
                        "department": doctor.department.name if doctor.department else None,
                        "experience_years": doctor.experience_years,
                        "available_days": doctor.available_days,
                        "consultation_fee": doctor.consultation_fee,
                        "phone": doctor.phone,
                        "email": doctor.email,
                    }
                })

            # Upsert all doctor points into Qdrant in one batch
            if doctor_points:
                QdrantService.upsert_points(collection_name, doctor_points)
                doctors_embedded = len(doctor_points)

        # Step 3: Embed departments (if data_type is "all" or "departments")
        if embed_request.data_type in ["all", "departments"]:
            result = await db.execute(select(Department))
            departments = result.scalars().all()

            department_points = []
            for dept in departments:
                # Build the text content to embed
                content_parts = [f"Department: {dept.name}"]
                if dept.description:
                    content_parts.append(f"About: {dept.description}")
                if dept.location:
                    content_parts.append(f"Location: {dept.location}")
                if dept.phone:
                    content_parts.append(f"Phone: {dept.phone}")

                content = " | ".join(content_parts)
                vector = embed_text(content)

                department_points.append({
                    "id": f"department_{dept.id}",
                    "vector": vector,
                    "payload": {
                        "type": "department",
                        "record_id": dept.id,
                        "content": content,
                        "name": dept.name,
                        "description": dept.description,
                        "location": dept.location,
                        "phone": dept.phone,
                    }
                })

            if department_points:
                QdrantService.upsert_points(collection_name, department_points)
                departments_embedded = len(department_points)

        time_taken = round(time.time() - start_time, 2)
        total = doctors_embedded + departments_embedded

        return RAGEmbedResponse(
            success=True,
            message=f"Successfully embedded {total} records into Qdrant collection '{collection_name}'.",
            total_embedded=total,
            doctors_embedded=doctors_embedded,
            departments_embedded=departments_embedded,
            time_taken_seconds=time_taken
        )

    # --------------------------------------------------------------------------
    # SEMANTIC SEARCH
    # WHY: Performs pure vector search without LLM — useful for debugging
    #      what Qdrant finds for a given query before adding the LLM step.
    # WHAT: Embeds the query, searches Qdrant, returns matching records.
    # INPUT:
    #   - search_request: RAGSearchRequest → query + top_k + filters
    # OUTPUT: RAGSearchResponse with list of matching records and scores
    # --------------------------------------------------------------------------
    @staticmethod
    async def semantic_search(
        search_request: RAGSearchRequest
    ) -> RAGSearchResponse:
        """
        Performs semantic vector search in Qdrant.
        Returns the most relevant hospital records for the given query.

        Args:
            search_request: Contains query, top_k, filter_type, score_threshold.

        Returns:
            RAGSearchResponse with matching records ordered by similarity.
        """

        collection_name = settings.QDRANT_COLLECTION_NAME

        # Search Qdrant for similar vectors
        results = QdrantService.search(
            collection_name=collection_name,
            query_text=search_request.query,
            top_k=search_request.top_k,
            score_threshold=search_request.score_threshold,
            filter_type=search_request.filter_type
        )

        return RAGSearchResponse(
            success=True,
            query=search_request.query,
            total_results=len(results),
            results=RAGService._build_search_result_items(results)
        )

    # --------------------------------------------------------------------------
    # RAG ASK (FULL PIPELINE)
    # WHY: The complete RAG pipeline — question → search → context → LLM → answer.
    #      This is the main endpoint users interact with for AI-powered Q&A.
    # WHAT: Combines Qdrant search + Groq LLM for grounded AI responses.
    # INPUT:
    #   - ask_request: RAGAskRequest → question + top_k
    # OUTPUT: RAGAskResponse with AI answer + sources used
    # --------------------------------------------------------------------------
    @staticmethod
    async def rag_ask(ask_request: RAGAskRequest) -> RAGAskResponse:
        """
        Full RAG pipeline: question → embed → Qdrant search → Groq LLM → answer.

        Steps:
        1. Search Qdrant for hospital records relevant to the question
        2. Build a context string from the retrieved records
        3. Send context + question to Groq LLM
        4. Return the AI answer with source citations

        Args:
            ask_request: Contains the question and top_k context size.

        Returns:
            RAGAskResponse with answer and the source records used.
        """

        collection_name = settings.QDRANT_COLLECTION_NAME

        # Step 1: Search Qdrant for relevant records
        results = QdrantService.search(
            collection_name=collection_name,
            query_text=ask_request.question,
            top_k=ask_request.top_k,
            score_threshold=0.3  # Exclude low-relevance results
        )

        has_context = len(results) > 0

        # Step 2: Build context string from retrieved records
        context_string = RAGService._build_context_string(results)

        # Step 3: Initialize Groq LLM
        llm = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model=settings.GROQ_MODEL,
            temperature=0.3,   # Lower temperature = more factual answers
            max_tokens=1024
        )

        # Step 4: Build the prompt with system instructions + context + question
        prompt = ChatPromptTemplate.from_messages([
            ("system", RAG_SYSTEM_PROMPT),
            ("human", "{question}")
        ])

        # Step 5: Build and invoke the chain
        chain = prompt | llm

        try:
            response = chain.invoke({
                "context": context_string,
                "question": ask_request.question
            })
            answer = response.content

        except Exception as e:
            raise Exception(f"Groq LLM error: {str(e)}")

        # Step 6: Build and return the response with sources
        return RAGAskResponse(
            success=True,
            question=ask_request.question,
            answer=answer,
            sources=RAGService._build_search_result_items(results),
            has_relevant_context=has_context
        )

    # --------------------------------------------------------------------------
    # DELETE POINT
    # WHY: Removes a specific embedding from Qdrant (e.g., after deleting
    #      a doctor or department from the system).
    # INPUT:  delete_request → contains the point_id to remove
    # OUTPUT: RAGOperationResponse with success message
    # --------------------------------------------------------------------------
    @staticmethod
    async def delete_embedding(
        delete_request: RAGDeleteRequest
    ) -> RAGOperationResponse:
        """
        Deletes a specific embedding point from Qdrant by its point ID.

        Args:
            delete_request: Contains the point_id to delete.

        Returns:
            RAGOperationResponse with success/failure message.
        """

        QdrantService.delete_point(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            point_id=delete_request.point_id
        )

        return RAGOperationResponse(
            success=True,
            message=f"Successfully deleted embedding for point '{delete_request.point_id}'."
        )

    # --------------------------------------------------------------------------
    # DELETE ALL EMBEDDINGS
    # WHY: Full reset — clears the entire Qdrant collection.
    #      Useful before a complete re-embedding operation.
    # OUTPUT: RAGOperationResponse
    # --------------------------------------------------------------------------
    @staticmethod
    async def delete_all_embeddings() -> RAGOperationResponse:
        """
        Deletes all embeddings from the Qdrant collection (full reset).
        The collection is recreated empty after deletion.

        Returns:
            RAGOperationResponse with success message.
        """

        QdrantService.delete_all_points(
            collection_name=settings.QDRANT_COLLECTION_NAME
        )

        return RAGOperationResponse(
            success=True,
            message=f"All embeddings deleted from collection '{settings.QDRANT_COLLECTION_NAME}'. "
                    f"Collection has been recreated empty."
        )

    # --------------------------------------------------------------------------
    # REBUILD ALL EMBEDDINGS
    # WHY: Convenience endpoint — delete everything then re-embed from scratch.
    #      Use this when hospital data has changed significantly.
    # INPUT:  db → database session to read fresh data from PostgreSQL
    # OUTPUT: RAGEmbedResponse with new counts
    # --------------------------------------------------------------------------
    @staticmethod
    async def rebuild_all(db: AsyncSession) -> RAGEmbedResponse:
        """
        Deletes all existing embeddings and re-embeds all hospital data from scratch.
        Equivalent to calling delete_all + embed with force_rebuild=True.

        Args:
            db: Async database session.

        Returns:
            RAGEmbedResponse with new embedding counts and timing.
        """

        return await RAGService.embed_all(
            db=db,
            embed_request=RAGEmbedRequest(
                force_rebuild=True,  # Delete old embeddings first
                data_type="all"      # Re-embed everything
            )
        )
