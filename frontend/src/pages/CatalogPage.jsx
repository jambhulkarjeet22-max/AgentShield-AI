import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, ShieldCheck, Copy, Check, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { fetchAttackCatalog } from '../api/redteam';

export function CatalogPage() {
  const [attacks, setAttacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const loadCatalog = async () => {
      setLoading(true);
      setError(null);
      const res = await fetchAttackCatalog();
      if (res.ok && res.data) {
        setAttacks(res.data);
      } else {
        setError(res.error || 'Failed to load attack catalog');
      }
      setLoading(false);
    };
    loadCatalog();
  }, []);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = ['ALL', ...Array.from(new Set(attacks.map((a) => a.category)))];

  const filteredAttacks = attacks.filter((atk) => {
    const matchesCat = categoryFilter === 'ALL' || atk.category === categoryFilter;
    const matchesSearch =
      atk.attack_id.toLowerCase().includes(search.toLowerCase()) ||
      atk.attack_name.toLowerCase().includes(search.toLowerCase()) ||
      atk.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-navy-900 border border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          Adversarial Attack Knowledge Base
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Catalog of registered adversarial vectors targeting LLM agent vulnerabilities, prompt injections, and loop exhaustion.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search attack ID, name, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-navy-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading attack catalog...</div>
      ) : filteredAttacks.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs">No matching attacks found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAttacks.map((atk) => (
            <div
              key={atk.attack_id}
              className="rounded-2xl bg-navy-900 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition group shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                    {atk.attack_id}
                  </span>
                  <Badge variant={atk.category}>{atk.category}</Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                    {atk.attack_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {atk.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Expected: {atk.expected_outcome || 'DEFENCE_HELD'}</span>
                </div>
                <button
                  onClick={() => handleCopy(atk.attack_id, atk.description)}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 transition"
                  title="Copy description"
                >
                  {copiedId === atk.attack_id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

