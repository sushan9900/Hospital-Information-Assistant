// ==============================================================================
// Hospital Information Assistance — RAG API Service
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Handles all HTTP queries related to the semantic Retrieval Augmented
//   Generation (RAG) system, including search query tests, grounded QA asks,
//   and administrator indexing options.
//
// OPERATIONS:
//   - semanticSearch()       → Semantic query tests on Qdrant points (public)
//   - ragAsk()               → Grounded QA answers + source citations (public)
//   - embedAllData()         → Admin-only: seeds Qdrant from PostgreSQL
//   - deleteEmbedding()      → Admin-only: deletes a specific point embedding
//   - deleteAllEmbeddings()  → Admin-only: wipes Qdrant collection
//   - rebuildAllEmbeddings() → Admin-only: deletes and re-embeds all data
// ==============================================================================

import api from '@/utils/api';
import {
  RAGSearchResponse,
  RAGAskResponse,
  SearchResultItem
} from '@/types';

export interface RAGEmbedResponse {
  success: boolean;
  message: string;
  total_embedded: number;
  doctors_embedded: number;
  departments_embedded: number;
  time_taken_seconds: number | null;
}

export interface RAGOperationResponse {
  success: boolean;
  message: string;
}

export const ragService = {
  // ----------------------------------------------------------------------------
  // SEMANTIC SEARCH (PUBLIC / DEBUG)
  // WHY: Finds matching documents in Qdrant. Useful for verifying indices.
  // ----------------------------------------------------------------------------
  async semanticSearch(
    query: string,
    topK = 5,
    filterType?: 'doctor' | 'department',
    scoreThreshold = 0.3
  ): Promise<RAGSearchResponse> {
    const response = await api.post<RAGSearchResponse>('/rag/search', {
      query,
      top_k: topK,
      filter_type: filterType,
      score_threshold: scoreThreshold,
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // RAG ASK (PUBLIC)
  // WHY: The core Q&A function. Returns LLM response along with citations.
  // ----------------------------------------------------------------------------
  async ragAsk(question: string, topK = 3): Promise<RAGAskResponse> {
    const response = await api.post<RAGAskResponse>('/rag/ask', {
      question,
      top_k: topK,
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // EMBED DATA (ADMIN ONLY)
  // WHY: Runs database indexation.
  // ----------------------------------------------------------------------------
  async embedAllData(forceRebuild = false, dataType: 'all' | 'doctors' | 'departments' = 'all'): Promise<RAGEmbedResponse> {
    const response = await api.post<RAGEmbedResponse>('/rag/embed', {
      force_rebuild: forceRebuild,
      data_type: dataType,
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // DELETE SINGLE POINT (ADMIN ONLY)
  // WHY: Removes a single point. Format: 'doctor_X' or 'department_Y'.
  // ----------------------------------------------------------------------------
  async deleteEmbedding(pointId: string): Promise<RAGOperationResponse> {
    const response = await api.delete<RAGOperationResponse>('/rag/delete', {
      data: { point_id: pointId }
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // DELETE ALL EMBEDDINGS (ADMIN ONLY)
  // WHY: Clears the Qdrant database index.
  // ----------------------------------------------------------------------------
  async deleteAllEmbeddings(): Promise<RAGOperationResponse> {
    const response = await api.delete<RAGOperationResponse>('/rag/delete-all');
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // REBUILD ALL EMBEDDINGS (ADMIN ONLY)
  // WHY: Wipes the collection and rebuilds all embeddings from PostgreSQL.
  // ----------------------------------------------------------------------------
  async rebuildAllEmbeddings(): Promise<RAGEmbedResponse> {
    const response = await api.post<RAGEmbedResponse>('/rag/rebuild');
    return response.data;
  }
};
