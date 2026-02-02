import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Player } from '@/types/database';
import PlayerCard from '@/components/PlayerCard';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, isWhitelisted } = useAuth();

  const [editingPlayer, setEditingPlayer] = useState<Partial<Player> | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('number', { ascending: true });
    
    if (error) console.error('Error:', error);
    if (data) {
        const playersWithFreshImages = data.map(p => ({
            ...p,
            image: p.image ? `${p.image}${p.image.includes('?') ? '&' : '?'}t=${Date.now()}` : p.image
        }));
        setPlayers(playersWithFreshImages);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileName = `${editingPlayer?.id}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditingPlayer(prev => prev ? { ...prev, image: `${publicUrl}?t=${Date.now()}` } : null);
      toast.success('Avatar uploaded! Click Update to save.');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isWhitelisted || !editingPlayer || !editingPlayer.id) return;

    if (user.email !== editingPlayer.email && !isAdmin) {
        toast.error("Permission denied.");
        return;
    }

    setSaveLoading(true);
    const cleanImageUrl = editingPlayer.image?.split('?')[0];

    const { error } = await supabase
        .from('players')
        .update({
            nickname: editingPlayer.nickname,
            image: cleanImageUrl,
            height: editingPlayer.height,
            weight: editingPlayer.weight,
            dob: editingPlayer.dob,
            joined_at: editingPlayer.joined_at,
            phone: editingPlayer.phone
        })
        .eq('id', editingPlayer.id);

    if (error) toast.error('Error: ' + error.message);
    else {
        setEditingPlayer(null);
        await fetchPlayers();
        toast.success('Profile updated successfully!');
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
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2 border-l-4 border-pl-green pl-2">RealFake FC Official Roster</p>
            </div>
            {!user && <Link to="/login" className="bg-pl-purple text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase hover:bg-pl-pink transition-all cursor-pointer shadow-lg">Sign In</Link>}
            {isAdmin && <span className="bg-pl-green text-pl-purple px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-pl-purple">Admin Mode</span>}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-10">
          {['All', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Injured'].map(pos => (
            <button key={pos} onClick={() => setFilter(pos)} className={`px-6 py-2 rounded-full font-bold text-sm transition-colors uppercase cursor-pointer ${filter === pos ? 'bg-pl-purple text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              {pos === 'Injured' ? '🚑 Injured' : `${pos}s`}
            </button>
          ))}
        </div>

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredPlayers.map(player => (
              <div key={`${player.id}-${player.image}`}>
                <PlayerCard player={player} onClick={(p) => setEditingPlayer(p)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {editingPlayer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-pl-purple">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-t-[12px] border-pl-purple relative">
                  <div className="p-8 flex justify-between items-start border-b border-gray-50">
                      <div>
                          <h3 className="text-2xl font-heading font-bold uppercase mb-1">{editingPlayer.email === user?.email ? 'My Profile' : 'Player Card'}</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{editingPlayer.name}</p>
                      </div>
                      <button onClick={() => { setEditingPlayer(null); }} className="text-gray-300 hover:text-red-500 text-4xl leading-none transition-colors cursor-pointer">&times;</button>
                  </div>

                  <div className="p-8 space-y-6 text-center">
                      <div className="flex flex-col items-center">
                          <div className="relative group">
                              <div className="w-32 h-32 rounded-full overflow-hidden border-8 border-pl-gray bg-gray-50 shadow-inner">
                                  <img src={editingPlayer.image || 'https://placehold.co/150/38003c/ffffff?text=Ava'} className="w-full h-full object-cover" />
                              </div>
                              {(user?.email === editingPlayer.email || isAdmin) && (
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold uppercase text-center p-2">
                                    {uploading ? '...' : 'Change Photo'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                </label>
                              )}
                          </div>
                          {uploading && <div className="mt-2 text-pl-pink font-bold text-[10px] animate-pulse uppercase tracking-widest">Uploading...</div>}
                      </div>

                      {(user?.email === editingPlayer.email || isAdmin) ? (
                          <form onSubmit={handleSaveProfile} className="space-y-5 text-left">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nickname</label>
                                      <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 outline-none text-sm font-bold transition-all" value={editingPlayer.nickname || ''} onChange={e => setEditingPlayer({...editingPlayer, nickname: e.target.value})} />
                                  </div>
                                  <div className="space-y-1 opacity-60">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Auth Email</label>
                                      <div className="p-3 bg-gray-100 rounded-xl text-[10px] text-gray-500 truncate">{editingPlayer.email || 'None'}</div>
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Phone Number (Private)</label>
                                  <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 outline-none text-sm font-bold transition-all" value={editingPlayer.phone || ''} onChange={e => setEditingPlayer({...editingPlayer, phone: e.target.value})} placeholder="09xxxxxxx" />
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
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Birth Date</label>
                                      <input type="date" className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 outline-none font-mono text-xs" value={editingPlayer.dob || ''} onChange={e => setEditingPlayer({...editingPlayer, dob: e.target.value})} />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Joined Date</label>
                                      <input type="date" className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 outline-none font-mono text-xs" value={editingPlayer.joined_at || ''} onChange={e => setEditingPlayer({...editingPlayer, joined_at: e.target.value})} />
                                  </div>
                              </div>
                              <button disabled={saveLoading || uploading} className="w-full py-4 font-bold text-white bg-pl-purple rounded-2xl hover:bg-pl-green hover:text-pl-purple transition-all shadow-xl cursor-pointer uppercase text-xs tracking-widest disabled:opacity-50 mt-4 active:scale-95">Update Official Records</button>
                          </form>
                      ) : (
                          <div className="space-y-8 text-center">
                              <div className="grid grid-cols-2 gap-4 text-left">
                                  {[
                                      { l: 'Preferred Pos', v: editingPlayer.position, icon: '⚽' },
                                      { l: 'Known As', v: editingPlayer.nickname || '-', icon: '🏷️' },
                                      { l: 'Born On', v: editingPlayer.dob ? new Date(editingPlayer.dob).toLocaleDateString() : 'TBD', icon: '🎂' },
                                      { l: 'Active Since', v: editingPlayer.joined_at ? new Date(editingPlayer.joined_at).getFullYear() : '2014', icon: '🗓️' },
                                      { l: 'Height', v: editingPlayer.height ? `${editingPlayer.height}cm` : '-', icon: '📏' },
                                      { l: 'Weight', v: editingPlayer.weight ? `${editingPlayer.weight}kg` : '-', icon: '⚖️' }
                                  ].map((it, i) => (
                                      <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center">
                                          <span className="text-xl mb-1">{it.icon}</span>
                                          <span className="text-[9px] font-bold text-gray-400 block uppercase mb-1">{it.l}</span>
                                          <span className="font-heading font-bold text-lg leading-none">{it.v}</span>
                                      </div>
                                  ))}
                              </div>
                              
                              {user && editingPlayer.phone && (
                                  <div className="bg-pl-purple/5 p-4 rounded-2xl border border-pl-purple/10 flex items-center justify-between">
                                      <div className="text-left">
                                          <span className="text-[9px] font-bold text-gray-400 block uppercase">Contact</span>
                                          <a href={`tel:${editingPlayer.phone}`} className="font-bold text-pl-purple hover:underline">{editingPlayer.phone}</a>
                                      </div>
                                      <div className="bg-pl-green text-pl-purple px-2 py-1 rounded text-[9px] font-bold uppercase">Member Only</div>
                                  </div>
                              )}

                              <button onClick={() => setEditingPlayer(null)} className="w-full py-4 font-bold text-gray-400 bg-gray-100 rounded-2xl hover:bg-gray-100 transition-all cursor-pointer uppercase text-xs tracking-widest active:scale-95">Close Profile</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
