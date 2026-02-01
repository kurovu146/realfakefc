import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Player, Match, MatchStat } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'players' | 'matches' | 'settings'>('players');

  const [editingPlayer, setEditingPlayer] = useState<Partial<Player>>({});
  const [editingMatch, setEditingMatch] = useState<Partial<Match>>({ season: 2026, status: 'Upcoming' });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Settings State
  const [siteSettings, setSiteSettings] = useState({ team_name: '', logo_url: '', banner_url: '' });

  const [statsMatchId, setStatsMatchId] = useState<number | null>(null);
  const [currentMatchStats, setCurrentMatchStats] = useState<MatchStat[]>([]);
  const [newStat, setNewStat] = useState<Partial<MatchStat>>({ goals: 0, assists: 0, own_goals: 0, is_motm: false });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: p } = await supabase.from('players').select('*').order('number', { ascending: true });
    if (p) setPlayers(p);
    
    const { data: m } = await supabase.from('matches').select('*').order('date', { ascending: false });
    if (m) setMatches(m);

    const { data: s } = await supabase.from('site_settings').select('*').single();
    if (s) setSiteSettings(s);

    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  const handleAdminFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: 'player' | 'logo' | 'banner') => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileName = `${target}-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      if (target === 'player') setEditingPlayer(prev => ({ ...prev, image: publicUrl }));
      if (target === 'logo') setSiteSettings(prev => ({ ...prev, logo_url: publicUrl }));
      if (target === 'banner') setSiteSettings(prev => ({ ...prev, banner_url: publicUrl }));
      
      toast.success(`${target} uploaded! Remember to save.`);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  async function saveSettings(e: React.FormEvent) {
      e.preventDefault();
      setLoading(true);
      const { error } = await supabase.from('site_settings').update(siteSettings).eq('id', 1);
      if (error) toast.error(error.message);
      else toast.success('Site settings updated!');
      setLoading(false);
  }

  // --- Players Logic ---
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
    if (error) toast.error(error.message);
    else { toast.success('Player saved'); setEditingPlayer({}); await fetchData(); }
    setLoading(false);
  }

  async function deletePlayer(id: number) {
    if (!isAdmin || !confirm('Purge this player?')) return;
    setLoading(true);
    await supabase.from('players').delete().eq('id', id);
    await fetchData();
    setLoading(false);
  }

  // --- Matches Logic ---
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
    if (error) toast.error(error.message);
    else { toast.success('Matchday confirmed'); setEditingMatch({ season: 2026, status: 'Upcoming' }); await fetchData(); }
    setLoading(false);
  }

  async function deleteMatch(id: number) {
    if (!isAdmin || !confirm('Delete match?')) return;
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
    if (error) toast.error(error.message);
    else { 
        toast.success('Entry added');
        setNewStat({ goals: 0, assists: 0, own_goals: 0, is_motm: false }); 
        await fetchMatchStats(statsMatchId);
    }
    setLoading(false);
  }

  async function deleteStat(id: number) {
    if (!isAdmin || !statsMatchId) return;
    setLoading(true);
    await supabase.from('match_stats').delete().eq('id', id);
    await fetchMatchStats(statsMatchId);
    setLoading(false);
  }

  // --- Helper for Number Input ---
  const NumberControl = ({ label, value, onChange, color }: any) => (
      <div className={`flex flex-col items-center bg-white p-3 rounded-2xl border-2 ${color} transition-all`}>
          <span className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">{label}</span>
          <div className="flex items-center gap-3">
              <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 transition-colors">-</button>
              <span className="text-xl font-heading font-bold w-6 text-center">{value}</span>
              <button type="button" onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-full bg-pl-purple text-white hover:bg-pl-pink flex items-center justify-center font-bold transition-colors">+</button>
          </div>
      </div>
  );

  if (authLoading) return <div className="text-center py-20 font-heading text-pl-purple uppercase animate-pulse">Verifying master access...</div>;

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center border-t-8 border-red-500">
          <h2 className="text-3xl font-heading font-bold uppercase mb-4 text-pl-purple">Access Denied</h2>
          <p className="mb-10 text-gray-500 text-sm">Authorized Admin Only.</p>
          <Link to="/" className="block bg-pl-purple text-white w-full py-4 rounded-2xl font-bold hover:bg-pl-pink transition-all uppercase text-xs cursor-pointer shadow-lg">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 min-h-screen text-pl-purple">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-gray-100 pb-6 gap-4">
        <div>
            <h1 className="text-5xl font-heading font-bold uppercase leading-none">Master Control</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">RealFake FC • Admin Console</p>
        </div>
        <div className="bg-pl-gray/20 p-3 rounded-2xl border border-white flex items-center gap-3">
            <div className="text-right">
                <div className="text-[9px] font-bold text-pl-pink uppercase leading-none">Super User</div>
                <div className="text-xs font-bold opacity-60">{user?.email}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-pl-purple flex items-center justify-center text-white font-bold shadow-md">RF</div>
        </div>
      </div>

      <div className="flex gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {['players', 'matches', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-8 py-3 rounded-2xl font-bold transition-all uppercase text-[10px] tracking-widest cursor-pointer whitespace-nowrap shadow-sm active:scale-95 ${activeTab === tab ? 'bg-pl-purple text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-pl-purple hover:text-pl-purple'}`}>
                {tab === 'players' ? 'Manage Squad' : tab === 'matches' ? 'Manage Fixtures' : 'Team Settings'}
            </button>
        ))}
      </div>

      {loading && <div className="fixed top-4 right-4 bg-pl-green text-pl-purple font-bold px-4 py-2 rounded shadow animate-pulse z-50 text-[10px]">SYNCING...</div>}

      {/* TEAM SETTINGS TAB (Keep as is) */}
      {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-50">
              <h3 className="text-2xl font-heading font-bold mb-8 uppercase border-b pb-4">General Team Identity</h3>
              <form onSubmit={saveSettings} className="space-y-8">
                  <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Team Display Name</label>
                      <input className="border-2 border-gray-50 p-4 w-full rounded-2xl focus:border-pl-purple bg-gray-50 text-lg font-heading font-bold outline-none" value={siteSettings.team_name} onChange={e => setSiteSettings({...siteSettings, team_name: e.target.value})} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Official Logo</label>
                          <div className="w-32 h-32 rounded-3xl bg-pl-gray/20 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                              {siteSettings.logo_url ? <img src={siteSettings.logo_url} className="w-full h-full object-contain p-4" /> : <span className="text-4xl">⚽</span>}
                              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  <span className="text-white text-[9px] font-bold uppercase tracking-tighter">Upload Logo</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={e => handleAdminFileUpload(e, 'logo')} />
                              </label>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Main Banner</label>
                          <div className="w-full h-32 rounded-3xl bg-pl-gray/20 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                              {siteSettings.banner_url ? <img src={siteSettings.banner_url} className="w-full h-full object-cover" /> : <span className="text-4xl">🖼️</span>}
                              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  <span className="text-white text-[9px] font-bold uppercase tracking-tighter">Upload Banner</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={e => handleAdminFileUpload(e, 'banner')} />
                              </label>
                          </div>
                      </div>
                  </div>

                  <button className="w-full bg-pl-purple text-white font-bold py-5 rounded-2xl hover:bg-pl-green hover:text-pl-purple transition-all shadow-xl uppercase text-xs tracking-[0.2em] mt-4 cursor-pointer">Save Team Identity</button>
              </form>
          </div>
      )}

      {/* PLAYERS TAB (Keep as is) */}
      {activeTab === 'players' && (
          <div className="grid md:grid-cols-12 gap-8 items-start">
             <div className="md:col-span-4 bg-white p-8 rounded-3xl shadow-xl border border-gray-50 h-fit sticky top-24">
               <h3 className="text-xl font-heading font-bold mb-6 uppercase border-b border-gray-50 pb-4 flex items-center gap-2">New Profile</h3>
               <form onSubmit={savePlayer} className="space-y-4">
                 <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-sm font-bold outline-none" placeholder="Full Name" value={editingPlayer.name || ''} onChange={e => setEditingPlayer({...editingPlayer, name: e.target.value})} required />
                 <div className="grid grid-cols-2 gap-3">
                   <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-sm font-mono outline-none" type="number" placeholder="Kit #" value={editingPlayer.number || ''} onChange={e => setEditingPlayer({...editingPlayer, number: Number(e.target.value)})} />
                   <select className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-bold uppercase cursor-pointer" value={editingPlayer.position || ''} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value as any})}>
                      <option value="">Pos</option><option value="Goalkeeper">GK</option><option value="Defender">DEF</option><option value="Midfielder">MID</option><option value="Forward">FWD</option><option value="Manager">MGR</option>
                   </select>
                 </div>
                 <select className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-bold uppercase cursor-pointer" value={editingPlayer.status || 'Active'} onChange={e => setEditingPlayer({...editingPlayer, status: e.target.value as any})}>
                    <option value="Active">🟢 Active</option><option value="Injured">🔴 Injured</option>
                 </select>
                 <div className="bg-pl-gray/10 p-4 rounded-2xl border border-dashed border-gray-200">
                    <div className="flex items-center gap-4 mb-3">
                        <img src={editingPlayer.image || 'https://via.placeholder.com/60'} className="w-12 h-12 rounded-2xl bg-gray-100 object-cover shadow-sm border border-white" />
                        <label className="bg-white border border-gray-200 text-[10px] font-bold py-2 px-3 rounded-lg hover:border-pl-purple transition-all cursor-pointer inline-block uppercase tracking-tight">
                            {uploading ? '...' : 'Upload Avatar'}
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleAdminFileUpload(e, 'player')} disabled={uploading} />
                        </label>
                    </div>
                 </div>
                 <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs outline-none" placeholder="Linked Email" value={editingPlayer.email || ''} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} />
                 <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-bold outline-none" placeholder="Nickname" value={editingPlayer.nickname || ''} onChange={e => setEditingPlayer({...editingPlayer, nickname: e.target.value})} />
                 <div className="flex gap-2 mt-6 pt-6 border-t border-gray-50">
                   <button className="bg-pl-green text-pl-purple font-bold py-4 px-4 rounded-2xl w-full hover:bg-green-400 cursor-pointer shadow-lg uppercase text-[10px] tracking-[0.2em]">Commit</button>
                   {editingPlayer.id && <button type="button" onClick={() => setEditingPlayer({})} className="bg-gray-100 text-gray-400 py-4 px-4 rounded-2xl font-bold hover:bg-gray-200 cursor-pointer text-[10px] uppercase">Abort</button>}
                 </div>
               </form>
             </div>
             <div className="md:col-span-8 bg-white rounded-3xl shadow-xl border border-gray-50 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-pl-purple text-white font-heading uppercase text-[10px] tracking-widest">
                    <tr><th className="p-5">Squad #</th><th className="p-5">Visual</th><th className="p-5">Information</th><th className="p-5 text-right">Operations</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {players.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-5 font-heading text-2xl text-gray-200 group-hover:text-pl-pink transition-colors">{p.number}</td>
                        <td className="p-5"><img src={p.image} className="w-12 h-12 rounded-2xl bg-gray-100 object-cover border-2 border-white shadow-sm" /></td>
                        <td className="p-5"><div className="font-bold text-pl-purple">{p.name}</div><div className="text-[9px] font-bold text-gray-400 uppercase">{p.position}</div></td>
                        <td className="p-5 text-right space-x-2">
                          <button onClick={() => setEditingPlayer(p)} className="text-white font-bold text-[9px] bg-pl-purple px-3 py-2 rounded-lg hover:bg-pl-pink transition-all cursor-pointer uppercase">Edit</button>
                          <button onClick={() => deletePlayer(p.id)} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer border border-red-100 uppercase">Del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
      )}

      {activeTab === 'matches' && (
          <div className="grid md:grid-cols-12 gap-8 items-start">
             <div className="md:col-span-4 bg-white p-8 rounded-3xl shadow-xl border border-gray-50 h-fit sticky top-24">
               {/* Match Form (Keep as is) */}
               <h3 className="text-xl font-heading font-bold mb-6 uppercase border-b border-gray-50 pb-4">New Matchday</h3>
               <form onSubmit={saveMatch} className="space-y-4">
                 <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-sm font-bold outline-none" placeholder="Rival Name" value={editingMatch.opponent || ''} onChange={e => setEditingMatch({...editingMatch, opponent: e.target.value})} required />
                 <div className="grid grid-cols-2 gap-3">
                   <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-mono outline-none" type="date" value={editingMatch.date || ''} onChange={e => setEditingMatch({...editingMatch, date: e.target.value})} required />
                   <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-mono outline-none" type="time" value={editingMatch.time || ''} onChange={e => setEditingMatch({...editingMatch, time: e.target.value})} required />
                 </div>
                 <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-sm outline-none" placeholder="Arena" value={editingMatch.stadium || ''} onChange={e => setEditingMatch({...editingMatch, stadium: e.target.value})} />
                 <select className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-bold uppercase cursor-pointer" value={editingMatch.status || 'Upcoming'} onChange={e => setEditingMatch({...editingMatch, status: e.target.value as any})}>
                    <option value="Upcoming">📅 Upcoming</option><option value="Finished">🏁 Finished</option><option value="Live">📡 Live</option>
                 </select>
                 {editingMatch.status !== 'Upcoming' && (
                   <div className="grid grid-cols-2 gap-3 bg-pl-green/5 p-4 rounded-2xl border border-pl-green/10">
                     <input className="border-2 border-white p-3 w-full rounded-xl focus:border-pl-green bg-white font-heading text-2xl text-center shadow-sm" type="number" placeholder="Home" value={editingMatch.home_score ?? 0} onChange={e => setEditingMatch({...editingMatch, home_score: Number(e.target.value)})} />
                     <input className="border-2 border-white p-3 w-full rounded-xl focus:border-pl-green bg-white font-heading text-2xl text-center shadow-sm" type="number" placeholder="Away" value={editingMatch.away_score ?? 0} onChange={e => setEditingMatch({...editingMatch, away_score: Number(e.target.value)})} />
                   </div>
                 )}
                 <div className="flex gap-2 mt-6 pt-6 border-t border-gray-50">
                   <button className="bg-pl-green text-pl-purple font-bold py-4 px-4 rounded-2xl w-full hover:bg-green-400 cursor-pointer shadow-lg uppercase text-[10px]">Set Matchday</button>
                   {editingMatch.id && <button type="button" onClick={() => setEditingMatch({})} className="bg-gray-100 text-gray-400 py-4 px-4 rounded-2xl font-bold hover:bg-gray-200 cursor-pointer text-[10px] uppercase">Cancel</button>}
                 </div>
               </form>
             </div>
             <div className="md:col-span-8 bg-white rounded-3xl shadow-xl border border-gray-50 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-pl-purple text-white font-heading uppercase text-[10px] tracking-widest">
                    <tr><th className="p-5">Timeline</th><th className="p-5">Opponent</th><th className="p-5 text-center">Outcome</th><th className="p-5 text-right">Control</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {matches.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-5"><div className="font-bold text-sm">{new Date(m.date).toLocaleDateString()}</div><div className="text-[10px] text-gray-400 uppercase">{m.time.substring(0,5)}</div></td>
                        <td className="p-5 font-bold text-pl-purple">{m.opponent}</td>
                        <td className="p-5 text-center font-mono font-bold text-xl">{m.status === 'Upcoming' ? 'vs' : `${m.home_score} - ${m.away_score}`}</td>
                        <td className="p-5 text-right space-x-2">
                           <button onClick={() => openStats(m.id)} className="text-white font-bold text-[9px] bg-pl-pink px-3 py-2 rounded-lg hover:bg-pink-600 transition-all cursor-pointer uppercase shadow-sm">Stats</button>
                           <button onClick={() => setEditingMatch(m)} className="text-pl-purple font-bold text-[9px] bg-gray-100 px-3 py-2 rounded-lg hover:bg-pl-purple hover:text-white transition-all cursor-pointer uppercase">Edit</button>
                           <button onClick={() => deleteMatch(m.id)} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer border border-red-100 uppercase">Del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
      )}

      {/* NEW STATS MODAL UI */}
      {statsMatchId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-t-[12px] border-pl-pink relative">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-3xl font-heading font-bold text-pl-purple uppercase leading-none">Match Ledger</h3>
                    <button onClick={() => setStatsMatchId(null)} className="text-gray-300 hover:text-red-500 text-4xl leading-none cursor-pointer transition-colors">&times;</button>
                </div>
                <div className="p-8">
                    <form onSubmit={addStat} className="bg-pl-gray/10 p-6 rounded-3xl mb-8 border border-gray-100">
                        <h4 className="font-bold mb-4 text-[10px] uppercase text-gray-400 tracking-[0.2em]">Add Statistics Entry</h4>
                        
                        <div className="mb-6">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Select Player</label>
                            <select className="border-2 border-white shadow-sm p-4 w-full rounded-2xl cursor-pointer bg-white font-bold text-sm outline-none focus:border-pl-pink transition-all" value={newStat.player_id || ''} onChange={e => setNewStat({...newStat, player_id: Number(e.target.value)})} required>
                                <option value="">-- Choose Player --</option>
                                {players.map(p => (<option key={p.id} value={p.id}>{p.number}. {p.name}</option>))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                            <NumberControl label="Goals" value={newStat.goals || 0} onChange={(v: number) => setNewStat({...newStat, goals: v})} color="border-pl-purple/20 text-pl-purple" />
                            <NumberControl label="Assists" value={newStat.assists || 0} onChange={(v: number) => setNewStat({...newStat, assists: v})} color="border-pl-green/20 text-pl-green" />
                            <NumberControl label="Own Goals" value={newStat.own_goals || 0} onChange={(v: number) => setNewStat({...newStat, own_goals: v})} color="border-red-200 text-red-500" />
                        </div>

                        <label className="flex items-center gap-4 cursor-pointer bg-white p-4 rounded-2xl border-2 border-white shadow-sm hover:border-pl-pink transition-all mb-6">
                            <input type="checkbox" checked={newStat.is_motm || false} onChange={e => setNewStat({...newStat, is_motm: e.target.checked})} className="w-6 h-6 cursor-pointer accent-pl-pink rounded-md" />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm uppercase tracking-widest text-pl-purple">Man of the Match</span>
                                <span className="text-[10px] text-gray-400">Award for outstanding performance</span>
                            </div>
                        </label>

                        <button className="bg-pl-pink text-white font-bold py-4 px-4 rounded-2xl w-full hover:bg-pl-purple cursor-pointer shadow-xl uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95">Record Entry</button>
                    </form>
                    
                    <div className="space-y-3">
                        <h4 className="font-bold text-[10px] uppercase text-gray-400 tracking-[0.2em] ml-2 mb-4">Current Match Records</h4>
                        {currentMatchStats.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-50 shadow-sm group hover:border-pl-pink transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-pl-gray/20 flex items-center justify-center font-heading font-bold text-pl-purple text-xl">{s.player?.number}</div>
                                    <div>
                                        <div className="font-bold text-sm">{s.player?.name}</div>
                                        <div className="flex gap-2 mt-1">
                                            {s.goals > 0 && <span className="text-[9px] font-bold bg-pl-purple text-white px-2 py-1 rounded-lg uppercase tracking-tighter shadow-sm">⚽ {s.goals}</span>}
                                            {s.assists > 0 && <span className="text-[9px] font-bold bg-pl-green text-pl-purple px-2 py-1 rounded-lg uppercase tracking-tighter shadow-sm">👟 {s.assists}</span>}
                                            {s.is_motm && <span className="text-[9px] font-bold bg-pl-pink text-white px-2 py-1 rounded-lg uppercase tracking-tighter shadow-sm">🏆 MOTM</span>}
                                            {s.own_goals > 0 && <span className="text-[9px] font-bold bg-red-100 text-red-500 px-2 py-1 rounded-lg uppercase tracking-tighter border border-red-200">🤡 OG</span>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => deleteStat(s.id)} className="text-gray-300 hover:text-red-500 p-2 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        ))}
                        {currentMatchStats.length === 0 && <p className="text-center py-10 text-gray-300 italic text-sm border-2 border-dashed border-gray-50 rounded-3xl">No records found for this match.</p>}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}