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
      const testRes = await ragService.semanticSearch('health', 1, undefined, 0.0);
      setDbInfo({
        exists: true,
        points_count: testRes.total_results,
        vectors_count: testRes.total_results,
        status: 'green',
        name: 'hospital_collection'
      });
    } catch (err: any) {
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
      <div className="flex items-center space-x-3.5 pb-4 border-b border-clinic-sage-200/50 dark:border-slate-800">
        <div className="h-12 w-12 rounded-xl bg-clinic-terracotta-50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-500 flex items-center justify-center border border-clinic-terracotta-100 dark:border-clinic-terracotta-500/25 shadow-inner">
          <ShieldAlert size={22} />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-clinic-forest-500 dark:text-slate-100 font-semibold tracking-tight">RAG Synchronization Hub</h1>
          <p className="text-[10px] font-sans font-bold text-clinic-sage-500 uppercase tracking-widest mt-1">
            Seed Qdrant Cloud vector indexes, clear collections, and perform semantic search queries.
          </p>
        </div>
      </div>

      {/* ASYMMETRIC GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: COLLECTION STATS & CONTROLS (35% width) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* 1. Collection Status Card */}
          <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 rounded-xl p-6 shadow-premium space-y-4">
            <h3 className="text-xs font-sans font-bold text-clinic-text/60 dark:text-slate-400 uppercase tracking-widest flex items-center">
              <Database size={15} className="mr-2 text-clinic-sage-550" />
              <span>Vector Collection</span>
            </h3>

            {isLoadingStats ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-clinic-forest-500" /></div>
            ) : (
              <div className="space-y-3.5 text-xs">
                
                {/* Connection status */}
                <div className="flex justify-between items-center py-2 border-b border-clinic-sage-50 dark:border-slate-800/80">
                  <span className="text-clinic-text/60 dark:text-slate-500 font-semibold">Active Cluster</span>
                  <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] tracking-wider uppercase border ${
                    dbInfo.exists 
                      ? 'bg-clinic-forest-50 dark:bg-clinic-forest-500/10 text-clinic-forest-700 dark:text-clinic-400 border-clinic-forest-100 dark:border-clinic-forest-500/20' 
                      : 'bg-clinic-terracotta-50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-700 dark:text-clinic-400 border-clinic-terracotta-100 dark:border-clinic-terracotta-500/20'
                  }`}>
                    {dbInfo.exists ? <ShieldCheck size={11} /> : <AlertTriangle size={11} />}
                    <span>{dbInfo.exists ? 'Connected' : 'Offline'}</span>
                  </span>
                </div>

                {/* Collection name */}
                <div className="flex justify-between items-center py-2 border-b border-clinic-sage-50 dark:border-slate-800/80">
                  <span className="text-clinic-text/60 dark:text-slate-500 font-semibold">Index Name</span>
                  <span className="font-bold text-clinic-text dark:text-slate-350">{dbInfo.name}</span>
                </div>

                {/* Point count */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-clinic-text/60 dark:text-slate-500 font-semibold">Index Points</span>
                  <span className="font-bold text-clinic-text dark:text-slate-200 bg-clinic-sage-50 dark:bg-slate-800 border border-clinic-sage-200/30 dark:border-slate-800 px-2 py-0.5 rounded-md">
                    {dbInfo.points_count}
                  </span>
                </div>

              </div>
            )}
          </div>

          {/* 2. Database Sync Trigger Card */}
          <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 rounded-xl p-6 shadow-premium space-y-4">
            <h3 className="text-xs font-sans font-bold text-clinic-text/60 dark:text-slate-450 uppercase tracking-widest flex items-center">
              <RefreshCw size={15} className="mr-2 text-clinic-sage-550" />
              <span>Index Maintenance</span>
            </h3>

            <p className="text-[11px] text-clinic-text/60 dark:text-slate-550 leading-relaxed font-semibold">
              Generate 384-dimensional vector embeddings for all PostgreSQL doctor and department data and upload them directly to Qdrant Cloud.
            </p>

            <div className="space-y-2 pt-2">
              {/* Seed Button */}
              <button
                onClick={() => handleSeedDatabase(false)}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 bg-clinic-forest-500 hover:bg-clinic-forest-600 text-white font-sans font-bold py-3 px-4 rounded-xl text-[10px] uppercase tracking-wider shadow-premium hover:shadow-premium-hover transition-all disabled:opacity-50"
              >
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Sync / Seed Index</span>
              </button>

              {/* Force Rebuild Button */}
              <button
                onClick={() => handleSeedDatabase(true)}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 bg-clinic-sage-500 hover:bg-clinic-sage-600 text-white font-sans font-bold py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50"
                title="Wipes old index and creates new"
              >
                <span>Full Force Rebuild</span>
              </button>

              {/* Clear Index Button */}
              <button
                onClick={handleWipeCollection}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 bg-white dark:bg-slate-900 hover:bg-clinic-terracotta-50/50 dark:hover:bg-clinic-terracotta-500/10 text-clinic-terracotta-500 border border-clinic-terracotta-100 dark:border-clinic-terracotta-500/25 hover:border-transparent dark:hover:border-transparent font-sans font-bold py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>Wipe Database Index</span>
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SEMANTIC QUERY TESTER (65% width) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800 rounded-xl p-6 shadow-premium space-y-5">
            <h3 className="text-xs font-sans font-bold text-clinic-text/60 dark:text-slate-400 uppercase tracking-widest flex items-center">
              <Terminal size={15} className="mr-2 text-clinic-sage-550" />
              <span>Semantic Search Query Tester</span>
            </h3>

            {/* Test input form */}
            <form onSubmit={handleTestSearch} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search size={16} className="absolute left-3.5 text-clinic-sage-500 pointer-events-none" />
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Type a test query (e.g. Experienced Cardiologist)..."
                    disabled={isSearching}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-clinic-sage-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-clinic-text dark:text-slate-200 outline-none hover:border-clinic-sage-500 dark:hover:border-clinic-sage-705 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/20 shadow-sm transition-all font-semibold"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={!testQuery.trim() || isSearching}
                  className="bg-clinic-forest-500 hover:bg-clinic-forest-600 text-white text-[10px] font-sans font-bold uppercase tracking-wider px-5 py-3 rounded-xl shadow-premium transition-colors flex items-center space-x-1.5"
                >
                  {isSearching && <Loader2 size={12} className="animate-spin" />}
                  <span>Test Search</span>
                </button>
              </div>

              {/* Slider / filter options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-clinic-bg/40 dark:bg-slate-950/40 border border-clinic-sage-200/40 dark:border-slate-800/80 p-4 rounded-xl text-xs font-semibold">
                
                {/* Filter Selector */}
                <div className="space-y-1">
                  <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest flex items-center">
                    <Sliders size={12} className="mr-1 text-clinic-sage-500" /> Match Filter Type
                  </label>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-clinic-sage-200 dark:border-slate-850 py-2 px-2.5 rounded-lg outline-none text-clinic-text dark:text-slate-300 font-semibold"
                  >
                    <option value="all">All Records</option>
                    <option value="doctor">Doctors Only</option>
                    <option value="department">Departments Only</option>
                  </select>
                </div>

                {/* Top K count */}
                <div className="space-y-1">
                  <label className="text-[9px] font-sans font-bold text-clinic-text/60 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    <span>Limit Results (Top K)</span>
                    <span className="font-bold text-clinic-text dark:text-slate-205">{topK}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="w-full h-1.5 bg-clinic-sage-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-clinic-forest-500 mt-2"
                  />
                </div>

              </div>
            </form>

            {/* Test matches list viewport */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[9px] font-sans font-bold text-clinic-sage-500 uppercase tracking-widest">
                Semantic Matches ({testResults.length})
              </h4>

              {testResults.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-clinic-sage-200 dark:border-slate-800 rounded-xl text-clinic-sage-500 dark:text-slate-550 text-xs font-semibold flex flex-col items-center justify-center space-y-2">
                  <HelpCircle size={24} className="text-clinic-sage-500" />
                  <span>Run a query test to inspect cosine matching scores.</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                  {testResults.map((result) => (
                    <div
                      key={result.point_id}
                      className="border border-clinic-sage-200/40 dark:border-slate-805 bg-white dark:bg-slate-900/60 p-4 rounded-xl space-y-3 text-xs"
                    >
                      {/* Match Meta Block */}
                      <div className="flex justify-between items-center font-semibold">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px] border ${
                            result.record_type === 'doctor' 
                              ? 'bg-clinic-sage-50 dark:bg-clinic-forest-500/10 text-clinic-forest-600 dark:text-clinic-400 border-clinic-sage-200/30' 
                              : 'bg-clinic-terracotta-50/50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-500 border-clinic-terracotta-100/30'
                          }`}>
                            {result.record_type}
                          </span>
                          <span className="text-clinic-text/50 dark:text-slate-500">ID: {result.record_id}</span>
                        </div>
                        
                        {/* Similarity Score */}
                        <div className="text-right font-sans">
                          <span className="text-clinic-text/55 dark:text-slate-500 mr-1.5 uppercase text-[9px] tracking-wider font-bold">Score:</span>
                          <span className={`font-bold text-sm ${
                            result.score >= 0.7 
                              ? 'text-clinic-forest-500' 
                              : result.score >= 0.5 
                              ? 'text-clinic-terracotta-500' 
                              : 'text-clinic-text/60'
                          }`}>
                            {result.score.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Content Embedded Text */}
                      <div className="bg-clinic-bg/40 dark:bg-slate-950/60 border border-clinic-sage-200/30 dark:border-slate-800 p-3 rounded-lg text-clinic-text dark:text-slate-350 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                        {result.content}
                      </div>

                      {/* Raw Metadata details */}
                      <details className="outline-none group">
                        <summary className="text-[10px] text-clinic-forest-500 hover:text-clinic-forest-600 font-bold cursor-pointer outline-none select-none">
                          View Payload Metadata
                        </summary>
                        <pre className="mt-2 bg-slate-900 dark:bg-slate-950 text-clinic-sage-200 dark:text-slate-400 p-3 rounded-lg overflow-x-auto text-[10px] font-mono leading-normal border border-slate-850">
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
