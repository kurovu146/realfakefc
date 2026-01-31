import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Player } from '@/types/database';
import PlayerCard from '@/components/PlayerCard';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, isWhitelisted } = useAuth();

  // Edit State
  const [editingPlayer, setEditingPlayer] = useState<Partial<Player> | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('number', { ascending: true });
    
    if (error) {
      console.error('Error fetching players:', error);
    }

    if (data) {
       setPlayers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isWhitelisted) return;
    if (!editingPlayer || !editingPlayer.id) return;

    // Phân quyền: Chính chủ HOẶC Admin mới được lưu
    const isOwner = user.email === editingPlayer.email;
    if (!isOwner && !isAdmin) {
        alert("Permission denied.");
        return;
    }

    setSaveLoading(true);
    const { error } = await supabase
        .from('players')
        .update({
            nickname: editingPlayer.nickname,
            image: editingPlayer.image,
            height: editingPlayer.height,
            weight: editingPlayer.weight,
            strengths: editingPlayer.strengths,
            weaknesses: editingPlayer.weaknesses,
            dob: editingPlayer.dob
        })
        .eq('id', editingPlayer.id);

    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('Profile updated successfully!');
        setEditingPlayer(null);
        fetchPlayers();
    }
    setSaveLoading(false);
  }

  const filteredPlayers = players.filter(p => {
    if (filter === 'All') return true;
    if (filter === 'Injured') return p.status === 'Injured';
    return p.position === filter && p.status !== 'Injured';
  });

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="container mx-auto px-4 text-left">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-6xl font-heading text-pl-purple uppercase leading-none">Team Squad</h1>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2 border-l-4 border-pl-green pl-2">The official roster of RealFake FC</p>
            </div>
            {!user && (
                <Link to="/login" className="bg-pl-purple text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase hover:bg-pl-pink transition-all cursor-pointer shadow-lg">
                    Sign In to Edit Profile
                </Link>
            )}
            {isAdmin && <span className="bg-pl-green text-pl-purple px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-pl-purple shadow-sm">Master Admin Mode</span>}
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {['All', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Injured'].map(pos => (
            <button
              key={pos}
              onClick={() => setFilter(pos)}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-colors uppercase cursor-pointer ${
                filter === pos 
                  ? 'bg-pl-purple text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {pos === 'Injured' ? '🚑 Injured' : `${pos}s`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-20 text-pl-purple/20 font-heading text-4xl uppercase animate-pulse">Loading Roster...</div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredPlayers.map(player => (
              <div key={player.id} className={player.status === 'Injured' ? 'opacity-75 grayscale-[0.3]' : ''}>
                <PlayerCard 
                    player={player} 
                    onClick={(p) => setEditingPlayer(p)}
                />
                {player.status === 'Injured' && (
                    <div className="mt-2 text-center">
                        <span className="bg-red-50 text-red-600 text-[9px] font-bold px-3 py-1 rounded-full uppercase border border-red-100 tracking-tighter">Inactive • Recovering</span>
                    </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {editingPlayer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-t-[12px] border-pl-purple text-pl-purple relative">
                  <div className="p-8 flex justify-between items-start border-b border-gray-50">
                      <div>
                          <h3 className="text-3xl font-heading font-bold uppercase leading-none mb-1">
                              {editingPlayer.email === user?.email ? 'My Profile' : 'Player Card'}
                          </h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              {editingPlayer.name}
                              {editingPlayer.email === user?.email && <span className="text-pl-green bg-pl-green/10 px-1.5 py-0.5 rounded">AUTHENTICATED</span>}
                          </p>
                      </div>
                      <button onClick={() => setEditingPlayer(null)} className="text-gray-300 hover:text-red-500 text-4xl leading-none transition-colors cursor-pointer">&times;</button>
                  </div>

                  <div className="p-8 space-y-8">
                      <div className="flex justify-center relative">
                          <div className="w-36 h-36 rounded-full overflow-hidden border-8 border-pl-gray bg-gray-50 shadow-inner">
                              <img src={editingPlayer.image || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute -bottom-2 bg-pl-pink text-white font-heading font-bold text-2xl w-12 h-12 flex items-center justify-center rounded-full border-4 border-white shadow-lg">
                              {editingPlayer.number}
                          </div>
                      </div>

                      {/* TRƯỜNG HỢP 1: CHÍNH CHỦ HOẶC ADMIN -> HIỆN FORM SỬA */}
                      {(user?.email === editingPlayer.email || isAdmin) ? (
                          <form onSubmit={handleSaveProfile} className="space-y-5">
                              {isAdmin && user?.email !== editingPlayer.email && (
                                  <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-[10px] font-bold uppercase text-center border border-amber-100 shadow-sm">
                                      🛡️ Master Administrator Access
                                  </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nickname</label>
                                      <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 outline-none text-sm font-bold transition-all" value={editingPlayer.nickname || ''} onChange={e => setEditingPlayer({...editingPlayer, nickname: e.target.value})} placeholder="e.g. The Sniper" />
                                  </div>
                                  <div className="space-y-1 opacity-60 cursor-not-allowed">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email (Linked)</label>
                                      <div className="p-3 bg-gray-100 rounded-xl text-[10px] text-gray-500 truncate border-2 border-transparent">{editingPlayer.email || 'None'}</div>
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Profile Picture URL</label>
                                  <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs outline-none transition-all" value={editingPlayer.image || ''} onChange={e => setEditingPlayer({...editingPlayer, image: e.target.value})} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Height (cm)</label>
                                      <input type="number" className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 outline-none font-mono font-bold" value={editingPlayer.height || ''} onChange={e => setEditingPlayer({...editingPlayer, height: Number(e.target.value)})} />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Weight (kg)</label>
                                      <input type="number" className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 outline-none font-mono font-bold" value={editingPlayer.weight || ''} onChange={e => setEditingPlayer({...editingPlayer, weight: Number(e.target.value)})} />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Top Strengths</label>
                                      <textarea className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs h-24 outline-none resize-none" value={editingPlayer.strengths || ''} onChange={e => setEditingPlayer({...editingPlayer, strengths: e.target.value})} placeholder="Describe your game..." />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Areas to Improve</label>
                                      <textarea className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs h-24 outline-none resize-none" value={editingPlayer.weaknesses || ''} onChange={e => setEditingPlayer({...editingPlayer, weaknesses: e.target.value})} placeholder="Weaknesses..." />
                                  </div>
                              </div>
                              <button disabled={saveLoading} className="w-full py-4 font-bold text-white bg-pl-purple rounded-2xl hover:bg-pl-green hover:text-pl-purple transition-all shadow-xl cursor-pointer uppercase text-xs tracking-[0.2em] disabled:opacity-50 mt-4">
                                  {saveLoading ? 'Syncing with Stadium...' : 'Update Official Records'}
                              </button>
                          </form>
                      ) : (
                          /* TRƯỜNG HỢP 2: XEM NGƯỜI KHÁC (GUEST VIEW) */
                          <div className="space-y-8 text-center">
                              <div className="grid grid-cols-2 gap-4">
                                  {[
                                      { l: 'Preferred Pos', v: editingPlayer.position, icon: '⚽' },
                                      { l: 'Known As', v: editingPlayer.nickname || '-', icon: '🏷️' },
                                      { l: 'Official Height', v: editingPlayer.height ? `${editingPlayer.height} cm` : 'TBD', icon: '📏' },
                                      { l: 'Official Weight', v: editingPlayer.weight ? `${editingPlayer.weight} kg` : 'TBD', icon: '⚖️' }
                                  ].map((it, i) => (
                                      <div key={i} className="bg-pl-gray/30 p-4 rounded-2xl border border-white flex flex-col items-center justify-center shadow-sm">
                                          <span className="text-xl mb-1">{it.icon}</span>
                                          <span className="text-[9px] font-bold text-gray-400 block uppercase mb-1">{it.l}</span>
                                          <span className="font-heading font-bold text-pl-purple text-lg leading-none">{it.v}</span>
                                      </div>
                                  ))}
                              </div>
                              
                              {editingPlayer.strengths && (
                                  <div className="text-left bg-pl-green/10 p-5 rounded-2xl border-2 border-pl-green/20 relative">
                                      <div className="absolute -top-3 left-4 bg-pl-green text-pl-purple px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm">Scouting Report</div>
                                      <p className="text-sm font-medium leading-relaxed italic text-pl-purple">"{editingPlayer.strengths}"</p>
                                  </div>
                              )}

                              {!user && (
                                  <div className="bg-pl-pink/5 p-4 rounded-2xl border border-pl-pink/10">
                                      <p className="text-[10px] text-pl-pink font-bold uppercase tracking-widest">Sign in to manage your own player profile</p>
                                  </div>
                              )}
                              
                              <button onClick={() => setEditingPlayer(null)} className="w-full py-4 font-bold text-gray-400 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all cursor-pointer uppercase text-xs tracking-widest">
                                  Close File
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}