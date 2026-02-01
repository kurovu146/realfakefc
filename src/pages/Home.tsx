import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, Player } from '@/types/database';
import PlayerCard from '@/components/PlayerCard';
import MatchFixture from '@/components/MatchFixture';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Mail, Quote } from 'lucide-react';

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
  const [settings, setSettings] = useState({ team_name: 'RealFake FC', banner_url: '' });

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
    // 1. Fetch Players & Stats
    const { data: allPlayers } = await supabase.from('players').select('*');
    const { data: allStats } = await supabase.from('match_stats').select('*');

    if (allPlayers && allStats) {
        // 2. Calculate Stats for everyone
        const playersWithStats: PlayerWithStats[] = allPlayers.map(p => {
            const pStats = allStats.filter(s => s.player_id === p.id);
            const goals = pStats.reduce((sum, s) => sum + (s.goals || 0), 0);
            const assists = pStats.reduce((sum, s) => sum + (s.assists || 0), 0);
            const matches = pStats.length;
            return {
                ...p,
                calculatedStats: {
                    goals,
                    assists,
                    matches,
                    contributionPerMatch: matches > 0 ? (goals + assists) / matches : 0
                }
            };
        });

        // 3. Find The Best in Each Category (Avoid duplicates if possible)
        const topScorer = [...playersWithStats].sort((a, b) => b.calculatedStats.goals - a.calculatedStats.goals)[0];
        
        let topAssister = [...playersWithStats]
            .filter(p => p.id !== topScorer?.id)
            .sort((a, b) => b.calculatedStats.assists - a.calculatedStats.assists)[0];
        
        // Fallback: Nếu không tìm được ai khác, lấy người tiếp theo trong list goals
        if (!topAssister) topAssister = [...playersWithStats].filter(p => p.id !== topScorer?.id)[0];

        let ironMan = [...playersWithStats]
            .filter(p => p.id !== topScorer?.id && p.id !== topAssister?.id)
            .sort((a, b) => b.calculatedStats.matches - a.calculatedStats.matches)[0];
        
        if (!ironMan) ironMan = [...playersWithStats].filter(p => p.id !== topScorer?.id && p.id !== topAssister?.id)[0];

        let mvp = [...playersWithStats]
            .filter(p => p.id !== topScorer?.id && p.id !== topAssister?.id && p.id !== ironMan?.id)
            .sort((a, b) => b.calculatedStats.contributionPerMatch - a.calculatedStats.contributionPerMatch)[0];
        
        if (!mvp) mvp = [...playersWithStats].filter(p => p.id !== topScorer?.id && p.id !== topAssister?.id && p.id !== ironMan?.id)[0];

        // Lọc bỏ undefined và set state
        setFeaturedPlayers([topScorer, topAssister, ironMan, mvp].filter(Boolean));
    }

    // Manager/Captain
    const { data: mgr } = await supabase.from('players').select('*').or('position.eq.Manager,number.eq.10').limit(1).maybeSingle();
    if (mgr) setManager(mgr);

  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
        {/* --- HERO SECTION --- */}
        <section className="relative bg-pl-purple text-white overflow-hidden min-h-[600px] flex items-center">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 transition-transform duration-[20s] hover:scale-100" 
            style={{ backgroundImage: `url(${settings.banner_url || 'https://images.unsplash.com/photo-1522778119026-d647f0565c6a?auto=format&fit=crop&q=80&w=2000'})` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-pl-purple via-pl-purple/90 to-transparent"></div>
          
          <div className="container mx-auto px-4 relative z-10 py-20 flex flex-col md:flex-row items-center">
            <div className="md:w-2/3 text-left">
               <span className="inline-flex items-center gap-2 py-1.5 px-4 bg-pl-green text-pl-purple font-bold uppercase text-[10px] tracking-[0.2em] mb-6 rounded-full shadow-lg border border-white/20">
                 <span className="w-2 h-2 bg-pl-purple rounded-full animate-pulse"></span>
                 Official Club Portal
               </span>
               <h1 className="text-6xl md:text-8xl font-heading font-bold uppercase leading-[0.9] mb-8 drop-shadow-2xl">
                 {settings.team_name.split(' ')[0]}<br/>
                 <span className="text-pl-pink">{settings.team_name.split(' ').slice(1).join(' ')}</span>
               </h1>
               <p className="text-xl opacity-80 max-w-xl mb-10 leading-relaxed font-medium">
                 More than just a team. A brotherhood forged on the pitch, united by passion and driven by the beautiful game.
               </p>
               <div className="flex flex-wrap gap-4">
                   <Link to="/players" className="bg-white text-pl-purple font-bold py-4 px-10 rounded-2xl hover:bg-pl-green transition-all uppercase text-xs tracking-widest shadow-xl active:scale-95">
                     Meet The Squad
                   </Link>
                   <Link to="/fixtures" className="bg-pl-purple/40 backdrop-blur-md border border-white/20 text-white font-bold py-4 px-10 rounded-2xl hover:bg-white/10 transition-all uppercase text-xs tracking-widest active:scale-95">
                     Fixtures
                   </Link>
               </div>
            </div>
            
            {nextMatch && (
              <div className="md:w-1/3 mt-16 md:mt-0 w-full animate-in fade-in slide-in-from-right-10 duration-700">
                <Link to={`/fixtures/${nextMatch.id}`} className="block bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2.5rem] hover:bg-white/20 transition-all shadow-2xl group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pl-pink/20 blur-3xl -z-10 rounded-full"></div>
                  <h3 className="text-pl-green text-center mb-8 uppercase font-bold tracking-[0.3em] text-[10px] opacity-80">Next Matchday</h3>
                  <div className="flex justify-between items-center mb-8">
                     <div className="text-center w-1/3 group-hover:scale-110 transition-transform">
                        <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-3 flex items-center justify-center text-pl-purple font-bold text-2xl shadow-xl border-4 border-white/10">RF</div>
                        <span className="font-heading text-lg leading-tight block uppercase tracking-tighter">RealFake</span>
                     </div>
                     <div className="text-4xl font-heading font-bold text-center w-1/3 opacity-40 italic">VS</div>
                     <div className="text-center w-1/3 group-hover:scale-110 transition-transform">
                        <div className="w-20 h-20 bg-white/10 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-2xl overflow-hidden border-4 border-white/10 shadow-xl backdrop-blur-sm">
                          {nextMatch.opponent_logo ? <img src={nextMatch.opponent_logo} alt={nextMatch.opponent} className="w-full h-full object-cover"/> : "??"}
                        </div>
                        <span className="font-heading text-lg leading-tight block uppercase tracking-tighter truncate">{nextMatch.opponent}</span>
                     </div>
                  </div>
                  <div className="text-center bg-pl-purple/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                    <div className="text-3xl font-bold font-heading tabular-nums text-pl-green">{nextMatch.time.substring(0, 5)}</div>
                    <div className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">{new Date(nextMatch.date).toLocaleDateString()}</div>
                    <div className="text-[9px] opacity-40 mt-2 uppercase font-bold flex items-center justify-center gap-1">
                        <MapPin size={10} /> {nextMatch.stadium}
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* --- QUOTE BANNER --- */}
        <section className="bg-pl-green py-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagonal-striped-brick.png')]"></div>
            <div className="container mx-auto px-4 text-center relative z-10">
                <Quote className="w-12 h-12 text-pl-purple mx-auto mb-4 opacity-50" />
                <h2 className="text-2xl md:text-4xl font-heading font-bold text-pl-purple uppercase tracking-tight max-w-3xl mx-auto leading-tight">
                    "It's not about the stars, it's about the bond. We play as one, we win as one."
                </h2>
            </div>
        </section>

        {/* --- ABOUT & HISTORY --- */}
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
                <div className="space-y-6">
                    <h2 className="text-5xl font-heading font-bold text-pl-purple uppercase leading-none">The Formation</h2>
                    <div className="w-20 h-2 bg-pl-pink rounded-full"></div>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        Founded in 2026, <strong className="text-pl-purple">RealFake FC</strong> started as a casual gathering of football enthusiasts. 
                        Over time, the passion grew, and what was once a weekend hobby turned into a committed brotherhood.
                    </p>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        We believe in fair play, dedication, and the joy of the game. Our mission is not just to win trophies, but to build lasting friendships on and off the pitch.
                    </p>
                    <Link to="/players" className="inline-block mt-4 text-pl-purple font-bold uppercase tracking-widest text-sm border-b-2 border-pl-purple pb-1 hover:text-pl-pink hover:border-pl-pink transition-colors">
                        Discover Our History &rsaquo;
                    </Link>
                </div>
                <div className="relative">
                    <div className="absolute top-10 left-10 w-full h-full bg-pl-green/20 rounded-[3rem] -z-10"></div>
                    <img 
                        src={settings.banner_url || 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=1000'} 
                        alt="Team Formation" 
                        className="rounded-[3rem] shadow-2xl w-full object-cover h-[400px]"
                    />
                </div>
            </div>
        </section>

        {/* --- CAPTAIN / MANAGER SPOTLIGHT --- */}
        {manager && (
            <section className="py-20 bg-pl-purple text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-1/2 h-full bg-white/5 skew-x-12 transform origin-top-right"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="md:w-1/3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-pl-pink blur-[60px] opacity-40 rounded-full"></div>
                                <img 
                                    src={manager.image || 'https://via.placeholder.com/400'} 
                                    alt={manager.name} 
                                    className="relative z-10 w-full max-w-sm mx-auto drop-shadow-2xl rounded-b-full border-b-8 border-pl-green"
                                />
                            </div>
                        </div>
                        <div className="md:w-2/3 text-center md:text-left">
                            <span className="text-pl-green font-bold uppercase tracking-[0.3em] text-xs mb-2 block">The Leader</span>
                            <h2 className="text-5xl md:text-7xl font-heading font-bold uppercase mb-6 leading-none">
                                {manager.name}
                            </h2>
                            <p className="text-2xl opacity-80 font-light italic mb-8">
                                "Our strength lies in our unity. Every match is a new chapter in our story."
                            </p>
                            <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-8 max-w-lg mx-auto md:mx-0">
                                <div>
                                    <div className="text-3xl font-heading font-bold text-pl-pink">2026</div>
                                    <div className="text-[10px] uppercase opacity-60 tracking-widest">Since</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-heading font-bold text-pl-green">MGR</div>
                                    <div className="text-[10px] uppercase opacity-60 tracking-widest">Role</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-heading font-bold text-white">VN</div>
                                    <div className="text-[10px] uppercase opacity-60 tracking-widest">Nationality</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        )}

        {/* --- SCHEDULE & INFO HUB --- */}
        <section className="py-24 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Time */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-pl-purple transition-colors group">
                        <div className="w-16 h-16 bg-pl-purple/5 rounded-full flex items-center justify-center mb-6 group-hover:bg-pl-purple group-hover:text-white transition-colors text-pl-purple">
                            <Clock size={32} />
                        </div>
                        <h3 className="text-xl font-heading font-bold text-pl-purple uppercase mb-2">Match Time</h3>
                        <p className="text-gray-500">Every Saturday</p>
                        <p className="text-xl font-bold text-pl-purple mt-1">17:30 - 19:00</p>
                    </div>

                    {/* Location */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-pl-green transition-colors group">
                        <div className="w-16 h-16 bg-pl-green/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-pl-green group-hover:text-pl-purple transition-colors text-pl-green">
                            <MapPin size={32} />
                        </div>
                        <h3 className="text-xl font-heading font-bold text-pl-purple uppercase mb-2">Home Ground</h3>
                        <p className="text-gray-500">Sân Bóng Đá Mỹ Đình</p>
                        <p className="text-sm font-bold text-pl-purple mt-1">Hanoi, Vietnam</p>
                    </div>

                    {/* Contact */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-pl-pink transition-colors group">
                        <div className="w-16 h-16 bg-pl-pink/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-pl-pink group-hover:text-white transition-colors text-pl-pink">
                            <Mail size={32} />
                        </div>
                        <h3 className="text-xl font-heading font-bold text-pl-purple uppercase mb-2">Friendly Match</h3>
                        <p className="text-gray-500">Contact us to schedule</p>
                        <p className="text-lg font-bold text-pl-purple mt-1 cursor-pointer hover:underline">admin@realfakefc.com</p>
                    </div>
                </div>
            </div>
        </section>

        {/* --- LATEST MATCHES (Existing) --- */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
             <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b-2 border-gray-50 pb-6">
               <div>
                   <h2 className="text-5xl font-heading text-pl-purple uppercase leading-none">Recent Results</h2>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 border-l-4 border-pl-pink pl-2">The latest action on the field</p>
               </div>
               <Link to="/fixtures" className="text-pl-pink font-bold hover:text-pl-purple transition-colors flex items-center gap-2 uppercase text-xs tracking-widest mt-4 md:mt-0">
                 All Fixtures <span className="text-2xl leading-none">&rsaquo;</span>
               </Link>
             </div>
             {latestMatches.length > 0 ? (
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {latestMatches.map(match => (
                   <Link key={match.id} to={`/fixtures/${match.id}`} className="block transform hover:-translate-y-1 transition-all">
                      <MatchFixture match={match} />
                   </Link>
                 ))}
               </div>
             ) : (
               <div className="py-20 text-center text-gray-300 italic uppercase tracking-widest font-heading text-xl">Season kick-off pending...</div>
             )}
          </div>
        </section>

        {/* --- SQUAD PREVIEW (Key Players) --- */}
        <section className="py-24 bg-gray-50">
          <div className="container mx-auto px-4">
             <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b-2 border-white pb-6">
               <div>
                   <h2 className="text-5xl font-heading text-pl-purple uppercase leading-none">Key Players</h2>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 border-l-4 border-pl-green pl-2">
                       Top performers of the season
                   </p>
               </div>
               <Link to="/players" className="text-pl-pink font-bold hover:text-pl-purple transition-colors flex items-center gap-2 uppercase text-xs tracking-widest mt-4 md:mt-0">
                 View Full Roster <span className="text-2xl leading-none">&rsaquo;</span>
               </Link>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
               {featuredPlayers.map((player, index) => (
                 <div key={player.id} className="relative pt-4">
                     {index === 0 && <span className="absolute top-0 left-4 z-40 bg-pl-purple text-white text-[9px] font-bold uppercase px-2 py-1 rounded shadow-lg border border-white/20">Top Scorer</span>}
                     {index === 1 && <span className="absolute top-0 left-4 z-40 bg-pl-green text-pl-purple text-[9px] font-bold uppercase px-2 py-1 rounded shadow-lg border border-pl-purple/10">Assist King</span>}
                     {index === 2 && <span className="absolute top-0 left-4 z-40 bg-gray-600 text-white text-[9px] font-bold uppercase px-2 py-1 rounded shadow-lg border border-white/20">Iron Man</span>}
                     {index === 3 && <span className="absolute top-0 left-4 z-40 bg-pl-pink text-white text-[9px] font-bold uppercase px-2 py-1 rounded shadow-lg border border-white/20">MVP Efficiency</span>}
                     <PlayerCard player={player} />
                 </div>
               ))}
             </div>
          </div>
        </section>
    </div>
  );
}
