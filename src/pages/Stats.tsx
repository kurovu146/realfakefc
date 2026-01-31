import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Player, Match, MatchStat } from '@/types/database';

interface PlayerStats extends Player {
  stats: {
    goals: number;
    assists: number;
    matches: number;
    motm: number;
    own_goals: number;
  }
}

interface TeamSummary {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export default function Stats() {
  const [season, setSeason] = useState<number>(2026);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary>({ played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
  const [loading, setLoading] = useState(true);

  const calculateStats = useCallback(async () => {
      setLoading(true);
      
      // 1. Lấy tất cả trận đấu của mùa giải để tính thành tích đội
      const { data: seasonMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('season', season)
        .eq('status', 'Finished');

      // 2. Lấy tất cả cầu thủ
      const { data: players } = await supabase.from('players').select('*');
      
      // 3. Lấy tất cả stats của các trận trong mùa giải này
      let matchIds: number[] = [];
      if (seasonMatches && seasonMatches.length > 0) {
          matchIds = seasonMatches.map(m => m.id);
      }

      const { data: matchStats } = await supabase
        .from('match_stats')
        .select('*')
        .in('match_id', matchIds);

      // --- TÍNH TOÁN THÀNH TÍCH ĐỘI ---
      const summary: TeamSummary = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
      if (seasonMatches) {
          seasonMatches.forEach(m => {
              summary.played++;
              summary.gf += m.home_score || 0;
              summary.ga += m.away_score || 0;
              
              if (m.home_score > m.away_score) {
                  summary.won++;
                  summary.points += 3;
              } else if (m.home_score === m.away_score) {
                  summary.drawn++;
                  summary.points += 1;
              } else {
                  summary.lost++;
              }
          });
      }
      setTeamSummary(summary);

      // --- TÍNH TOÁN THỐNG KÊ CẦU THỦ ---
      if (players) {
          const aggregated = players.map(player => {
            const pStats = matchStats ? matchStats.filter(s => s.player_id === player.id) : [];
            return {
              ...player,
              stats: {
                goals: pStats.reduce((sum, s) => sum + (s.goals || 0), 0),
                assists: pStats.reduce((sum, s) => sum + (s.assists || 0), 0),
                own_goals: pStats.reduce((sum, s) => sum + (s.own_goals || 0), 0),
                matches: pStats.length,
                motm: pStats.filter(s => s.is_motm).length,
              }
            };
          });
          setPlayerStats(aggregated.sort((a, b) => b.stats.goals - a.stats.goals));
      }
      setLoading(false);
  }, [season]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  return (
    <div className="bg-pl-purple min-h-screen py-10 text-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <div>
                <h1 className="text-6xl font-heading text-pl-green uppercase leading-none">League Stats</h1>
                <p className="text-pl-gray/60 mt-2 font-bold uppercase tracking-widest text-sm">RealFake FC • Season {season}</p>
            </div>
            <select 
                value={season} 
                onChange={(e) => setSeason(Number(e.target.value))}
                className="bg-white/10 border-2 border-white/20 rounded p-3 font-heading font-bold text-pl-green outline-none cursor-pointer"
            >
                <option value={2026} className="bg-pl-purple text-white">Season 2026</option>
                <option value={2025} className="bg-pl-purple text-white">Season 2025</option>
            </select>
        </div>

        {/* TEAM SUMMARY BANNER */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-12">
            {[
                { label: 'Played', value: teamSummary.played, color: 'bg-white/5' },
                { label: 'Won', value: teamSummary.won, color: 'bg-green-500/20' },
                { label: 'Drawn', value: teamSummary.drawn, color: 'bg-blue-500/20' },
                { label: 'Lost', value: teamSummary.lost, color: 'bg-red-500/20' },
                { label: 'GF', value: teamSummary.gf, color: 'bg-white/5' },
                { label: 'GA', value: teamSummary.ga, color: 'bg-white/5' },
                { label: 'Points', value: teamSummary.points, color: 'bg-pl-pink text-white shadow-lg' },
            ].map((stat, i) => (
                <div key={i} className={`${stat.color} p-4 rounded-xl border border-white/10 text-center flex flex-col justify-center`}>
                    <span className="text-[10px] font-bold uppercase opacity-60 mb-1">{stat.label}</span>
                    <span className="text-3xl font-heading font-bold">{stat.value}</span>
                </div>
            ))}
        </div>

        {loading ? (
            <div className="text-center py-20 animate-pulse">Analyzing season data...</div>
        ) : (
            <div className="bg-white text-pl-purple rounded-xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b-2 border-pl-green font-heading text-lg uppercase">
                    <tr>
                        <th className="p-4">Rank</th>
                        <th className="p-4">Player</th>
                        <th className="p-4 text-center">Played</th>
                        <th className="p-4 text-center">Goals</th>
                        <th className="p-4 text-center">Assists</th>
                        <th className="p-4 text-center">MOTM</th>
                        <th className="p-4 text-center">OG</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {playerStats.filter(p => p.stats.matches > 0 || p.stats.goals > 0).map((player, index) => (
                        <tr key={player.id} className="hover:bg-pl-green/5 transition-colors group">
                        <td className="p-4 font-bold text-gray-400 group-hover:text-pl-purple">{index + 1}</td>
                        <td className="p-4">
                            <div className="flex items-center gap-3">
                                <img src={player.image} className="w-10 h-10 rounded-full object-cover bg-gray-200 border-2 border-transparent group-hover:border-pl-green" alt={player.name} />
                                <div className="flex flex-col">
                                    <span className="font-bold leading-none">{player.name}</span>
                                    <span className="text-[10px] uppercase text-gray-400">{player.position}</span>
                                </div>
                            </div>
                        </td>
                        <td className="p-4 text-center font-mono">{player.stats.matches}</td>
                        <td className="p-4 text-center font-bold font-mono text-2xl text-pl-purple">{player.stats.goals}</td>
                        <td className="p-4 text-center font-mono">{player.stats.assists}</td>
                        <td className="p-4 text-center">
                            {player.stats.motm > 0 ? (
                            <span className="bg-pl-pink text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                                {player.stats.motm} 🏆
                            </span>
                            ) : '-'}
                        </td>
                        <td className="p-4 text-center text-xs text-red-400 font-bold">{player.stats.own_goals || '-'}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
              </div>
              {playerStats.filter(p => p.stats.matches > 0).length === 0 && (
                  <div className="p-10 text-center text-gray-400 italic">No stats recorded for this season yet.</div>
              )}
            </div>
        )}
      </div>
    </div>
  );
}
