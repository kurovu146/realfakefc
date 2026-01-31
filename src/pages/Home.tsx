import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, Player } from '@/types/database';
import PlayerCard from '@/components/PlayerCard';
import MatchFixture from '@/components/MatchFixture';
import { Link } from 'react-router-dom';

export default function Home() {
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [latestMatches, setLatestMatches] = useState<Match[]>([]);
  const [featuredPlayers, setFeaturedPlayers] = useState<Player[]>([]);

  useEffect(() => {
    async function fetchData() {
      // Fetch Next Match
      const { data: upcoming } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'Upcoming')
        .order('date', { ascending: true })
        .limit(1)
        .single();
      
      if (upcoming) setNextMatch(upcoming);

      // Fetch Latest Matches
      const { data: latest } = await supabase
        .from('matches')
        .select('*')
        .in('status', ['Finished', 'Live'])
        .order('date', { ascending: false })
        .limit(3);
        
      if (latest) setLatestMatches(latest);

      // Fetch Random Players
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .limit(4);
        
      if (players) setFeaturedPlayers(players);
    }

    fetchData();
  }, []);

  return (
    <div>
       {/* Hero Section */}
        <section className="relative bg-pl-purple text-white overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://resources.premierleague.com/premierleague/photo/2023/05/22/a3a6064f-c0c2-48a0-9831-50e300109968/Man-City-Champions-Trophy-Lift.jpg')] bg-cover bg-center opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-pl-purple via-pl-purple/80 to-transparent"></div>
          
          <div className="container mx-auto px-4 py-20 relative z-10 flex flex-col md:flex-row items-center">
            <div className="md:w-2/3">
               <span className="inline-block py-1 px-3 bg-pl-green text-pl-purple font-bold uppercase text-sm tracking-wider mb-4 rounded-sm">
                 Club News
               </span>
               <h1 className="text-5xl md:text-7xl font-heading font-bold uppercase leading-tight mb-6">
                 RealFake FC:<br/>
                 <span className="text-pl-pink">Champions of Nothing</span>
               </h1>
               <p className="text-xl opacity-90 max-w-xl mb-8">
                 Experience the thrill of hypothetical football with the world's premier imaginary club. 
               </p>
               <Link to="/players" className="inline-block bg-white text-pl-purple font-bold py-3 px-8 rounded-full hover:bg-pl-green transition-colors uppercase tracking-wide">
                 Meet the Squad
               </Link>
            </div>
            
            {/* Next Match Widget */}
            {nextMatch && (
              <div className="md:w-1/3 mt-10 md:mt-0 w-full">
                <Link to={`/fixtures/${nextMatch.id}`} className="block bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl hover:bg-white/20 transition-colors">
                  <h3 className="text-pl-green text-center mb-4 uppercase font-bold">Next Match</h3>
                  <div className="flex justify-between items-center mb-6">
                     <div className="text-center w-1/3">
                        <div className="w-16 h-16 bg-white rounded-full mx-auto mb-2 flex items-center justify-center text-pl-purple font-bold border-2 border-pl-purple">RF</div>
                        <span className="font-heading text-lg leading-tight block">RealFake</span>
                     </div>
                     <div className="text-3xl font-heading font-bold text-center w-1/3">VS</div>
                     <div className="text-center w-1/3">
                        <div className="w-16 h-16 bg-white/80 rounded-full mx-auto mb-2 flex items-center justify-center text-pl-purple font-bold overflow-hidden">
                          {nextMatch.opponent_logo ? <img src={nextMatch.opponent_logo} alt={nextMatch.opponent} className="w-full h-full object-cover"/> : "??"}
                        </div>
                        <span className="font-heading text-lg leading-tight block">{nextMatch.opponent}</span>
                     </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold font-heading">{nextMatch.time.substring(0, 5)}</div>
                    <div className="text-sm opacity-70">{new Date(nextMatch.date).toLocaleDateString()}</div>
                    <div className="text-xs opacity-50 mt-1 uppercase">{nextMatch.stadium}</div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Latest Fixtures */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
             <div className="flex justify-between items-end mb-8 border-b-2 border-gray-100 pb-4">
               <h2 className="text-4xl text-pl-purple">Latest Matches</h2>
               <Link to="/fixtures" className="text-pl-pink font-bold hover:underline flex items-center gap-1">
                 View All <span className="text-xl">&rsaquo;</span>
               </Link>
             </div>
             {latestMatches.length > 0 ? (
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {latestMatches.map(match => (
                   <Link key={match.id} to={`/fixtures/${match.id}`}>
                      <MatchFixture match={match} />
                   </Link>
                 ))}
               </div>
             ) : (
               <p className="text-gray-500 italic">No matches played yet.</p>
             )}
          </div>
        </section>

        {/* Squad Preview */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
             <div className="flex justify-between items-end mb-8">
               <h2 className="text-4xl text-pl-purple">Squad Preview</h2>
               <Link to="/players" className="text-pl-pink font-bold hover:underline flex items-center gap-1">
                 View Full Squad <span className="text-xl">&rsaquo;</span>
               </Link>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
               {featuredPlayers.map(player => (
                 <PlayerCard key={player.id} player={player} />
               ))}
             </div>
          </div>
        </section>
    </div>
  );
}