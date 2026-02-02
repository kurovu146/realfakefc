import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, Player } from '@/types/database';
import PlayerCard from '@/components/PlayerCard';
import MatchFixture from '@/components/MatchFixture';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Phone, Quote } from 'lucide-react';

interface PlayerWithStats extends Player {
    calculatedStats: {
        goals: number;
        assists: number;
        matches: number;
        contributionPerMatch: number;
    }
}

export default function Home() {
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [latestMatches, setLatestMatches] = useState<Match[]>([]);
  const [featuredPlayers, setFeaturedPlayers] = useState<Player[]>([]);
  const [manager, setManager] = useState<Player | null>(null);
  const [settings, setSettings] = useState({ team_name: 'RealFake FC', banner_url: '', logo_url: '', contact_phone: '0987654321' });

  const fetchData = useCallback(async () => {
    // Settings
    const { data: s } = await supabase.from('site_settings').select('*').single();
    if (s) setSettings(s);

    // Next Match
    const { data: upcoming } = await supabase.from('matches').select('*').eq('status', 'Upcoming').order('date', { ascending: true }).limit(1).single();
    if (upcoming) setNextMatch(upcoming);

    // Latest Matches
    const { data: latest } = await supabase.from('matches').select('*').in('status', ['Finished', 'Live']).order('date', { ascending: false }).limit(3);
    if (latest) setLatestMatches(latest);

    // --- KEY PLAYERS LOGIC ---
    const { data: allPlayers } = await supabase.from('players').select('*');
    const { data: allStats } = await supabase.from('match_stats').select('*');

    if (allPlayers && allStats) {
        const playersWithStats: PlayerWithStats[] = allPlayers.map(p => {
            const pStats = allStats.filter(s => s.player_id === p.id);
            const goals = pStats.reduce((sum, s) => sum + (s.goals || 0), 0);
            const assists = pStats.reduce((sum, s) => sum + (s.assists || 0), 0);
            const matches = pStats.length;
            return {
                ...p,
                calculatedStats: { goals, assists, matches, contributionPerMatch: matches > 0 ? (goals + assists) / matches : 0 }
            };
        });

        const topScorer = [...playersWithStats].sort((a, b) => b.calculatedStats.goals - a.calculatedStats.goals)[0];
        let topAssister = [...playersWithStats].filter(p => p.id !== topScorer?.id).sort((a, b) => b.calculatedStats.assists - a.calculatedStats.assists)[0];
        if (!topAssister) topAssister = [...playersWithStats].filter(p => p.id !== topScorer?.id)[0];
        let ironMan = [...playersWithStats].filter(p => p.id !== topScorer?.id && p.id !== topAssister?.id).sort((a, b) => b.calculatedStats.matches - a.calculatedStats.matches)[0];
        if (!ironMan) ironMan = [...playersWithStats].filter(p => p.id !== topScorer?.id && p.id !== topAssister?.id)[0];
        let mvp = [...playersWithStats].filter(p => p.id !== topScorer?.id && p.id !== topAssister?.id && p.id !== ironMan?.id).sort((a, b) => b.calculatedStats.contributionPerMatch - a.calculatedStats.contributionPerMatch)[0];
        if (!mvp) mvp = [...playersWithStats].filter(p => p.id !== topScorer?.id && p.id !== topAssister?.id && p.id !== ironMan?.id)[0];

        setFeaturedPlayers([topScorer, topAssister, ironMan, mvp].filter(Boolean));
    }

    const { data: mgr } = await supabase.from('players').select('*').or('position.eq.Manager,number.eq.10').limit(1).maybeSingle();
    if (mgr) setManager(mgr);

  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="overflow-x-hidden">
        {/* --- HERO SECTION --- */}
        <section className="relative bg-pl-purple text-white overflow-hidden min-h-[500px] md:min-h-[600px] flex items-center">
          <div className="absolute inset-0 bg-cover bg-center opacity-30 scale-105" style={{ backgroundImage: `url(${settings.banner_url || 'https://images.unsplash.com/photo-1522778119026-d647f0565c6a?auto=format&fit=crop&q=80&w=2000'})` }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-pl-purple via-pl-purple/90 to-transparent"></div>
          
          <div className="container mx-auto px-4 relative z-10 py-12 md:py-20 flex flex-col md:flex-row items-center">
            <div className="md:w-2/3 text-left w-full">
               <span className="inline-flex items-center gap-2 py-1 px-3 bg-pl-green text-pl-purple font-bold uppercase text-[9px] tracking-[0.2em] mb-4 rounded-full border border-white/20">Official Portal</span>
               <h1 className="text-4xl md:text-8xl font-heading font-bold uppercase leading-tight md:leading-[0.9] mb-6 drop-shadow-xl tracking-tight">
                 {settings.team_name.split(' ')[0]}<br/>
                 <span className="text-pl-pink">{settings.team_name.split(' ').slice(1).join(' ')}</span>
               </h1>
               <p className="text-base md:text-xl opacity-80 max-w-xl mb-8 leading-relaxed font-medium">Since 2014. A brotherhood forged on the pitch, united by passion.</p>
               <div className="flex flex-wrap gap-3">
                   <Link to="/players" className="bg-white text-pl-purple font-bold py-3 px-8 rounded-xl hover:bg-pl-green transition-all uppercase text-[10px] md:text-xs tracking-widest shadow-xl active:scale-95">The Squad</Link>
                   <Link to="/fixtures" className="bg-pl-purple/40 backdrop-blur-md border border-white/20 text-white font-bold py-3 px-8 rounded-xl hover:bg-white/10 transition-all uppercase text-[10px] md:text-xs tracking-widest active:scale-95">Fixtures</Link>
               </div>
            </div>
            
            {nextMatch && (
              <div className="md:w-1/3 mt-12 md:mt-0 w-full animate-in fade-in duration-700">
                <Link to={`/fixtures/${nextMatch.id}`} className="block bg-white/10 backdrop-blur-xl border border-white/20 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] hover:bg-white/20 transition-all shadow-2xl group relative overflow-hidden">
                  <h3 className="text-pl-green text-center mb-6 uppercase font-bold tracking-[0.3em] text-[9px] opacity-80">Next Matchday</h3>
                  <div className="flex justify-between items-center mb-6">
                     <div className="text-center w-1/3 group-hover:scale-110 transition-transform">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl mx-auto mb-3 flex items-center justify-center text-pl-purple font-bold text-2xl shadow-xl border-4 border-white/10 overflow-hidden">
                            {settings.logo_url ? <img src={settings.logo_url} className="w-full h-full object-cover" /> : 'RF'}
                        </div>
                        <span className="font-heading text-lg leading-tight block uppercase tracking-tighter">RealFake</span>
                     </div>
                     <div className="text-2xl md:text-4xl font-heading font-bold text-center w-1/3 opacity-40 italic">VS</div>
                     <div className="text-center w-1/3">
                        <div className="w-14 h-14 md:w-20 md:h-20 bg-white/10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl md:text-2xl overflow-hidden border-2 md:border-4 border-white/10 shadow-xl backdrop-blur-sm">
                          {nextMatch.opponent_logo ? <img src={nextMatch.opponent_logo} alt={nextMatch.opponent} className="w-full h-full object-cover"/> : "??"}
                        </div>
                        <span className="font-heading text-sm md:text-lg leading-tight block uppercase tracking-tighter truncate">{nextMatch.opponent}</span>
                     </div>
                  </div>
                  <div className="text-center bg-pl-purple/40 p-3 rounded-xl border border-white/5 shadow-inner text-white">
                    <div className="text-2xl md:text-3xl font-bold font-heading tabular-nums text-pl-green">{nextMatch.time.substring(0, 5)}</div>
                    <div className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-1">{new Date(nextMatch.date).toLocaleDateString()}</div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* --- QUOTE BANNER --- */}
        <section className="bg-pl-green py-8 relative overflow-hidden">
            <div className="container mx-auto px-4 text-left md:text-center relative z-10 w-full text-pl-purple">
                <Quote className="w-8 h-8 md:w-12 md:h-12 mb-3 opacity-50 md:mx-auto" />
                <h2 className="text-lg md:text-4xl font-heading font-bold uppercase tracking-tight max-w-3xl md:mx-auto leading-tight">"It's not about the stars, it's about the bond. We play as one, we win as one."</h2>
            </div>
        </section>

        {/* --- ABOUT --- */}
        <section className="py-16 md:py-24 bg-white text-pl-purple">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
                <div className="space-y-4 text-left w-full">
                    <h2 className="text-3xl md:text-5xl font-heading font-bold uppercase leading-none">The Formation</h2>
                    <div className="w-12 h-1.5 bg-pl-pink rounded-full"></div>
                    <p className="text-sm md:text-lg text-gray-600 leading-relaxed">Founded in <strong className="font-bold">2014</strong>, RealFake FC started as a casual gathering of football enthusiasts. Over a decade, the passion grew into a committed brotherhood.</p>
                    <p className="text-sm md:text-lg text-gray-600 leading-relaxed">We believe in fair play and the joy of the game. After 10 years, our core values remain unchanged.</p>
                </div>
                <div className="relative w-full">
                    <img src={settings.banner_url || 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=1000'} alt="Team Formation" className="rounded-2xl md:rounded-[3rem] shadow-xl w-full object-cover h-[250px] md:h-[400px]" />
                </div>
            </div>
        </section>

        {/* --- LEADER --- */}
        {manager && (
            <section className="py-16 md:py-20 bg-pl-purple text-white relative overflow-hidden">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                        <div className="md:w-1/3 w-full max-w-[250px] md:max-w-none">
                            <div className="relative mx-auto md:mx-0">
                                <div className="absolute inset-0 bg-pl-pink blur-[40px] md:blur-[60px] opacity-40 rounded-full"></div>
                                <img src={manager.image || 'https://via.placeholder.com/400'} alt={manager.name} className="relative z-10 w-full drop-shadow-2xl rounded-b-full border-b-4 md:border-b-8 border-pl-green" />
                            </div>
                        </div>
                        <div className="md:w-2/3 text-left w-full">
                            <span className="text-pl-green font-bold uppercase tracking-widest text-[9px] mb-2 block">The Leader</span>
                            <h2 className="text-4xl md:text-7xl font-heading font-bold uppercase mb-4 md:mb-6 leading-none tracking-tight">{manager.name}</h2>
                            <p className="text-lg md:text-2xl opacity-80 font-light italic mb-6">"Our strength lies in our unity."</p>
                            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 max-w-sm">
                                <div><div className="text-xl md:text-3xl font-heading font-bold text-pl-pink">2014</div><div className="text-[8px] uppercase opacity-60 tracking-widest font-bold">Since</div></div>
                                <div><div className="text-xl md:text-3xl font-heading font-bold text-pl-green">MGR</div><div className="text-[8px] uppercase opacity-60 tracking-widest font-bold">Role</div></div>
                                <div><div className="text-xl md:text-3xl font-heading font-bold text-white">VN</div><div className="text-[8px] uppercase opacity-60 tracking-widest font-bold">NAT</div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        )}

        {/* --- INFO HUB --- */}
        <section className="py-16 md:py-24 bg-gray-50 text-pl-purple">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center md:flex-col md:text-center gap-4 hover:border-pl-purple transition-all group">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-pl-purple/5 rounded-xl flex items-center justify-center group-hover:bg-pl-purple group-hover:text-white transition-all text-pl-purple shrink-0"><Clock size={24} /></div>
                        <div>
                            <h3 className="text-sm md:text-xl font-heading font-bold uppercase md:mb-2 leading-none">Match Time</h3>
                            <p className="text-[10px] md:text-base text-gray-500 font-bold uppercase tracking-widest md:tracking-normal">Wednesday 20:45</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center md:flex-col md:text-center gap-4 hover:border-pl-green transition-all group">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-pl-green/10 rounded-xl flex items-center justify-center group-hover:bg-pl-green group-hover:text-pl-purple transition-all text-pl-green shrink-0"><MapPin size={24} /></div>
                        <div>
                            <h3 className="text-sm md:text-xl font-heading font-bold uppercase md:mb-2 leading-none">Home Ground</h3>
                            <p className="text-[10px] md:text-base text-gray-500 font-bold uppercase tracking-widest md:tracking-normal">La Thanh Field</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center md:flex-col md:text-center gap-4 hover:border-pl-pink transition-all group">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-pl-pink/10 rounded-xl flex items-center justify-center group-hover:bg-pl-pink group-hover:text-white transition-all text-pl-pink shrink-0"><Phone size={24} /></div>
                        <div>
                            <h3 className="text-sm md:text-xl font-heading font-bold uppercase md:mb-2 leading-none">Booking</h3>
                            <a href={`tel:${settings.contact_phone}`} className="text-sm md:text-lg font-bold hover:underline tabular-nums leading-none block">{settings.contact_phone}</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- RESULTS --- */}
        <section className="py-16 md:py-24 bg-white text-pl-purple">
          <div className="container mx-auto px-4 text-left">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b-2 border-gray-50 pb-4 gap-2 w-full">
               <div className="text-left">
                   <h2 className="text-3xl md:text-5xl font-heading font-bold uppercase leading-none tracking-tight">Recent Results</h2>
                   <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 border-l-4 border-pl-pink pl-2">Matchday Reports</p>
               </div>
               <Link to="/fixtures" className="text-pl-pink font-bold hover:text-pl-purple transition-all flex items-center gap-1 uppercase text-[10px] tracking-widest cursor-pointer">All Fixtures &rsaquo;</Link>
             </div>
             {latestMatches.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                 {latestMatches.map(match => (
                   <Link key={match.id} to={`/fixtures/${match.id}`} className="block transform hover:scale-[1.02] transition-all h-full cursor-pointer"><MatchFixture match={match} /></Link>
                 ))}
               </div>
             ) : (
               <div className="py-10 text-center text-gray-300 italic uppercase text-sm tracking-widest font-heading font-bold">No results found</div>
             )}
          </div>
        </section>

        {/* --- SQUAD --- */}
        <section className="py-16 md:py-24 bg-gray-50 text-pl-purple">
          <div className="container mx-auto px-4 text-left">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b-2 border-white pb-4 gap-2 w-full">
               <div className="text-left">
                   <h2 className="text-3xl md:text-5xl font-heading font-bold uppercase leading-none tracking-tight">Key Players</h2>
                   <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 border-l-4 border-pl-green pl-2">Top performers</p>
               </div>
               <Link to="/players" className="text-pl-pink font-bold hover:text-pl-purple transition-all flex items-center gap-1 uppercase text-[10px] tracking-widest cursor-pointer">Full Roster &rsaquo;</Link>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
               {featuredPlayers.map((player, index) => (
                 <div key={player.id} className="relative pt-4 cursor-pointer">
                     {index === 0 && <span className="absolute top-0 left-4 z-40 bg-pl-purple text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded shadow-lg border border-white/20">Top Scorer</span>}
                     {index === 1 && <span className="absolute top-0 left-4 z-40 bg-pl-green text-pl-purple text-[8px] font-bold uppercase px-2 py-0.5 rounded shadow-lg border border-pl-purple/10">Assist King</span>}
                     {index === 2 && <span className="absolute top-0 left-4 z-40 bg-gray-600 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded shadow-lg border border-white/20">Iron Man</span>}
                     {index === 3 && <span className="absolute top-0 left-4 z-40 bg-pl-pink text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded shadow-lg border border-white/20">MVP Efficiency</span>}
                     <PlayerCard player={player} />
                 </div>
               ))}
             </div>
          </div>
        </section>
    </div>
  );
}