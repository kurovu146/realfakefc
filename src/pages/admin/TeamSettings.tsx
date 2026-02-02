import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function TeamSettings() {
  const [settings, setSettings] = useState({ team_name: '', logo_url: '', banner_url: '', contact_phone: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('*').single();
      if (data) setSettings(data);
    }
    fetchSettings();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'banner') => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileName = `${target}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file);
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (target === 'logo') setSettings(prev => ({ ...prev, logo_url: publicUrl }));
      else setSettings(prev => ({ ...prev, banner_url: publicUrl }));
      
      toast.success(`${target} uploaded! Remember to save.`);
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('site_settings').update(settings).eq('id', 1);
    if (error) toast.error(error.message);
    else toast.success('Settings updated!');
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-50 animate-in fade-in">
        <h3 className="text-xl md:text-2xl font-heading font-bold mb-8 uppercase border-b pb-4">General Team Identity</h3>
        <form onSubmit={saveSettings} className="space-y-8">
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Team Display Name</label>
                <input className="border-2 border-gray-50 p-4 w-full rounded-2xl focus:border-pl-purple bg-gray-50 text-base md:text-lg font-heading font-bold outline-none" value={settings.team_name} onChange={e => setSettings({...settings, team_name: e.target.value})} />
            </div>
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Contact Phone Number</label>
                <input className="border-2 border-gray-50 p-4 w-full rounded-2xl focus:border-pl-purple bg-gray-50 text-base md:text-lg font-mono font-bold outline-none" value={settings.contact_phone} onChange={e => setSettings({...settings, contact_phone: e.target.value})} />
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Official Logo</label>
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-pl-gray/20 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                        {settings.logo_url ? <img src={settings.logo_url} className="w-full h-full object-contain p-4" /> : <span className="text-4xl">⚽</span>}
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><span className="text-white text-[9px] font-bold uppercase">Upload</span><input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'logo')} /></label>
                    </div>
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Main Banner</label>
                    <div className="w-full h-24 md:h-32 rounded-3xl bg-pl-gray/20 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                        {settings.banner_url ? <img src={settings.banner_url} className="w-full h-full object-cover" /> : <span className="text-4xl">🖼️</span>}
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><span className="text-white text-[9px] font-bold uppercase">Upload</span><input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'banner')} /></label>
                    </div>
                </div>
            </div>
            <button disabled={loading} className="w-full bg-pl-purple text-white font-bold py-5 rounded-2xl hover:bg-pl-green hover:text-pl-purple transition-all shadow-xl uppercase text-xs tracking-[0.2em] mt-4 cursor-pointer disabled:opacity-50">{loading ? 'Saving...' : 'Save Team Identity'}</button>
        </form>
    </div>
  );
}
