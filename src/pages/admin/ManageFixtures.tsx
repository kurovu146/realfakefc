import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, MatchStat, Player } from '@/types/database';
import { toast } from 'sonner';

interface ManageFixturesProps {
  matches: Match[];
  players: Player[];
  onRefresh: () => void;
  onDeleteRequest: (id: number) => void;
}

export default function ManageFixtures({ matches, players, onRefresh, onDeleteRequest }: ManageFixturesProps) {
  const [editingMatch, setEditingMatch] = useState<Partial<Match>>({ season: 2026, status: 'Upcoming' });
  const [showForm, setShowForm] = useState(false);
  const [statsMatchId, setStatsMatchId] = useState<number | null>(null);
  const [currentMatchStats, setCurrentMatchStats] = useState<MatchStat[]>([]);
  const [newStat, setNewStat] = useState<Partial<MatchStat>>({ goals: 0, assists: 0, own_goals: 0, is_motm: false });

  const handleEdit = (m: Match) => {
    setEditingMatch(m);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sendPushNotification = async (opponent: string, date: string, time: string, matchId: number) => {
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      const apiKey = import.meta.env.VITE_ONESIGNAL_API_KEY;
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      if (!appId || !apiKey) return;

      const options = {
        method: 'POST',
        headers: { accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Basic ${apiKey}` },
        body: JSON.stringify({
            app_id: appId,
            included_segments: ['Total Subscriptions'],
            headings: { en: "⚽ New Match Announced!" },
            contents: { en: `RealFake FC vs ${opponent} on ${new Date(date).toLocaleDateString()} at ${time}. Vote now!` },
            url: `${siteUrl}/fixtures/${matchId}`,
            data: { url: `${siteUrl}/fixtures/${matchId}` }
        })
      };
      try { await fetch('https://onesignal.com/api/v1/notifications', options); toast.success('Push sent'); } catch (err) { console.error(err); }
  };

  const saveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // MẶC ĐỊNH SÂN NHÀ NẾU TRỐNG
    const stadium = editingMatch.stadium || 'Sân bóng La Thành';
    const matchData = { ...editingMatch, stadium, season: editingMatch.season || 2026 };
    
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
            await sendPushNotification(matchData.opponent || '', matchData.date || '', matchData.time || '', newMatchId);
            await supabase.from('notifications').insert({
                title: 'New Match Announced!',
                message: `VS ${matchData.opponent} on ${new Date(matchData.date || '').toLocaleDateString()}`,
                link: `/fixtures/${newMatchId}`,
                is_read: false
            });
        }
        setEditingMatch({ season: 2026, status: 'Upcoming' }); 
        setShowForm(false);
        onRefresh();
    }
  };

  const openStats = async (matchId: number) => {
    setStatsMatchId(matchId);
    const { data } = await supabase.from('match_stats').select('*, player:players(*)').eq('match_id', matchId);
    if (data) setCurrentMatchStats(data);
  };

  const addStat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statsMatchId || !newStat.player_id) return;
    const { error } = await supabase.from('match_stats').insert({ ...newStat, match_id: statsMatchId });
    if (error) toast.error(error.message);
    else { 
        toast.success('Entry added');
        setNewStat({ goals: 0, assists: 0, own_goals: 0, is_motm: false }); 
        const { data } = await supabase.from('match_stats').select('*, player:players(*)').eq('match_id', statsMatchId);
        if (data) setCurrentMatchStats(data);
    }
  };

  const deleteStat = async (id: number) => {
    if (!statsMatchId) return;
    await supabase.from('match_stats').delete().eq('id', id);
    const { data } = await supabase.from('match_stats').select('*, player:players(*)').eq('match_id', statsMatchId);
    if (data) setCurrentMatchStats(data);
  };

  const StatControl = ({ label, value, onChange, color, icon }: any) => (
    <div className={`bg-white p-4 rounded-3xl border-2 ${color} shadow-sm flex flex-col items-center`}>
        <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        </div>
        <div className="flex items-center gap-4">
            <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer">-</button>
            <span className="text-3xl font-heading font-bold w-8 text-center">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)} className="w-10 h-10 rounded-full bg-pl-purple text-white flex items-center justify-center font-bold hover:bg-pl-pink transition-colors shadow-md cursor-pointer">+</button>
        </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start text-pl-purple text-left font-sans">
       <div className="lg:col-span-4 h-fit lg:sticky lg:top-24 space-y-4">
         <button onClick={() => { setShowForm(!showForm); setEditingMatch({ season: 2026, status: 'Upcoming' }); }} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-md transition-all cursor-pointer ${showForm ? 'bg-gray-100 text-gray-500' : 'bg-pl-pink text-white hover:bg-pl-purple'}`}>{showForm ? 'Cancel Action' : '+ Create Matchday'}</button>
         {showForm && (
           <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-gray-50 animate-in fade-in slide-in-from-top-4">
             <form onSubmit={saveMatch} className="space-y-4">
               <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-sm font-bold outline-none" placeholder="Opponent" value={editingMatch.opponent || ''} onChange={e => setEditingMatch({...editingMatch, opponent: e.target.value})} required />
               <div className="grid grid-cols-2 gap-3"><input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-mono outline-none" type="date" value={editingMatch.date || ''} onChange={e => setEditingMatch({...editingMatch, date: e.target.value})} required /><input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-mono outline-none" type="time" value={editingMatch.time || ''} onChange={e => setEditingMatch({...editingMatch, time: e.target.value})} required /></div>
               <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-sm outline-none" placeholder={`Arena (Default: La Thành)`} value={editingMatch.stadium || ''} onChange={e => setEditingMatch({...editingMatch, stadium: e.target.value})} />
               <select className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-bold uppercase cursor-pointer outline-none" value={editingMatch.status || 'Upcoming'} onChange={e => setEditingMatch({...editingMatch, status: e.target.value as any})}><option value="Upcoming">📅 Upcoming</option><option value="Finished">🏁 Finished</option><option value="Live">📡 Live</option></select>
               {editingMatch.status !== 'Upcoming' && (
                 <div className="bg-pl-gray/10 p-4 rounded-2xl border border-dashed border-gray-200"><div className="flex items-center justify-between gap-4"><div className="flex-1 text-center"><label className="text-[8px] font-bold text-gray-400 uppercase">Home</label><input className="border-2 border-white p-2 w-full rounded-lg bg-white font-heading text-xl text-center shadow-sm" type="number" value={editingMatch.home_score ?? 0} onChange={e => setEditingMatch({...editingMatch, home_score: Number(e.target.value)})} /></div><div className="flex-1 text-center"><label className="text-[8px] font-bold text-gray-400 uppercase">Away</label><input className="border-2 border-white p-2 w-full rounded-lg bg-white font-heading text-xl text-center shadow-sm" type="number" value={editingMatch.away_score ?? 0} onChange={e => setEditingMatch({...editingMatch, away_score: Number(e.target.value)})} /></div></div></div>
               )}
               <button className="bg-pl-green text-pl-purple font-bold py-4 px-4 rounded-2xl w-full hover:bg-green-400 cursor-pointer shadow-lg uppercase text-[10px] tracking-widest mt-4">Confirm</button>
             </form>
           </div>
         )}
       </div>
       <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-gray-50 overflow-hidden">
          <div className="hidden md:block overflow-x-auto"><table className="w-full text-left"><thead className="bg-pl-purple text-white font-heading uppercase text-[10px] tracking-widest"><tr><th className="p-5">Timeline</th><th className="p-5">Opponent</th><th className="p-5 text-center">Outcome</th><th className="p-5 text-right">Control</th></tr></thead><tbody className="divide-y divide-gray-50">{matches.map(m => (<tr key={m.id} className="hover:bg-gray-50/50 group"><td className="p-5"><div className="font-bold text-sm">{new Date(m.date).toLocaleDateString()}</div></td><td className="p-5 font-bold text-pl-purple">{m.opponent}</td><td className="p-5 text-center font-mono font-bold text-xl">{m.status === 'Upcoming' ? '--' : `${m.home_score}-${m.away_score}`}</td><td className="p-5 text-right space-x-2"><button onClick={() => openStats(m.id)} className="text-white font-bold text-[9px] bg-pl-pink px-3 py-2 rounded-lg hover:bg-pink-600 cursor-pointer shadow-sm">Stats</button><button onClick={() => handleEdit(m)} className="text-pl-purple font-bold text-[9px] bg-gray-100 px-3 py-2 rounded-lg hover:bg-pl-purple hover:text-white cursor-pointer">Edit</button><button onClick={() => onDeleteRequest(m.id)} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white cursor-pointer tracking-tighter">Del</button></td></tr>))}</tbody></table></div>
                {/* MOBILE LIST */}
                <div className="md:hidden p-4 space-y-4">
                    {matches.map(m => (
                        <div key={m.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${m.status === 'Upcoming' ? 'bg-pl-pink' : m.status === 'Live' ? 'bg-red-500' : 'bg-pl-purple'}`}></div>
                            
                            <div className="flex justify-between items-center mb-4 pl-3">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                                    {new Date(m.date).toLocaleDateString()} • {m.time.substring(0,5)}
                                </div>
                                <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full ${m.status === 'Live' ? 'bg-red-500 text-white animate-pulse' : 'bg-pl-purple/10 text-pl-purple'}`}>
                                    {m.status}
                                </span>
                            </div>

                            <div className="flex items-center justify-between pl-3 mb-6">
                                <div className="flex-1">
                                    <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Opponent</span>
                                    <span className="text-lg font-heading font-bold text-pl-purple leading-none block">{m.opponent}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Score</span>
                                    <span className="text-2xl font-mono font-bold text-pl-purple bg-gray-50 px-3 py-1 rounded-xl block">
                                        {m.status === 'Upcoming' ? '--' : `${m.home_score}-${m.away_score}`}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 pl-3 pt-4 border-t border-gray-50">
                               <button onClick={() => openStats(m.id)} className="flex-1 bg-pl-pink text-white font-bold text-[10px] py-3 rounded-xl shadow-sm uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-1">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg> Stats
                               </button>
                               <button onClick={() => handleEdit(m)} className="flex-1 bg-gray-100 text-pl-purple font-bold text-[10px] py-3 rounded-xl uppercase tracking-widest active:scale-95 transition-transform border border-gray-200">Edit</button>
                               <button onClick={() => onDeleteRequest(m.id)} className="w-10 bg-red-50 text-red-500 font-bold py-3 rounded-xl border border-red-100 flex items-center justify-center active:scale-95 transition-transform">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                               </button>
                            </div>
                        </div>
                    ))}
                </div>
       </div>

        {statsMatchId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                <div className="bg-white rounded-[2.5rem] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-t-8 border-pl-pink relative text-pl-purple">
                    <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                        <h3 className="text-3xl font-heading font-bold uppercase leading-none">Match Ledger</h3>
                        <button onClick={() => setStatsMatchId(null)} className="text-gray-300 hover:text-red-500 text-4xl leading-none cursor-pointer transition-colors">&times;</button>
                    </div>
                    <div className="p-8">
                        <form onSubmit={addStat} className="bg-pl-gray/10 p-6 rounded-3xl mb-8 border border-gray-100">
                            <div className="mb-6"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Assign to Player</label><select className="border-2 border-white shadow-sm p-4 w-full rounded-2xl cursor-pointer bg-white font-bold text-sm outline-none focus:border-pl-pink transition-all" value={newStat.player_id || ''} onChange={e => setNewStat({...newStat, player_id: Number(e.target.value)})} required><option value="">-- Choose Player --</option>{players.map(p => (<option key={p.id} value={p.id}>{p.number}. {p.name}</option>))}</select></div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <StatControl label="Goals" value={newStat.goals || 0} onChange={(v: number) => setNewStat({...newStat, goals: v})} color="border-pl-purple/10" icon="⚽" />
                                <StatControl label="Assists" value={newStat.assists || 0} onChange={(v: number) => setNewStat({...newStat, assists: v})} color="border-pl-green/10" icon="👟" />
                                <StatControl label="Own Goals" value={newStat.own_goals || 0} onChange={(v: number) => setNewStat({...newStat, own_goals: v})} color="border-red-100" icon="🤡" />
                            </div>
                            <label className="flex items-center gap-4 cursor-pointer bg-white p-5 rounded-3xl border-2 border-white shadow-sm hover:border-pl-pink transition-all mb-6"><input type="checkbox" checked={newStat.is_motm || false} onChange={e => setNewStat({...newStat, is_motm: e.target.checked})} className="w-6 h-6 cursor-pointer accent-pl-pink rounded-lg" /><div className="flex flex-col"><span className="font-bold text-sm uppercase tracking-widest leading-none mb-1">Man of the Match</span><span className="text-[9px] text-gray-400 font-bold uppercase">Exceptional Performance Award</span></div></label>
                            <button className="bg-pl-pink text-white font-bold py-4 px-4 rounded-2xl w-full hover:bg-pl-purple cursor-pointer shadow-xl uppercase text-xs tracking-widest transition-all active:scale-95">Record Entry</button>
                        </form>
                        <div className="space-y-3">
                            <h4 className="font-bold text-[10px] uppercase text-gray-400 tracking-[0.2em] ml-2 mb-4">Saved Records</h4>
                            {currentMatchStats.map(s => (<div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-50 shadow-sm group hover:border-pl-pink"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-pl-gray/20 flex items-center justify-center font-heading font-bold text-pl-purple text-lg shrink-0 shadow-inner">{s.player?.number}</div><div><div className="font-bold text-sm leading-none mb-1">{s.player?.name}</div><div className="flex gap-2 mt-1 flex-wrap">{s.goals > 0 && <span className="text-[8px] font-bold bg-pl-purple text-white px-1.5 py-0.5 rounded shadow-sm uppercase">⚽ {s.goals} G</span>}{s.assists > 0 && <span className="text-[8px] font-bold bg-pl-green text-pl-purple px-1.5 py-0.5 rounded shadow-sm uppercase">👟 {s.assists} A</span>}{s.is_motm && <span className="text-[8px] font-bold bg-pl-pink text-white px-1.5 py-0.5 rounded shadow-sm uppercase">🏆 MOTM</span>}{s.own_goals > 0 && <span className="text-[8px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-tighter">OG:{s.own_goals}</span>}</div></div></div><button onClick={() => deleteStat(s.id)} className="text-gray-300 hover:text-red-500 p-2 cursor-pointer transition-colors opacity-0 group-hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>))}
                        </div>
                    </div>
                </div>
            </div>
      )}
    </div>
  );
}