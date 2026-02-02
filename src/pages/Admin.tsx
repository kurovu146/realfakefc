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

  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);

  const [siteSettings, setSiteSettings] = useState({ team_name: '', logo_url: '', banner_url: '', contact_phone: '' });

  const [statsMatchId, setStatsMatchId] = useState<number | null>(null);
  const [currentMatchStats, setCurrentMatchStats] = useState<MatchStat[]>([]);
  const [newStat, setNewStat] = useState<Partial<MatchStat>>({ goals: 0, assists: 0, own_goals: 0, is_motm: false });

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'player' | 'match' | 'stat', id: number } | null>(null);

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

  const handleEditPlayer = (p: Player) => {
      setEditingPlayer(p);
      setShowPlayerForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditMatch = (m: Match) => {
      setEditingMatch(m);
      setShowMatchForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      toast.success(`${target} uploaded!`);
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
      else toast.success('Settings updated!');
      setLoading(false);
  }

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
    else { toast.success('Player saved'); setEditingPlayer({}); setShowPlayerForm(false); await fetchData(); }
    setLoading(false);
  }

  async function saveMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    const matchData = { ...editingMatch, season: editingMatch.season || 2026 };
    let error;
    const isNew = !editingMatch.id;
    let newMatchId = editingMatch.id;

    if (editingMatch.id) {
       const { error: e } = await supabase.from('matches').update(matchData).eq('id', editingMatch.id);
       error = e;
    } else {
       const { data, error: e } = await supabase.from('matches').insert(matchData).select().single();
       error = e;
       if (data) newMatchId = data.id;
    }

    if (error) toast.error(error.message);
    else { 
        toast.success('Matchday confirmed'); 
        if (isNew && matchData.status === 'Upcoming' && newMatchId) {
            // Notification logic (OneSignal & In-App)
        }
        setEditingMatch({ season: 2026, status: 'Upcoming' }); 
        setShowMatchForm(false);
        await fetchData(); 
    }
    setLoading(false);
  }

  async function confirmDelete() {
      if (!deleteTarget || !isAdmin) return;
      setLoading(true);
      const { type, id } = deleteTarget;
      let error;
      if (type === 'player') error = (await supabase.from('players').delete().eq('id', id)).error;
      else if (type === 'match') error = (await supabase.from('matches').delete().eq('id', id)).error;
      else if (type === 'stat') error = (await supabase.from('match_stats').delete().eq('id', id)).error;

      if (error) toast.error(error.message);
      else {
          toast.success(`${type} deleted`);
          if (type === 'stat' && statsMatchId) await fetchMatchStats(statsMatchId);
          else await fetchData();
      }
      setDeleteTarget(null);
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
        toast.success('Record added');
        setNewStat({ goals: 0, assists: 0, own_goals: 0, is_motm: false }); 
        await fetchMatchStats(statsMatchId);
    }
    setLoading(false);
  }

  const StatControl = ({ label, value, onChange, color, icon }: any) => (
    <div className={`bg-white p-4 rounded-3xl border-2 ${color} shadow-sm flex flex-col items-center`}>
        <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        </div>
        <div className="flex items-center gap-4">
            <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-gray-400 hover:bg-gray-100 transition-colors">-</button>
            <span className="text-3xl font-heading font-bold w-8 text-center">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)} className="w-10 h-10 rounded-full bg-pl-purple text-white flex items-center justify-center font-bold hover:bg-pl-pink transition-colors shadow-md">+</button>
        </div>
    </div>
  );

  if (authLoading) return <div className="text-center py-20 font-heading text-pl-purple uppercase">Verifying master access...</div>;

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center border-t-8 border-red-500">
          <h2 className="text-3xl font-heading font-bold uppercase mb-4 text-pl-purple text-center w-full">Access Denied</h2>
          <p className="mb-10 text-gray-500 text-sm">Authorized Admin Only.</p>
          <Link to="/" className="block bg-pl-purple text-white w-full py-4 rounded-2xl font-bold hover:bg-pl-pink transition-all uppercase text-xs cursor-pointer shadow-lg text-center">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 min-h-screen text-pl-purple">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-gray-100 pb-6 gap-4">
        <div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold uppercase leading-none">Master Control</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">RealFake FC • Administrative Console</p>
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

      {/* TEAM SETTINGS */}
      {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-50 animate-in fade-in">
              <h3 className="text-xl md:text-2xl font-heading font-bold mb-8 uppercase border-b pb-4">General Team Identity</h3>
              <form onSubmit={saveSettings} className="space-y-8">
                  <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Team Display Name</label>
                      <input className="border-2 border-gray-50 p-4 w-full rounded-2xl focus:border-pl-purple bg-gray-50 text-base md:text-lg font-heading font-bold outline-none" value={siteSettings.team_name} onChange={e => setSiteSettings({...siteSettings, team_name: e.target.value})} />
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Contact Phone Number</label>
                      <input className="border-2 border-gray-50 p-4 w-full rounded-2xl focus:border-pl-purple bg-gray-50 text-base md:text-lg font-mono font-bold outline-none" value={siteSettings.contact_phone} onChange={e => setSiteSettings({...siteSettings, contact_phone: e.target.value})} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Official Logo</label>
                          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-pl-gray/20 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                              {siteSettings.logo_url ? <img src={siteSettings.logo_url} className="w-full h-full object-contain p-4" /> : <span className="text-4xl">⚽</span>}
                              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><span className="text-white text-[9px] font-bold uppercase">Upload</span><input type="file" accept="image/*" className="hidden" onChange={e => handleAdminFileUpload(e, 'logo')} /></label>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Main Banner</label>
                          <div className="w-full h-24 md:h-32 rounded-3xl bg-pl-gray/20 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                              {siteSettings.banner_url ? <img src={siteSettings.banner_url} className="w-full h-full object-cover" /> : <span className="text-4xl">🖼️</span>}
                              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><span className="text-white text-[9px] font-bold uppercase">Upload</span><input type="file" accept="image/*" className="hidden" onChange={e => handleAdminFileUpload(e, 'banner')} /></label>
                          </div>
                      </div>
                  </div>
                  <button className="w-full bg-pl-purple text-white font-bold py-5 rounded-2xl hover:bg-pl-green hover:text-pl-purple transition-all shadow-xl uppercase text-xs tracking-widest cursor-pointer">Save Team Identity</button>
              </form>
          </div>
      )}

      {/* PLAYERS TAB */}
      {activeTab === 'players' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
             <div className="lg:col-span-4 h-fit lg:sticky lg:top-24 space-y-4">
               <button onClick={() => { setShowPlayerForm(!showPlayerForm); setEditingPlayer({}); }} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-md transition-all cursor-pointer ${showPlayerForm ? 'bg-gray-100 text-gray-500' : 'bg-pl-green text-pl-purple hover:bg-white'}`}>
                 {showPlayerForm ? 'Cancel Action' : '+ Add New Player'}
               </button>
               {showPlayerForm && (
                 <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-50 animate-in fade-in slide-in-from-top-4">
                   <form onSubmit={savePlayer} className="space-y-4">
                     <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-sm font-bold outline-none" placeholder="Full Name" value={editingPlayer.name || ''} onChange={e => setEditingPlayer({...editingPlayer, name: e.target.value})} required />
                     <div className="grid grid-cols-2 gap-3">
                       <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-sm font-mono outline-none" type="number" placeholder="Kit #" value={editingPlayer.number || ''} onChange={e => setEditingPlayer({...editingPlayer, number: Number(e.target.value)})} />
                       <select className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-bold uppercase cursor-pointer" value={editingPlayer.position || ''} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value as any})}><option value="">Pos</option><option value="Goalkeeper">GK</option><option value="Defender">DEF</option><option value="Midfielder">MID</option><option value="Forward">FWD</option><option value="Manager">MGR</option></select>
                     </div>
                     <select className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-bold uppercase cursor-pointer" value={editingPlayer.status || 'Active'} onChange={e => setEditingPlayer({...editingPlayer, status: e.target.value as any})}><option value="Active">🟢 Active</option><option value="Injured">🔴 Injured</option></select>
                     <div className="bg-pl-gray/10 p-4 rounded-2xl border border-dashed border-gray-200 flex items-center gap-4">
                        <img src={editingPlayer.image || 'https://via.placeholder.com/60'} className="w-12 h-12 rounded-2xl bg-gray-100 object-cover shadow-sm border border-white" />
                        <label className="bg-white border border-gray-200 text-[10px] font-bold py-2 px-3 rounded-lg hover:border-pl-purple transition-all cursor-pointer uppercase tracking-tight">Upload Avatar<input type="file" accept="image/*" className="hidden" onChange={e => handleAdminFileUpload(e, 'player')} disabled={uploading} /></label>
                     </div>
                     <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs outline-none" placeholder="Email" value={editingPlayer.email || ''} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} />
                     <button className="bg-pl-green text-pl-purple font-bold py-4 px-4 rounded-2xl w-full hover:bg-green-400 cursor-pointer shadow-lg uppercase text-[10px] tracking-widest">Commit</button>
                   </form>
                 </div>
               )}
             </div>
             <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-gray-50 overflow-hidden">
                <div className="hidden md:block overflow-x-auto"><table className="w-full text-left"><thead className="bg-pl-purple text-white font-heading uppercase text-[10px] tracking-widest"><tr><th className="p-5">#</th><th className="p-5">Visual</th><th className="p-5">Information</th><th className="p-5 text-right">Operations</th></tr></thead><tbody className="divide-y divide-gray-50">{players.map(p => (<tr key={p.id} className="hover:bg-gray-50/50 group"><td className="p-5 font-heading text-2xl text-gray-200 group-hover:text-pl-pink tabular-nums">{p.number}</td><td className="p-5"><img src={p.image} className="w-12 h-12 rounded-2xl bg-gray-100 object-cover shadow-sm border-2 border-white" /></td><td className="p-5"><div className="font-bold text-pl-purple">{p.name}</div><div className="text-[9px] font-bold text-gray-400 uppercase">{p.position}</div></td><td className="p-5 text-right space-x-2"><button onClick={() => handleEditPlayer(p)} className="text-white font-bold text-[9px] bg-pl-purple px-3 py-2 rounded-lg hover:bg-pl-pink cursor-pointer uppercase">Edit</button><button onClick={() => setDeleteTarget({ type: 'player', id: p.id })} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white cursor-pointer uppercase">Del</button></td></tr>))}</tbody></table></div>
                <div className="md:hidden p-4 space-y-4">{players.map(p => (<div key={p.id} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100"><div className="flex items-center gap-4"><img src={p.image} className="w-12 h-12 rounded-2xl bg-gray-100 object-cover shadow-sm" /><div><div className="font-bold text-pl-purple text-sm">{p.name}</div><div className="text-[10px] font-bold text-gray-400 uppercase">#{p.number} • {p.position}</div></div></div><div className="flex flex-col gap-2"><button onClick={() => handleEditPlayer(p)} className="text-white font-bold text-[9px] bg-pl-purple px-3 py-1.5 rounded-lg">EDIT</button><button onClick={() => setDeleteTarget({ type: 'player', id: p.id })} className="text-red-600 font-bold text-[9px] bg-red-100 px-3 py-1.5 rounded-lg">DEL</button></div></div>))}</div>
             </div>
          </div>
      )}

      {activeTab === 'matches' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
             <div className="lg:col-span-4 h-fit lg:sticky lg:top-24 space-y-4">
               <button onClick={() => { setShowMatchForm(!showMatchForm); setEditingMatch({ season: 2026, status: 'Upcoming' }); }} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-md transition-all cursor-pointer ${showMatchForm ? 'bg-gray-100 text-gray-500' : 'bg-pl-pink text-white hover:bg-pl-purple'}`}>{showMatchForm ? 'Cancel Action' : '+ Create Matchday'}</button>
               {showMatchForm && (
                 <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-50 animate-in fade-in slide-in-from-top-4">
                   <form onSubmit={saveMatch} className="space-y-4">
                     <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-sm font-bold outline-none" placeholder="Opponent" value={editingMatch.opponent || ''} onChange={e => setEditingMatch({...editingMatch, opponent: e.target.value})} required />
                     <div className="grid grid-cols-2 gap-3"><input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-mono outline-none" type="date" value={editingMatch.date || ''} onChange={e => setEditingMatch({...editingMatch, date: e.target.value})} required /><input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-mono outline-none" type="time" value={editingMatch.time || ''} onChange={e => setEditingMatch({...editingMatch, time: e.target.value})} required /></div>
                     <select className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-bold uppercase cursor-pointer" value={editingMatch.status || 'Upcoming'} onChange={e => setEditingMatch({...editingMatch, status: e.target.value as any})}><option value="Upcoming">📅 Upcoming</option><option value="Finished">🏁 Finished</option><option value="Live">📡 Live</option></select>
                     {editingMatch.status !== 'Upcoming' && (
                       <div className="bg-pl-gray/10 p-4 rounded-2xl border border-dashed border-gray-200">
                         <div className="flex items-center justify-between gap-4">
                             <div className="flex-1 text-center"><label className="text-[8px] font-bold text-gray-400 uppercase">Home</label><input className="border-2 border-white p-2 w-full rounded-lg bg-white font-heading text-xl text-center" type="number" value={editingMatch.home_score ?? 0} onChange={e => setEditingMatch({...editingMatch, home_score: Number(e.target.value)})} /></div>
                             <div className="flex-1 text-center"><label className="text-[8px] font-bold text-gray-400 uppercase">Away</label><input className="border-2 border-white p-2 w-full rounded-lg bg-white font-heading text-xl text-center" type="number" value={editingMatch.away_score ?? 0} onChange={e => setEditingMatch({...editingMatch, away_score: Number(e.target.value)})} /></div>
                         </div>
                       </div>
                     )}
                     <button className="bg-pl-green text-pl-purple font-bold py-4 px-4 rounded-2xl w-full hover:bg-green-400 cursor-pointer shadow-lg uppercase text-[10px] tracking-widest mt-4">Confirm</button>
                   </form>
                 </div>
               )}
             </div>
             <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-gray-50 overflow-hidden">
                <div className="hidden md:block overflow-x-auto"><table className="w-full text-left"><thead className="bg-pl-purple text-white font-heading uppercase text-[10px] tracking-widest"><tr><th className="p-5">Timeline</th><th className="p-5">Opponent</th><th className="p-5 text-center">Outcome</th><th className="p-5 text-right">Control</th></tr></thead><tbody className="divide-y divide-gray-50">{matches.map(m => (<tr key={m.id} className="hover:bg-gray-50/50 group"><td className="p-5"><div className="font-bold text-sm">{new Date(m.date).toLocaleDateString()}</div></td><td className="p-5 font-bold text-pl-purple">{m.opponent}</td><td className="p-5 text-center font-mono font-bold text-xl">{m.status === 'Upcoming' ? '--' : `${m.home_score}-${m.away_score}`}</td><td className="p-5 text-right space-x-2"><button onClick={() => openStats(m.id)} className="text-white font-bold text-[9px] bg-pl-pink px-3 py-2 rounded-lg hover:bg-pink-600 cursor-pointer shadow-sm">Stats</button><button onClick={() => handleEditMatch(m)} className="text-pl-purple font-bold text-[9px] bg-gray-100 px-3 py-2 rounded-lg hover:bg-pl-purple hover:text-white cursor-pointer">Edit</button><button onClick={() => setDeleteTarget({ type: 'match', id: m.id })} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white cursor-pointer">Del</button></td></tr>))}</tbody></table></div>
                <div className="md:hidden p-4 space-y-4">{matches.map(m => (<div key={m.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><div className="flex justify-between mb-3"><div><div className="font-bold text-sm">{m.opponent}</div><div className="text-[10px] text-gray-400 uppercase">{new Date(m.date).toLocaleDateString()}</div></div><div className="bg-white border px-3 rounded font-bold">{m.status === 'Upcoming' ? 'vs' : `${m.home_score}-${m.away_score}`}</div></div><div className="flex gap-2"><button onClick={() => openStats(m.id)} className="text-white font-bold text-[9px] bg-pl-pink px-3 py-1.5 rounded-lg flex-grow">STATS</button><button onClick={() => handleEditMatch(m)} className="text-pl-purple font-bold text-[9px] bg-white px-3 py-1.5 rounded-lg border">EDIT</button><button onClick={() => setDeleteTarget({ type: 'match', id: m.id })} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-1.5 rounded-lg">DEL</button></div></div>))}</div>
             </div>
          </div>
      )}

      {/* STATS MODAL - NEW DESIGN */}
      {statsMatchId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-t-8 border-pl-pink relative text-pl-purple">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-3xl font-heading font-bold uppercase leading-none">Match Ledger</h3>
                    <button onClick={() => setStatsMatchId(null)} className="text-gray-300 hover:text-red-500 text-4xl leading-none cursor-pointer transition-colors">&times;</button>
                </div>
                <div className="p-8">
                    <form onSubmit={addStat} className="bg-pl-gray/10 p-6 rounded-3xl mb-8 border border-gray-100">
                        <div className="mb-6">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Player</label>
                            <select className="border-2 border-white shadow-sm p-4 w-full rounded-2xl cursor-pointer bg-white font-bold text-sm outline-none focus:border-pl-pink" value={newStat.player_id || ''} onChange={e => setNewStat({...newStat, player_id: Number(e.target.value)})} required>
                                <option value="">-- Choose Player --</option>
                                {players.map(p => (<option key={p.id} value={p.id}>{p.number}. {p.name}</option>))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <StatControl label="Goals" value={newStat.goals || 0} onChange={(v: number) => setNewStat({...newStat, goals: v})} color="border-pl-purple/10" icon="⚽" />
                            <StatControl label="Assists" value={newStat.assists || 0} onChange={(v: number) => setNewStat({...newStat, assists: v})} color="border-pl-green/10" icon="👟" />
                            <StatControl label="Own Goals" value={newStat.own_goals || 0} onChange={(v: number) => setNewStat({...newStat, own_goals: v})} color="border-red-100" icon="🤡" />
                        </div>

                        <label className="flex items-center gap-4 cursor-pointer bg-white p-5 rounded-3xl border-2 border-white shadow-sm hover:border-pl-pink transition-all mb-6">
                            <input type="checkbox" checked={newStat.is_motm || false} onChange={e => setNewStat({...newStat, is_motm: e.target.checked})} className="w-6 h-6 cursor-pointer accent-pl-pink rounded-lg" />
                            <div className="flex flex-col"><span className="font-bold text-sm uppercase tracking-widest">Man of the Match</span><span className="text-[9px] text-gray-400">Award for exceptional performance</span></div>
                        </label>

                        <button className="bg-pl-pink text-white font-bold py-4 px-4 rounded-2xl w-full hover:bg-pl-purple cursor-pointer shadow-xl uppercase text-xs tracking-widest transition-all">Record Record</button>
                    </form>
                    
                    <div className="space-y-3">
                        <h4 className="font-bold text-[10px] uppercase text-gray-400 tracking-[0.2em] ml-2 mb-4">Saved Records</h4>
                        {currentMatchStats.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-50 shadow-sm group hover:border-pl-pink">
                                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-pl-gray/20 flex items-center justify-center font-heading font-bold text-pl-purple text-lg shrink-0">{s.player?.number}</div><div><div className="font-bold text-sm">{s.player?.name}</div><div className="flex gap-2 mt-1">{s.goals > 0 && <span className="text-[8px] font-bold bg-pl-purple text-white px-1.5 py-0.5 rounded">⚽ {s.goals}</span>}{s.assists > 0 && <span className="text-[8px] font-bold bg-pl-green text-pl-purple px-1.5 py-0.5 rounded">👟 {s.assists}</span>}{s.is_motm && <span className="text-[8px] font-bold bg-pl-pink text-white px-1.5 py-0.5 rounded">🏆 MOTM</span>}{s.own_goals > 0 && <span className="text-[8px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded">🤡 OG:{s.own_goals}</span>}</div></div></div>
                                <button onClick={() => setDeleteTarget({ type: 'stat', id: s.id })} className="text-gray-300 hover:text-red-500 p-2 cursor-pointer transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border-t-8 border-red-500 p-8 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
                  <h3 className="text-2xl font-heading font-bold text-pl-purple uppercase mb-2">Are you sure?</h3>
                  <p className="text-gray-500 text-sm mb-8">Permanently remove this {deleteTarget.type}. This cannot be undone.</p>
                  <div className="flex gap-3"><button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl cursor-pointer">Cancel</button><button onClick={confirmDelete} className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl cursor-pointer">Delete</button></div>
              </div>
          </div>
      )}
    </div>
  );
}
