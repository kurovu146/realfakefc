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
  const [siteSettings, setSiteSettings] = useState({ team_name: '', logo_url: '', banner_url: '', contact_phone: '' });

  const [statsMatchId, setStatsMatchId] = useState<number | null>(null);
  const [currentMatchStats, setCurrentMatchStats] = useState<MatchStat[]>([]);
  const [newStat, setNewStat] = useState<Partial<MatchStat>>({ goals: 0, assists: 0, own_goals: 0, is_motm: false });

  // Delete Confirmation State
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

  // --- Matches Logic ---
  async function sendPushNotification(opponent: string, date: string, time: string, matchId: number) {
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      const apiKey = import.meta.env.VITE_ONESIGNAL_API_KEY;
      
      if (!appId || !apiKey) return;

      // Sử dụng URL thật từ biến môi trường hoặc fallback về origin
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;

      const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Basic ${apiKey}`
        },
        body: JSON.stringify({
            app_id: appId,
            included_segments: ['Total Subscriptions'],
            headings: { en: "⚽ New Match Announced!" },
            contents: { en: `RealFake FC vs ${opponent} on ${new Date(date).toLocaleDateString()} at ${time}. Vote now!` },
            url: `${siteUrl}/fixtures/${matchId}`,
            data: { url: `${siteUrl}/fixtures/${matchId}` }
        })
      };

      try {
          await fetch('https://onesignal.com/api/v1/notifications', options);
          toast.success('Push notification sent to squad!');
      } catch (err) {
          console.error('Push error', err);
          toast.error('Failed to send push notification');
      }
  }

  async function saveMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    const matchData = { ...editingMatch, season: editingMatch.season || 2026 };
    let error;
    
    // Check if new BEFORE saving
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

    if (error) {
        toast.error(error.message);
    } else { 
        toast.success('Matchday confirmed'); 
        if (isNew && matchData.status === 'Upcoming' && matchData.opponent && matchData.date && newMatchId) {
            // 1. Send OneSignal Push
            await sendPushNotification(matchData.opponent, matchData.date, matchData.time || '', newMatchId);
            
            // 2. Create In-App Notification (Broadcast)
            await supabase.from('notifications').insert({
                title: 'New Match Announced!',
                message: `VS ${matchData.opponent} on ${new Date(matchData.date).toLocaleDateString()}`,
                link: `/fixtures/${newMatchId}`,
                is_read: false
            });
        }
        setEditingMatch({ season: 2026, status: 'Upcoming' }); 
        await fetchData(); 
    }
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

  // --- CENTRALIZED DELETE LOGIC ---
  async function confirmDelete() {
      if (!deleteTarget || !isAdmin) return;
      setLoading(true);
      const { type, id } = deleteTarget;
      
      let error;
      if (type === 'player') {
          const { error: e } = await supabase.from('players').delete().eq('id', id);
          error = e;
      } else if (type === 'match') {
          const { error: e } = await supabase.from('matches').delete().eq('id', id);
          error = e;
      } else if (type === 'stat') {
          const { error: e } = await supabase.from('match_stats').delete().eq('id', id);
          error = e;
      }

      if (error) {
          toast.error(error.message);
      } else {
          toast.success(`${type} deleted successfully`);
          if (type === 'stat' && statsMatchId) await fetchMatchStats(statsMatchId);
          else await fetchData();
      }
      setDeleteTarget(null);
      setLoading(false);
  }

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

      {/* TEAM SETTINGS TAB */}
      {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-50">
              <h3 className="text-xl md:text-2xl font-heading font-bold mb-8 uppercase border-b pb-4">General Team Identity</h3>
              <form onSubmit={saveSettings} className="space-y-8">
                  <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Team Display Name</label>
                      <input className="border-2 border-gray-50 p-4 w-full rounded-2xl focus:border-pl-purple bg-gray-50 text-base md:text-lg font-heading font-bold outline-none" value={siteSettings.team_name} onChange={e => setSiteSettings({...siteSettings, team_name: e.target.value})} />
                  </div>

                  <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Contact Phone Number</label>
                      <input className="border-2 border-gray-50 p-4 w-full rounded-2xl focus:border-pl-purple bg-gray-50 text-base md:text-lg font-mono font-bold outline-none" placeholder="e.g. 0912345678" value={siteSettings.contact_phone || ''} onChange={e => setSiteSettings({...siteSettings, contact_phone: e.target.value})} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Official Logo</label>
                          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-pl-gray/20 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                              {siteSettings.logo_url ? <img src={siteSettings.logo_url} className="w-full h-full object-contain p-4" /> : <span className="text-4xl">⚽</span>}
                              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  <span className="text-white text-[9px] font-bold uppercase tracking-tighter">Upload</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={e => handleAdminFileUpload(e, 'logo')} />
                              </label>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Main Banner</label>
                          <div className="w-full h-24 md:h-32 rounded-3xl bg-pl-gray/20 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                              {siteSettings.banner_url ? <img src={siteSettings.banner_url} className="w-full h-full object-cover" /> : <span className="text-4xl">🖼️</span>}
                              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                  <span className="text-white text-[9px] font-bold uppercase tracking-tighter">Upload</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={e => handleAdminFileUpload(e, 'banner')} />
                              </label>
                          </div>
                      </div>
                  </div>

                  <button className="w-full bg-pl-purple text-white font-bold py-5 rounded-2xl hover:bg-pl-green hover:text-pl-purple transition-all shadow-xl uppercase text-xs tracking-[0.2em] mt-4 cursor-pointer">Save Team Identity</button>
              </form>
          </div>
      )}

      {/* PLAYERS TAB */}
      {activeTab === 'players' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
             <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-50 h-fit lg:sticky lg:top-24">
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
                            {uploading ? '...' : 'Upload'}
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
             <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-gray-50 overflow-hidden">
                {/* RESPONSIVE TABLE: HIDDEN ON MOBILE, SHOWN ON DESKTOP */}
                <div className="hidden md:block overflow-x-auto">
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
                              <button onClick={() => setDeleteTarget({ type: 'player', id: p.id })} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer border border-red-100 uppercase">Del</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
                {/* MOBILE LIST VIEW */}
                <div className="md:hidden p-4 space-y-4">
                    {players.map(p => (
                        <div key={p.id} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100">
                            <div className="flex items-center gap-4">
                                <img src={p.image || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded-2xl bg-gray-200 object-cover shadow-sm" />
                                <div>
                                    <div className="font-bold text-pl-purple text-sm">{p.name}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">#{p.number} • {p.position}</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => setEditingPlayer(p)} className="text-white font-bold text-[9px] bg-pl-purple px-3 py-1.5 rounded-lg">EDIT</button>
                                <button onClick={() => setDeleteTarget({ type: 'player', id: p.id })} className="text-red-600 font-bold text-[9px] bg-red-100 px-3 py-1.5 rounded-lg border border-red-200">DEL</button>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>
      )}

      {activeTab === 'matches' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
             <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-50 h-fit lg:sticky lg:top-24">
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
             <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-gray-50 overflow-hidden">
                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-x-auto">
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
                               <button onClick={() => setDeleteTarget({ type: 'match', id: m.id })} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer border border-red-100 uppercase">Del</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
                {/* MOBILE LIST */}
                <div className="md:hidden p-4 space-y-4">
                    {matches.map(m => (
                        <div key={m.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-bold text-pl-purple text-sm">{m.opponent}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">{new Date(m.date).toLocaleDateString()} • {m.time.substring(0,5)}</div>
                                </div>
                                <div className="text-center bg-white border border-gray-200 px-3 py-1 rounded-lg">
                                    <span className="font-mono font-bold text-lg">{m.status === 'Upcoming' ? 'VS' : `${m.home_score}-${m.away_score}`}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                               <button onClick={() => openStats(m.id)} className="text-white font-bold text-[9px] bg-pl-pink px-3 py-2 rounded-lg flex-grow">STATS</button>
                               <button onClick={() => setEditingMatch(m)} className="text-pl-purple font-bold text-[9px] bg-white px-3 py-2 rounded-lg border border-gray-200">EDIT</button>
                               <button onClick={() => setDeleteTarget({ type: 'match', id: m.id })} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-2 rounded-lg border border-red-100">DEL</button>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>
      )}

      {/* STATS MODAL ... (keep existing) */}
      {statsMatchId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-t-8 border-pl-pink relative">
                <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-2xl md:text-3xl font-heading font-bold text-pl-purple uppercase">Match Records</h3>
                    <button onClick={() => setStatsMatchId(null)} className="text-gray-300 hover:text-red-500 text-4xl leading-none cursor-pointer transition-colors">&times;</button>
                </div>
                <div className="p-6 md:p-8">
                    <form onSubmit={addStat} className="bg-pl-gray/10 p-6 rounded-3xl mb-8 border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <select className="border-2 border-white shadow-sm p-3 rounded-xl cursor-pointer bg-white font-bold text-sm outline-none" value={newStat.player_id || ''} onChange={e => setNewStat({...newStat, player_id: Number(e.target.value)})} required>
                                <option value="">Player</option>{players.map(p => (<option key={p.id} value={p.id}>{p.number}. {p.name}</option>))}
                            </select>
                            <div className="flex gap-2">
                                <input type="number" placeholder="Goals" className="border-2 border-white shadow-sm p-3 w-full rounded-xl bg-white font-mono font-bold" value={newStat.goals || 0} onChange={e => setNewStat({...newStat, goals: Number(e.target.value)})} />
                                <input type="number" placeholder="Assists" className="border-2 border-white shadow-sm p-3 w-full rounded-xl bg-white font-mono font-bold" value={newStat.assists || 0} onChange={e => setNewStat({...newStat, assists: Number(e.target.value)})} />
                            </div>
                            <div className="flex gap-3 items-center md:col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-xl border-2 border-white shadow-sm flex-grow transition-all hover:border-pl-pink">
                                    <input type="checkbox" checked={newStat.is_motm || false} onChange={e => setNewStat({...newStat, is_motm: e.target.checked})} className="w-5 h-5 cursor-pointer accent-pl-pink" />
                                    <span className="font-bold text-xs uppercase tracking-widest">MOTM</span>
                                </label>
                                <input type="number" placeholder="OG" className="border-2 border-white shadow-sm p-3 w-1/3 rounded-xl bg-white font-mono" value={newStat.own_goals || 0} onChange={e => setNewStat({...newStat, own_goals: Number(e.target.value)})} />
                            </div>
                        </div>
                        <button className="bg-pl-pink text-white font-bold py-4 px-4 rounded-2xl w-full hover:bg-pl-purple cursor-pointer shadow-xl uppercase text-[10px] tracking-widest">Record Entry</button>
                    </form>
                    <div className="space-y-3">
                        {currentMatchStats.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-50 shadow-sm group hover:border-pl-pink">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-pl-gray/20 flex items-center justify-center font-heading font-bold text-pl-purple text-lg shrink-0">{s.player?.number}</div>
                                    <div><div className="font-bold text-sm">{s.player?.name}</div><div className="flex gap-2 mt-1 flex-wrap">{s.goals > 0 && <span className="text-[8px] font-bold bg-pl-purple text-white px-1.5 py-0.5 rounded">G:{s.goals}</span>}{s.assists > 0 && <span className="text-[8px] font-bold bg-pl-green text-pl-purple px-1.5 py-0.5 rounded">A:{s.assists}</span>}{s.is_motm && <span className="text-[8px] font-bold bg-pl-pink text-white px-1.5 py-0.5 rounded">MOTM</span>}</div></div>
                                </div>
                                <button onClick={() => setDeleteTarget({ type: 'stat', id: s.id })} className="text-gray-300 hover:text-red-500 p-2 cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* DELETE CONFIRMATION POPUP */}
      {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border-t-8 border-red-500 p-8 text-center animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-pl-purple uppercase mb-2">Confirm Delete</h3>
                  <p className="text-gray-500 text-sm mb-8">Are you sure you want to permanently remove this {deleteTarget.type}? This action cannot be undone.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all cursor-pointer uppercase text-xs tracking-widest">Cancel</button>
                      <button onClick={confirmDelete} className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all cursor-pointer uppercase text-xs tracking-widest shadow-lg active:scale-95">Delete</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
