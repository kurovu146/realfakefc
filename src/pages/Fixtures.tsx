import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match } from '@/types/database';
import MatchFixture from '@/components/MatchFixture';
import { Link } from 'react-router-dom';

export default function Fixtures() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [season, setSeason] = useState<number>(2026);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select('*, match_votes(*, player:players(*))')
      .eq('season', season);
    
    if (data) {
        // Sắp xếp logic phức tạp trong JS
        const sorted = data.sort((a, b) => {
            // Nếu cả 2 đều Upcoming -> Gần nhất lên đầu (Ascending by date)
            if (a.status === 'Upcoming' && b.status === 'Upcoming') {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            }
            // Nếu a Upcoming, b Finished -> a lên đầu
            if (a.status === 'Upcoming' && b.status !== 'Upcoming') return -1;
            if (a.status !== 'Upcoming' && b.status === 'Upcoming') return 1;
            
            // Nếu cả 2 đều đã đấu xong -> Mới nhất lên đầu (Descending by date)
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setMatches(sorted);
    }
    setLoading(false);
  }, [season]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return (
    <div className="bg-gray-50 min-h-screen py-10 pb-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-6xl font-heading text-pl-purple uppercase leading-none">Fixtures & Results</h1>
            <p className="text-gray-400 mt-2 font-bold uppercase tracking-widest text-sm underline decoration-pl-green decoration-4">The Road to Glory</p>
          </div>
          <select 
            value={season} 
            onChange={(e) => setSeason(Number(e.target.value))}
            className="border-2 border-pl-gray rounded p-2 font-heading font-bold text-pl-purple cursor-pointer bg-white"
          >
            <option value={2026}>Season 2026</option>
            <option value={2025}>Season 2025</option>
          </select>
        </div>

        {loading ? (
            <div className="text-center py-20 animate-pulse font-heading text-2xl text-gray-400 uppercase">Preparing Matchday...</div>
        ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {matches.length > 0 ? (
                  <>
                    {/* UPCOMING SECTION HEADER */}
                    {matches.some(m => m.status === 'Upcoming') && (
                        <h2 className="text-xl font-bold uppercase text-pl-pink border-l-4 border-pl-pink pl-3 mb-4">Upcoming Matches</h2>
                    )}
                    
                    {matches.map(match => (
                        <Link key={match.id} to={`/fixtures/${match.id}`} className="block transition-transform hover:scale-[1.01]">
                            <MatchFixture match={match} />
                        </Link>
                    ))}
                  </>
              ) : (
                 <div className="text-center bg-white p-20 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-heading text-2xl uppercase italic">No data found for this season.</p>
                 </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
}
