import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Player, Match, MatchStat } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'players' | 'matches'>('players');

  const [editingPlayer, setEditingPlayer] = useState<Partial<Player>>({});
  const [editingMatch, setEditingMatch] = useState<Partial<Match>>({ season: 2026, status: 'Upcoming' });
  const [loading, setLoading] = useState(false);

  const [statsMatchId, setStatsMatchId] = useState<number | null>(null);
  const [currentMatchStats, setCurrentMatchStats] = useState<MatchStat[]>([]);
  const [newStat, setNewStat] = useState<Partial<MatchStat>>({ goals: 0, assists: 0, own_goals: 0, is_motm: false });

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

  // --- Logic functions (savePlayer, deletePlayer, etc.) giữ nguyên nhưng thêm kiểm tra isAdmin ---
  async function savePlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    let error;
    if (editingPlayer.id) {
       const res = await supabase.from('players').update(editingPlayer).eq('id', editingPlayer.id);
       error = res.error;
    } else {
       const res = await supabase.from('players').insert(editingPlayer);
       error = res.error;
    }
    if (error) alert(error.message);
    else { setEditingPlayer({}); await fetchData(); }
    setLoading(false);
  }

  async function deletePlayer(id: number) {
    if (!isAdmin || !confirm('Delete?')) return;
    setLoading(true);
    await supabase.from('players').delete().eq('id', id);
    await fetchData();
    setLoading(false);
  }

  async function saveMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    const matchData = { ...editingMatch, season: editingMatch.season || 2026 };
    let error;
    if (editingMatch.id) {
       const res = await supabase.from('matches').update(matchData).eq('id', editingMatch.id);
       error = res.error;
    } else {
       const res = await supabase.from('matches').insert(matchData);
       error = res.error;
    }
    if (error) alert(error.message);
    else { setEditingMatch({ season: 2026, status: 'Upcoming' }); await fetchData(); }
    setLoading(false);
  }

  async function deleteMatch(id: number) {
    if (!isAdmin || !confirm('Delete?')) return;
    setLoading(true);
    await supabase.from('matches').delete().eq('id', id);
    await fetchData();
    setLoading(false);
  }

  async function openStats(matchId: number) {
    setStatsMatchId(matchId);
    await fetchMatchStats(matchId);
  }

  async function fetchMatchStats(matchId: number) {
    const { data } = await supabase.from('match_stats').select('*, player:players(*)').eq('match_id', matchId);
    if (data) setCurrentMatchStats(data);
  }

  async function addStat(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !statsMatchId || !newStat.player_id) return;
    setLoading(true);
    const { error } = await supabase.from('match_stats').insert({ ...newStat, match_id: statsMatchId });
    if (error) alert(error.message);
    else { setNewStat({ goals: 0, assists: 0, own_goals: 0, is_motm: false }); await fetchMatchStats(statsMatchId); }
    setLoading(false);
  }

  async function deleteStat(id: number) {
    if (!isAdmin || !statsMatchId) return;
    setLoading(true);
    await supabase.from('match_stats').delete().eq('id', id);
    await fetchMatchStats(statsMatchId);
    setLoading(false);
  }

  if (authLoading) return <div className="text-center py-20 font-heading">Verifying permissions...</div>;

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
          <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-pl-purple font-heading uppercase">Access Denied</h2>
          <p className="mb-8 text-gray-500 text-sm">Only authorized administrators can access this dashboard.</p>
          <Link to="/" className="block bg-pl-purple text-white w-full py-3 rounded font-bold hover:bg-pl-pink transition-colors uppercase tracking-wide cursor-pointer">
             Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 min-h-screen">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-4xl font-heading font-bold text-pl-purple uppercase">Master Control</h1>
        <div className="text-right">
            <div className="text-[10px] font-bold text-pl-pink uppercase leading-none">Super Admin</div>
            <div className="text-sm opacity-60">{user?.email}</div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button onClick={() => setActiveTab('players')} className={`px-6 py-2 rounded-full font-bold transition-colors cursor-pointer ${activeTab === 'players' ? 'bg-pl-purple text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Manage Players</button>
        <button onClick={() => setActiveTab('matches')} className={`px-6 py-2 rounded-full font-bold transition-colors cursor-pointer ${activeTab === 'matches' ? 'bg-pl-purple text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Manage Matches</button>
      </div>

      {loading && <div className="fixed top-4 right-4 bg-pl-green text-pl-purple font-bold px-4 py-2 rounded shadow animate-pulse z-50">Syncing...</div>}

      {/* STATS MODAL */}
      {statsMatchId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-t-8 border-pl-pink">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-heading font-bold text-pl-purple uppercase">Match Record Editor</h3>
                    <button onClick={() => setStatsMatchId(null)} className="text-gray-500 hover:text-red-500 text-xl font-bold cursor-pointer transition-colors">&times;</button>
                </div>
                <div className="p-6">
                    <form onSubmit={addStat} className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200 shadow-inner">
                        <h4 className="font-bold mb-3 text-xs uppercase text-gray-400 tracking-widest">Update Match Statistics</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <select className="border p-2 rounded-lg w-full cursor-pointer bg-white" value={newStat.player_id || ''} onChange={e => setNewStat({...newStat, player_id: Number(e.target.value)})} required>
                                <option value="">Choose Player</option>
                                {players.map(p => (<option key={p.id} value={p.id}>{p.number}. {p.name}</option>))}
                            </select>
                            <div className="flex gap-2">
                                <input type="number" placeholder="Goals" className="border p-2 rounded-lg w-full bg-white" value={newStat.goals || 0} onChange={e => setNewStat({...newStat, goals: Number(e.target.value)})} />
                                <input type="number" placeholder="Assists" className="border p-2 rounded-lg w-full bg-white" value={newStat.assists || 0} onChange={e => setNewStat({...newStat, assists: Number(e.target.value)})} />
                            </div>
                            <div className="flex gap-2 items-center">
                                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 flex-1">
                                    <input type="checkbox" checked={newStat.is_motm || false} onChange={e => setNewStat({...newStat, is_motm: e.target.checked})} className="cursor-pointer" />
                                    <span className="font-bold text-xs uppercase">MOTM</span>
                                </label>
                                <input type="number" placeholder="Own Goals" className="border p-2 rounded-lg w-full bg-white ml-auto" value={newStat.own_goals || 0} onChange={e => setNewStat({...newStat, own_goals: Number(e.target.value)})} />
                            </div>
                        </div>
                        <button className="bg-pl-green text-pl-purple font-bold py-3 px-4 rounded-lg w-full hover:bg-green-400 cursor-pointer shadow-md uppercase text-xs">Record Statistic</button>
                    </form>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400 tracking-tighter border-b">
                            <tr><th className="p-3">Player</th><th className="p-3 text-center">G</th><th className="p-3 text-center">A</th><th className="p-3 text-center">MOTM</th><th className="p-3 text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentMatchStats.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-bold text-sm">{s.player?.name}</td>
                                    <td className="p-3 text-center font-mono font-bold text-pl-purple">{s.goals}</td>
                                    <td className="p-3 text-center font-mono">{s.assists}</td>
                                    <td className="p-3 text-center">{s.is_motm ? '🏆' : ''}</td>
                                    <td className="p-3 text-right"><button onClick={() => deleteStat(s.id)} className="text-red-500 font-bold text-[10px] hover:underline cursor-pointer uppercase">Delete</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Tabs Content Player/Match (giữ nguyên logic nhưng thêm style cursor và block isAdmin) */}
      {activeTab === 'players' && (
        <div className="grid md:grid-cols-3 gap-8">
           <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md border h-fit sticky top-24">
             <h3 className="font-bold text-lg mb-4 uppercase text-pl-purple border-b pb-2">New Player Profile</h3>
             <form onSubmit={savePlayer} className="space-y-3">
               <input className="border p-2 w-full rounded outline-none focus:ring-1 focus:ring-pl-purple bg-gray-50 text-sm" placeholder="Full Name" value={editingPlayer.name || ''} onChange={e => setEditingPlayer({...editingPlayer, name: e.target.value})} required />
               <div className="grid grid-cols-2 gap-2">
                 <input className="border p-2 w-full rounded outline-none bg-gray-50 text-sm" type="number" placeholder="Jersey #" value={editingPlayer.number || ''} onChange={e => setEditingPlayer({...editingPlayer, number: Number(e.target.value)})} />
                 <select className="border p-2 w-full rounded cursor-pointer outline-none bg-gray-50 text-sm" value={editingPlayer.position || ''} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value as any})}>
                    <option value="">Position</option><option value="Goalkeeper">Goalkeeper</option><option value="Defender">Defender</option><option value="Midfielder">Midfielder</option><option value="Forward">Forward</option>
                 </select>
               </div>
               <select className="border p-2 w-full rounded cursor-pointer outline-none bg-gray-50 text-sm" value={editingPlayer.status || 'Active'} onChange={e => setEditingPlayer({...editingPlayer, status: e.target.value as any})}>
                  <option value="Active">Status: Active</option><option value="Injured">Status: Injured</option>
               </select>
               <input className="border p-2 w-full rounded outline-none bg-gray-50 text-xs" placeholder="Avatar URL" value={editingPlayer.image || ''} onChange={e => setEditingPlayer({...editingPlayer, image: e.target.value})} />
               <input className="border p-2 w-full rounded outline-none bg-gray-50 text-xs" placeholder="Linked Email (Owner)" value={editingPlayer.email || ''} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} />
               <input className="border p-2 w-full rounded outline-none bg-gray-50 text-xs" placeholder="Nickname" value={editingPlayer.nickname || ''} onChange={e => setEditingPlayer({...editingPlayer, nickname: e.target.value})} />
               <div className="grid grid-cols-2 gap-2">
                  <input className="border p-2 w-full rounded outline-none bg-gray-50 text-xs" type="number" placeholder="Height" value={editingPlayer.height || ''} onChange={e => setEditingPlayer({...editingPlayer, height: Number(e.target.value)})} />
                  <input className="border p-2 w-full rounded outline-none bg-gray-50 text-xs" type="number" placeholder="Weight" value={editingPlayer.weight || ''} onChange={e => setEditingPlayer({...editingPlayer, weight: Number(e.target.value)})} />
               </div>
               <div className="flex gap-2 mt-4 pt-4 border-t">
                 <button className="bg-pl-green text-pl-purple font-bold py-2.5 px-4 rounded-lg w-full hover:bg-green-400 cursor-pointer shadow-sm uppercase text-xs">Save Player</button>
                 {editingPlayer.id && <button type="button" onClick={() => setEditingPlayer({})} className="bg-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-bold hover:bg-gray-400 cursor-pointer text-xs">Cancel</button>}
               </div>
             </form>
           </div>
           <div className="md:col-span-2 bg-white rounded-lg shadow-md border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-pl-purple text-white font-heading uppercase text-xs">
                  <tr><th className="p-4">#</th><th className="p-4">Img</th><th className="p-4">Name</th><th className="p-4">Pos</th><th className="p-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {players.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gray-400">{p.number}</td>
                      <td className="p-4"><img src={p.image || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full bg-gray-200 object-cover shadow-sm" /></td>
                      <td className="p-4 font-bold text-pl-purple">{p.name}</td>
                      <td className="p-4 text-xs text-gray-500 font-bold uppercase">{p.position}</td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => setEditingPlayer(p)} className="text-white font-bold text-[10px] bg-pl-purple px-2 py-1 rounded hover:bg-pl-pink transition-colors cursor-pointer uppercase">Edit</button>
                        <button onClick={() => deletePlayer(p.id)} className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-1 rounded hover:bg-red-600 hover:text-white transition-colors cursor-pointer uppercase border border-red-100">Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="grid md:grid-cols-3 gap-8">
           <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md border h-fit sticky top-24">
             <h3 className="font-bold text-lg mb-4 uppercase text-pl-purple border-b pb-2">New Match Setup</h3>
             <form onSubmit={saveMatch} className="space-y-3">
               <input className="border p-2 w-full rounded outline-none bg-gray-50 text-sm" placeholder="Opponent Name" value={editingMatch.opponent || ''} onChange={e => setEditingMatch({...editingMatch, opponent: e.target.value})} required />
               <div className="flex gap-2">
                 <input className="border p-2 w-1/2 rounded outline-none bg-gray-50 text-sm" type="date" value={editingMatch.date || ''} onChange={e => setEditingMatch({...editingMatch, date: e.target.value})} required />
                 <input className="border p-2 w-1/2 rounded outline-none bg-gray-50 text-sm" type="time" value={editingMatch.time || ''} onChange={e => setEditingMatch({...editingMatch, time: e.target.value})} required />
               </div>
               <input className="border p-2 w-full rounded outline-none bg-gray-50 text-sm" placeholder="Stadium" value={editingMatch.stadium || ''} onChange={e => setEditingMatch({...editingMatch, stadium: e.target.value})} />
               <select className="border p-2 w-full rounded cursor-pointer outline-none bg-gray-50 text-sm" value={editingMatch.status || 'Upcoming'} onChange={e => setEditingMatch({...editingMatch, status: e.target.value as any})}>
                  <option value="Upcoming">Status: Upcoming</option><option value="Finished">Status: Finished</option><option value="Live">Status: Live</option>
               </select>
               {editingMatch.status !== 'Upcoming' && (
                 <div className="flex gap-2 bg-pl-green/10 p-2 rounded-lg border border-pl-green/20">
                   <div className="w-1/2">
                       <label className="text-[10px] font-bold text-pl-purple/60 uppercase">Home Score</label>
                       <input className="border p-2 w-full rounded outline-none bg-white font-bold" type="number" value={editingMatch.home_score ?? 0} onChange={e => setEditingMatch({...editingMatch, home_score: Number(e.target.value)})} />
                   </div>
                   <div className="w-1/2">
                       <label className="text-[10px] font-bold text-pl-purple/60 uppercase">Away Score</label>
                       <input className="border p-2 w-full rounded outline-none bg-white font-bold" type="number" value={editingMatch.away_score ?? 0} onChange={e => setEditingMatch({...editingMatch, away_score: Number(e.target.value)})} />
                   </div>
                 </div>
               )}
               <div className="flex gap-2 mt-4 pt-4 border-t">
                 <button className="bg-pl-green text-pl-purple font-bold py-2.5 px-4 rounded-lg w-full hover:bg-green-400 cursor-pointer shadow-sm uppercase text-xs">Save Match</button>
                 {editingMatch.id && <button type="button" onClick={() => setEditingMatch({})} className="bg-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-bold hover:bg-gray-400 cursor-pointer text-xs">Cancel</button>}
               </div>
             </form>
           </div>
           <div className="md:col-span-2 bg-white rounded-lg shadow-md border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-pl-purple text-white font-heading uppercase text-xs">
                  <tr><th className="p-4">Date</th><th className="p-4">Opponent</th><th className="p-4 text-center">Score</th><th className="p-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matches.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-500 font-bold">{new Date(m.date).toLocaleDateString()}</td>
                      <td className="p-4 font-bold text-pl-purple">{m.opponent}</td>
                      <td className="p-4 text-center font-mono font-bold text-lg">{m.status === 'Upcoming' ? 'vs' : `${m.home_score} - ${m.away_score}`}</td>
                      <td className="p-4 text-right space-x-2 flex justify-end items-center">
                         <button onClick={() => openStats(m.id)} className="text-white font-bold text-[10px] bg-pl-pink px-3 py-1.5 rounded shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1 uppercase">Stats</button>
                         <button onClick={() => setEditingMatch(m)} className="text-pl-purple font-bold text-[10px] bg-gray-100 px-3 py-1.5 rounded hover:bg-pl-purple hover:text-white transition-colors cursor-pointer uppercase">Edit</button>
                         <button onClick={() => deleteMatch(m.id)} className="text-red-600 font-bold text-[10px] bg-red-50 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white transition-colors cursor-pointer uppercase border border-red-100">Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
}
