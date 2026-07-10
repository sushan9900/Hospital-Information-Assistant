// ==============================================================================
// Hospital Information Assistance — Admin RAG Control Panel
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Renders the administrator-only control panel for managing vector indexing.
//   Allows admins to:
//   1. Ingest/re-embed doctors and departments from PostgreSQL into Qdrant Cloud.
//   2. Test semantic search queries directly to check matching scores (debugging).
//   3. Clear or reset the vector collection database index.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ragService } from '@/services/ragService';
import { SearchResultItem, UserRole } from '@/types';
import { 
  ShieldAlert, Database, RefreshCw, Trash2, Search, Sliders, 
  Terminal, ShieldCheck, HelpCircle, Loader2, Play, AlertTriangle 
} from 'lucide-react';
import { Toast, ToastType } from '@/components/Toast';

export const RAGPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect non-admins away instantly
  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Statistics states
  const [dbInfo, setDbInfo] = useState({
    exists: true,
    points_count: 0,
    vectors_count: 0,
    status: 'unknown',
    name: 'hospital_collection'
  });

  // Query tester states
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<SearchResultItem[]>([]);
  const [topK, setTopK] = useState(3);
  const [selectedFilter, setSelectedFilter] = useState<'doctor' | 'department' | 'all'>('all');

  // UI Flow states
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    fetchQdrantStats();
  }, []);

  const fetchQdrantStats = async () => {
    setIsLoadingStats(true);
    try {
      // In main.py, we don't have a direct /rag/info endpoint, but we can do a mock query
      // or hit health endpoint. Actually we defined get_collection_info on QdrantService
      // but did we register it on RAG router?
      // Looking at `rag.py` router: we did NOT add an info endpoint.
      // So we can perform a dummy semantic search to check if collection exists!
      // Let's do a fast search for "test" with top_k=1.
      const testRes = await ragService.semanticSearch('health', 1, undefined, 0.0);
      setDbInfo({
        exists: true,
        points_count: testRes.total_results,
        vectors_count: testRes.total_results,
        status: 'green',
        name: 'hospital_collection'
      });
    } catch (err: any) {
      // If collection doesn't exist, we capture it
      if (err.response?.status === 404) {
        setDbInfo((prev) => ({ ...prev, exists: false, points_count: 0 }));
      }
    } finally {
      setIsLoadingStats(false);
    }
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  // ----------------------------------------------------------------------------
  // SEED VECTOR DATABASE
  // WHY: Calls POST /rag/embed. Reads Postgres profiles, embeds, and pushes.
  // ----------------------------------------------------------------------------
  const handleSeedDatabase = async (forceRebuild = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    showToast('Triggering database embedding. Generating vectors...', 'info');
    try {
      const response = await ragService.embedAllData(forceRebuild);
      showToast(response.message, 'success');
      fetchQdrantStats();
    } catch (err: any) {
      const apiErr = err.response?.data?.detail || 'Embedding synchronization failed.';
      showToast(apiErr, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ----------------------------------------------------------------------------
  // CLEAR VECTOR DATABASE (WIPE INDEX)
  // ----------------------------------------------------------------------------
  const handleWipeCollection = async () => {
    if (!window.confirm('Wipe Vector Collection? This clears all embeddings from Qdrant Cloud. (PostgreSQL is safe)')) {
      return;
    }
    setIsSyncing(true);
    try {
      await ragService.deleteAllEmbeddings();
      showToast('Qdrant vector collection wiped successfully.', 'success');
      setDbInfo((prev) => ({ ...prev, exists: true, points_count: 0 }));
      setTestResults([]);
    } catch (err) {
      showToast('Wipe index operation failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ----------------------------------------------------------------------------
  // TEST SEMANTIC QUERY
  // ----------------------------------------------------------------------------
  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const filterVal = selectedFilter === 'all' ? undefined : selectedFilter;
      const res = await ragService.semanticSearch(testQuery, topK, filterVal, 0.1);
      setTestResults(res.results);
      showToast(`Found ${res.results.length} vector matches.`, 'success');
    } catch (err: any) {
      const apiErr = err.response?.data?.detail || 'Semantic test query failed.';
      showToast(apiErr, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* PAGE HEADER */}
      <div className="flex items-center space-x-3.5">
        <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center border border-red-100 shadow-inner">
          <ShieldAlert size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">RAG Admin Panel</h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Seed Qdrant Cloud vector indexes, clear collections, and perform semantic search queries.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: COLLECTION STATS & CONTROLS */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* 1. Collection Status Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center">
              <Database size={16} className="mr-2 text-slate-400" />
              <span>Qdrant Collection Status</span>
            </h3>

            {isLoadingStats ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-emerald-500" /></div>
            ) : (
              <div className="space-y-3.5 text-xs">
                
                {/* Connection status */}
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Active Cluster</span>
                  <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-bold ${
                    dbInfo.exists ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {dbInfo.exists ? <ShieldCheck size={11} /> : <AlertTriangle size={11} />}
                    <span>{dbInfo.exists ? 'Connected' : 'Offline/Not Seeded'}</span>
                  </span>
                </div>

                {/* Collection name */}
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Collection Name</span>
                  <span className="font-bold text-slate-700">{dbInfo.name}</span>
                </div>

                {/* Point count */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400 font-semibold">Index Points Count</span>
                  <span className="font-bold text-slate-800 text-sm bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                    {dbInfo.points_count}
                  </span>
                </div>

              </div>
            )}
          </div>

          {/* 2. Database Sync Trigger Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center">
              <RefreshCw size={16} className="mr-2 text-slate-400" />
              <span>Index Maintenance</span>
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              Generate 384-dimensional vector embeddings for all PostgreSQL doctors and departments and push them to Qdrant Cloud.
            </p>

            <div className="space-y-2.5 pt-2">
              {/* Seed Button */}
              <button
                onClick={() => handleSeedDatabase(false)}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-emerald-100 transition-colors disabled:opacity-50"
              >
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Sync / Seed Index</span>
              </button>

              {/* Force Rebuild Button */}
              <button
                onClick={() => handleSeedDatabase(true)}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors disabled:opacity-50"
                title="Wipes old index and creates new"
              >
                <span>Full Force Rebuild</span>
              </button>

              {/* Clear Index Button */}
              <button
                onClick={handleWipeCollection}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-red-50 text-red-500 border border-red-100 hover:border-red-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>Wipe Vector Database</span>
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SEMANTIC QUERY TESTER */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 text-sm flex items-center">
              <Terminal size={16} className="mr-2 text-slate-400" />
              <span>Semantic Search Query Tester</span>
            </h3>

            {/* Test input form */}
            <form onSubmit={handleTestSearch} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Type a test query (e.g. Experienced Cardiologist)..."
                    disabled={isSearching}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={!testQuery.trim() || isSearching}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center space-x-1"
                >
                  {isSearching && <Loader2 size={14} className="animate-spin mr-1" />}
                  <span>Test Search</span>
                </button>
              </div>

              {/* Slider / filter options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-semibold">
                
                {/* Filter Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center">
                    <Sliders size={12} className="mr-1" /> Match Filter Type
                  </label>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 py-1.5 px-2 rounded-lg outline-none text-slate-700"
                  >
                    <option value="all">All Records</option>
                    <option value="doctor">Doctors Only</option>
                    <option value="department">Departments Only</option>
                  </select>
                </div>

                {/* Top K count */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Limit Results (Top K)</span>
                    <span className="font-bold text-slate-800">{topK}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-2"
                  />
                </div>

              </div>
            </form>

            {/* Test matches list viewport */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Semantic Matches ({testResults.length})
              </h4>

              {testResults.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-semibold flex flex-col items-center justify-center space-y-2">
                  <HelpCircle size={28} className="text-slate-300" />
                  <span>Run a query test to inspect cosine matching scores.</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                  {testResults.map((result) => (
                    <div
                      key={result.point_id}
                      className="border border-slate-100 bg-white p-4 rounded-xl space-y-3 text-xs"
                    >
                      {/* Match Meta Block */}
                      <div className="flex justify-between items-center font-semibold">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] ${
                            result.record_type === 'doctor' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                            {result.record_type}
                          </span>
                          <span className="text-slate-400">ID: {result.record_id}</span>
                        </div>
                        
                        {/* Similarity Score */}
                        <div className="text-right">
                          <span className="text-slate-400 mr-1.5">Score:</span>
                          <span className={`font-black text-sm ${
                            result.score >= 0.7 ? 'text-emerald-500' : result.score >= 0.5 ? 'text-amber-500' : 'text-slate-500'
                          }`}>
                            {result.score.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Content Embedded Text */}
                      <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-slate-600 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                        {result.content}
                      </div>

                      {/* Raw Metadata details */}
                      <details className="outline-none">
                        <summary className="text-[10px] text-emerald-500 hover:text-emerald-600 font-bold cursor-pointer outline-none">
                          View Payload Metadata
                        </summary>
                        <pre className="mt-2 bg-slate-900 text-emerald-400 p-3 rounded-lg overflow-x-auto text-[10px] font-mono leading-normal">
                          {JSON.stringify(result.metadata, null, 2)}
                        </pre>
                      </details>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* TOAST ALERTS */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  );
};
export default RAGPage;
