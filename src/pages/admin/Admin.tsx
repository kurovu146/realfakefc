import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Player, Match } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import ManageSquad from './ManageSquad';
import ManageFixtures from './ManageFixtures';
import TeamSettings from './TeamSettings';
import { toast } from 'sonner';

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'players' | 'matches' | 'settings'>('players');
  const [loading, setLoading] = useState(true);

  // Global Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'player' | 'match' | 'stat', id: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: p } = await supabase.from('players').select('*').order('number', { ascending: true });
    if (p) setPlayers(p);
    
    const { data: m } = await supabase.from('matches').select('*').order('date', { ascending: false });
    if (m) setMatches(m);

    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  const confirmDelete = async () => {
      if (!deleteTarget || !isAdmin) return;
      setLoading(true);
      const { type, id } = deleteTarget;
      let error;
      if (type === 'player') error = (await supabase.from('players').delete().eq('id', id)).error;
      else if (type === 'match') {
          const { error: e } = await supabase.from('matches').delete().eq('id', id);
          error = e;
          if (!e) await supabase.from('notifications').delete().ilike('link', `%/fixtures/${id}%`);
      } else if (type === 'stat') error = (await supabase.from('match_stats').delete().eq('id', id)).error;

      if (error) toast.error(error.message);
      else {
          toast.success(`${type} deleted`);
          await fetchData();
      }
      setDeleteTarget(null);
      setLoading(false);
  };

  if (authLoading) return <div className="text-center py-20 font-heading text-pl-purple uppercase animate-pulse">Verifying master access...</div>;

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-4 text-pl-purple">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center border-t-8 border-red-500">
          <h2 className="text-3xl font-heading font-bold uppercase mb-4">Access Denied</h2>
          <p className="mb-10 text-gray-500 text-sm">Authorized Admin Only.</p>
          <Link to="/" className="block bg-pl-purple text-white w-full py-4 rounded-2xl font-bold hover:bg-pl-pink transition-all uppercase text-xs cursor-pointer shadow-lg text-center">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 min-h-screen text-pl-purple font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-gray-100 pb-6 gap-4">
        <div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold uppercase leading-none">Master Control</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">RealFake FC • Admin Console</p>
        </div>
        <div className="bg-pl-gray/20 p-3 rounded-2xl border border-white flex items-center gap-3">
            <div className="text-right">
                <div className="text-[9px] font-bold text-pl-pink uppercase leading-none">Super User</div>
                <div className="text-xs font-bold opacity-60 truncate max-w-[150px]">{user?.email}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-pl-purple flex items-center justify-center text-white font-bold shadow-md shrink-0">RF</div>
        </div>
      </div>

      <div className="flex gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {['players', 'matches', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 md:px-8 py-3 rounded-2xl font-bold transition-all uppercase text-[10px] tracking-widest cursor-pointer whitespace-nowrap shadow-sm active:scale-95 snap-start ${activeTab === tab ? 'bg-pl-purple text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-pl-purple hover:text-pl-purple'}`}>
                {tab === 'players' ? 'Manage Squad' : tab === 'matches' ? 'Manage Fixtures' : 'Team Settings'}
            </button>
        ))}
      </div>

      {loading && <div className="fixed top-4 right-4 bg-pl-green text-pl-purple font-bold px-4 py-2 rounded shadow animate-pulse z-50 text-[10px]">SYNCING...</div>}

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'players' && (
          <ManageSquad 
            players={players} 
            onRefresh={fetchData} 
            onDeleteRequest={(id) => setDeleteTarget({ type: 'player', id })} 
          />
      )}

      {activeTab === 'matches' && (
          <ManageFixtures 
            matches={matches} 
            players={players} 
            onRefresh={fetchData} 
            onDeleteRequest={(id) => setDeleteTarget({ type: 'match', id })} 
          />
      )}

      {activeTab === 'settings' && (
          <TeamSettings />
      )}

      {/* GLOBAL DELETE CONFIRMATION */}
      {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 text-center">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border-t-8 border-red-500 p-8 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-pl-purple uppercase mb-2">Final Purge?</h3>
                  <p className="text-gray-500 text-sm mb-8 font-medium">Permanently remove this {deleteTarget.type}.<br/>Records will be lost forever.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3.5 font-bold text-gray-500 bg-gray-100 rounded-2xl cursor-pointer hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest">Abort</button>
                      <button onClick={confirmDelete} className="flex-1 py-3.5 font-bold text-white bg-red-500 rounded-2xl cursor-pointer hover:bg-red-600 transition-all shadow-lg uppercase text-[10px] tracking-widest active:scale-95">Execute</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
