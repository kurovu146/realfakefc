import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Player } from '@/types/database';
import { toast } from 'sonner';

interface ManageSquadProps {
  players: Player[];
  onRefresh: () => void;
  onDeleteRequest: (id: number) => void;
}

export default function ManageSquad({ players, onRefresh, onDeleteRequest }: ManageSquadProps) {
  const [editingPlayer, setEditingPlayer] = useState<Partial<Player>>({});
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleEdit = (p: Player) => {
    setEditingPlayer(p);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileName = `player-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setEditingPlayer(prev => ({ ...prev, image: data.publicUrl }));
      toast.success('Avatar uploaded');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const savePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !editingPlayer.id;
    const { error } = isNew 
      ? await supabase.from('players').insert(editingPlayer)
      : await supabase.from('players').update(editingPlayer).eq('id', editingPlayer.id);

    if (error) toast.error(error.message);
    else {
      toast.success(isNew ? 'Player added' : 'Player updated');
      setEditingPlayer({});
      setShowForm(false);
      onRefresh();
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start">
       <div className="lg:col-span-4 h-fit lg:sticky lg:top-24 space-y-4">
         <button onClick={() => { setShowForm(!showForm); setEditingPlayer({}); }} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-md transition-all cursor-pointer ${showForm ? 'bg-gray-100 text-gray-500' : 'bg-pl-green text-pl-purple hover:bg-white'}`}>
           {showForm ? 'Cancel Action' : '+ Add New Player'}
         </button>
         {showForm && (
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
                  <label className="bg-white border border-gray-200 text-[10px] font-bold py-2 px-3 rounded-lg hover:border-pl-purple transition-all cursor-pointer uppercase tracking-tight">Upload<input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} /></label>
               </div>
               <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs outline-none" placeholder="Email" value={editingPlayer.email || ''} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} />
               <input className="border-2 border-gray-50 p-3 w-full rounded-xl focus:border-pl-purple bg-gray-50 text-xs font-bold outline-none" placeholder="Nickname" value={editingPlayer.nickname || ''} onChange={e => setEditingPlayer({...editingPlayer, nickname: e.target.value})} />
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                     <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Date of Birth</label>
                     <input type="date" className="border-2 border-gray-50 p-3 w-full rounded-xl bg-gray-50 text-[10px]" value={editingPlayer.dob || ''} onChange={e => setEditingPlayer({...editingPlayer, dob: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                     <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Joined Team</label>
                     <input type="date" className="border-2 border-gray-50 p-3 w-full rounded-xl bg-gray-50 text-[10px]" value={editingPlayer.joined_at || ''} onChange={e => setEditingPlayer({...editingPlayer, joined_at: e.target.value})} />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3"><input className="border-2 border-gray-50 p-3 w-full rounded-xl bg-gray-50 text-xs" type="number" placeholder="Height (cm)" value={editingPlayer.height || ''} onChange={e => setEditingPlayer({...editingPlayer, height: Number(e.target.value)})} /><input className="border-2 border-gray-50 p-3 w-full rounded-xl bg-gray-50 text-xs" type="number" placeholder="Weight (kg)" value={editingPlayer.weight || ''} onChange={e => setEditingPlayer({...editingPlayer, weight: Number(e.target.value)})} /></div>
               <div className="flex gap-2 mt-6 pt-6 border-t border-gray-50">
                 <button className="bg-pl-green text-pl-purple font-bold py-4 px-4 rounded-2xl w-full hover:bg-green-400 cursor-pointer shadow-lg uppercase text-[10px] tracking-[0.2em]">Commit</button>
               </div>
             </form>
           </div>
         )}
       </div>
       <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-gray-50 overflow-hidden">
          <div className="hidden md:block overflow-x-auto"><table className="w-full text-left"><thead className="bg-pl-purple text-white font-heading uppercase text-[10px] tracking-widest"><tr><th className="p-5">#</th><th className="p-5">Visual</th><th className="p-5">Information</th><th className="p-5 text-right">Operations</th></tr></thead><tbody className="divide-y divide-gray-50">{players.map(p => (<tr key={p.id} className="hover:bg-gray-50/50 group"><td className="p-5 font-heading text-2xl text-gray-200 group-hover:text-pl-pink tabular-nums">{p.number}</td><td className="p-5"><img src={p.image} className="w-12 h-12 rounded-2xl bg-gray-100 object-cover shadow-sm border-2 border-white" /></td><td className="p-5"><div className="font-bold text-pl-purple">{p.name}</div><div className="text-[9px] font-bold text-gray-400 uppercase">{p.position}</div></td><td className="p-5 text-right space-x-2"><button onClick={() => handleEdit(p)} className="text-white font-bold text-[9px] bg-pl-purple px-3 py-2 rounded-lg hover:bg-pl-pink cursor-pointer uppercase">Edit</button><button onClick={() => onDeleteRequest(p.id)} className="text-red-600 font-bold text-[9px] bg-red-50 px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white cursor-pointer uppercase tracking-tighter">Purge</button></td></tr>))}</tbody></table></div>
          <div className="md:hidden p-4 space-y-4">{players.map(p => (<div key={p.id} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100"><div className="flex items-center gap-4"><img src={p.image} className="w-12 h-12 rounded-2xl bg-gray-100 object-cover shadow-sm" /><div><div className="font-bold text-pl-purple text-sm">{p.name}</div><div className="text-[10px] font-bold text-gray-400 uppercase">#{p.number} • {p.position}</div></div></div><div className="flex flex-col gap-2"><button onClick={() => handleEdit(p)} className="text-white font-bold text-[9px] bg-pl-purple px-3 py-1.5 rounded-lg">EDIT</button><button onClick={() => onDeleteRequest(p.id)} className="text-red-600 font-bold text-[9px] bg-red-100 px-3 py-1.5 rounded-lg">DEL</button></div></div>))}</div>
       </div>
    </div>
  );
}
