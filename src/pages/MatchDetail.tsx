import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Match, MatchVote, MatchStat, Player } from '@/types/database';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function MatchDetail() {
  const { id } = useParams();
  const { user, isWhitelisted } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<MatchStat[]>([]);
  const [votes, setVotes] = useState<MatchVote[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Form State
  const [isGoing, setIsGoing] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMatchData = useCallback(async (matchId: string) => {
    const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single();
    if (matchData) setMatch(matchData);

    const { data: voteData } = await supabase
        .from('match_votes')
        .select('*, player:players(*)')
        .eq('match_id', matchId);
    if (voteData) setVotes(voteData);

    const { data: statData } = await supabase.from('match_stats').select('*, player:players(*)').eq('match_id', matchId);
    if (statData) setStats(statData);
  }, []);

  const fetchPlayers = useCallback(async () => {
     const { data } = await supabase.from('players').select('*').order('name');
     if (data) setPlayers(data);
  }, []);

  useEffect(() => {
    if (id) {
        fetchMatchData(id);
        fetchPlayers();
    }
  }, [id, fetchMatchData, fetchPlayers]);

  const myPlayerProfile = useMemo(() => {
      return players.find(p => p.email === user?.email);
  }, [players, user]);

  useEffect(() => {
      if (myPlayerProfile && votes.length > 0) {
          const myVote = votes.find(v => v.player_id === myPlayerProfile.id);
          if (myVote) setIsGoing(myVote.is_going);
      }
  }, [myPlayerProfile, votes]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel('match_votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_votes', filter: `match_id=eq.${id}` }, 
        () => fetchMatchData(id)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchMatchData]);

  async function handleVote(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isWhitelisted || !myPlayerProfile) return;
    if (!match) return;

    setLoading(true);
    const { error } = await supabase.from('match_votes').upsert({
      match_id: match.id,
      player_id: myPlayerProfile.id,
      is_going: isGoing
    }, { onConflict: 'match_id,player_id' });

    if (error) {
      console.error(error);
      toast.error('Submission failed: ' + error.message);
    } else {
      toast.success('Vote recorded!');
      setMessage('Vote recorded!');
      setTimeout(() => setMessage(''), 3000);
      fetchMatchData(match.id.toString());
    }
    setLoading(false);
  }

  if (!match) return <div className="text-center py-20 text-pl-purple font-heading text-2xl animate-pulse uppercase">Matchday Loading...</div>;

  const goingVotes = votes.filter(v => v.is_going);
  const missingVotes = votes.filter(v => !v.is_going);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-pl-purple text-white py-12">
         <div className="container mx-auto px-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-pl-green mb-4 opacity-80">{match.stadium} • {new Date(match.date).toLocaleDateString()} • {match.time.substring(0,5)}</div>
            <div className="flex justify-center items-center gap-8 md:gap-16">
              <div className="text-center">
                <div className="w-20 h-20 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center text-pl-purple font-bold text-2xl mb-4 mx-auto border-4 border-white/10 shadow-xl text-center">RF</div>
                <h2 className="text-xl md:text-4xl font-heading font-bold uppercase tracking-tight text-center">RealFake</h2>
              </div>
              <div className="bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                <span className="text-4xl md:text-7xl font-heading font-bold tabular-nums text-center">
                  {match.status === 'Upcoming' ? 'VS' : `${match.home_score} - ${match.away_score}`}
                </span>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 md:w-32 md:h-32 bg-white/80 rounded-full flex items-center justify-center text-pl-purple font-bold text-2xl mb-4 mx-auto overflow-hidden border-4 border-white/10 shadow-xl">
                   {match.opponent_logo ? <img src={match.opponent_logo} className="w-full h-full object-cover"/> : "??"}
                </div>
                <h2 className="text-xl md:text-4xl font-heading font-bold uppercase tracking-tight text-center">{match.opponent}</h2>
              </div>
            </div>
         </div>
      </div>

      <div className="container mx-auto px-4 mt-8 grid lg:grid-cols-2 gap-8">
         <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="text-xl font-heading font-bold text-pl-purple mb-6 border-b border-gray-50 pb-3 uppercase tracking-wider text-left">Match Records</h3>
               {stats.length > 0 ? (
                 <ul className="space-y-4">
                   {stats.map(stat => (
                     <li key={stat.id} className="flex items-center gap-4 group">
                        <img src={stat.player?.image} className="w-10 h-10 rounded-full bg-gray-100 object-cover border-2 border-transparent group-hover:border-pl-green transition-all" />
                        <div className="flex-grow text-left">
                            <span className="font-bold text-sm block">{stat.player?.name}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">{stat.player?.nickname || 'Official Player'}</span>
                        </div>
                        <div className="flex gap-2 text-[10px] font-bold text-white">
                           {stat.goals > 0 && <span className="bg-pl-purple px-2 py-1 rounded-md shadow-sm">{stat.goals} G</span>}
                           {stat.assists > 0 && <span className="bg-pl-green text-pl-purple px-2 py-1 rounded-md shadow-sm">{stat.assists} A</span>}
                           {stat.is_motm && <span className="bg-pl-pink px-2 py-1 rounded-md shadow-sm animate-bounce">MOTM</span>}
                        </div>
                     </li>
                   ))}
                 </ul>
               ) : (
                 <p className="text-gray-400 italic text-sm text-center py-10">Waiting for match results...</p>
               )}
            </div>
         </div>

         <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-8 border-pl-pink border border-gray-100">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-heading font-bold text-pl-purple uppercase text-left">Attendance</h3>
                <span className="bg-pl-green text-pl-purple font-bold px-4 py-1.5 rounded-full text-xs shadow-sm">
                   {goingVotes.length} Ready to Play
                </span>
              </div>
              
              {match.status === 'Upcoming' && (
                !user || !isWhitelisted ? (
                    <div className="bg-pl-purple text-white p-6 rounded-xl mb-8 text-center shadow-lg">
                        <p className="text-sm font-bold mb-4 uppercase tracking-widest">Authorized Team Access Only</p>
                        <Link to="/login" className="inline-block bg-pl-green text-pl-purple text-xs font-bold px-8 py-3 rounded-full hover:bg-white transition-all transform hover:scale-105 cursor-pointer shadow-md">
                            SIGN IN TO VOTE
                        </Link>
                    </div>
                ) : !myPlayerProfile ? (
                    <div className="bg-amber-50 border-2 border-dashed border-amber-200 p-6 rounded-xl mb-8 text-center">
                        <p className="text-amber-800 font-bold mb-2">Profile Not Linked</p>
                        <p className="text-amber-600 text-xs mb-4">Your email is authorized, but not yet linked to a player profile.</p>
                        <Link to="/players" className="inline-block bg-amber-500 text-white text-xs font-bold px-6 py-2.5 rounded-lg hover:bg-amber-600 transition-all cursor-pointer shadow-sm">
                            CLAIM YOUR PROFILE
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleVote} className="bg-gray-50 p-5 rounded-xl mb-8 border border-gray-200 relative overflow-hidden group text-left">
                        <div className="absolute top-0 left-0 w-1 h-full bg-pl-green group-hover:w-2 transition-all"></div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-1">Voting as</h4>
                                <div className="flex items-center gap-2">
                                    <img src={myPlayerProfile.image} className="w-6 h-6 rounded-full object-cover" />
                                    <span className="font-bold text-pl-purple">{myPlayerProfile.name}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <label className={cn("flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border-2 transition-all", isGoing ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-100 opacity-60 hover:bg-gray-50")}>
                                    <input type="radio" name="going" checked={isGoing} onChange={() => setIsGoing(true)} className="hidden" />
                                    <span className={cn("text-xs font-bold uppercase", isGoing ? "text-green-700" : "text-gray-400")}>I'm In</span>
                                </label>
                                <label className={cn("flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border-2 transition-all", !isGoing ? "border-red-500 bg-red-50 shadow-sm" : "border-gray-100 opacity-60 hover:bg-gray-50")}>
                                    <input type="radio" name="going" checked={!isGoing} onChange={() => setIsGoing(false)} className="hidden" />
                                    <span className={cn("text-xs font-bold uppercase", !isGoing ? "text-red-700" : "text-gray-400")}>Out</span>
                                </label>
                                <button disabled={loading} type="submit" className="bg-pl-purple text-white font-bold px-6 py-2 rounded-lg hover:bg-pl-pink transition-all cursor-pointer shadow-md disabled:opacity-50 text-xs uppercase tracking-tighter">
                                    {loading ? '...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                        {message && <p className="text-center text-green-600 text-[10px] font-bold mt-2 animate-bounce">{message}</p>}
                    </form>
                )
              )}

              <div className="grid md:grid-cols-2 gap-8 text-left">
                  <div>
                      <h4 className="text-green-700 font-bold uppercase text-[10px] tracking-widest mb-4 border-b border-green-100 pb-2 flex justify-between">
                          Squad Members Going ({goingVotes.length})
                      </h4>
                      <div className="space-y-2">
                          {goingVotes.map(vote => (
                              <div key={vote.id} className="flex items-center justify-between p-2.5 rounded-xl bg-green-50 border border-green-100 shadow-sm group">
                                  <div className="flex items-center gap-3">
                                     <img src={vote.player?.image || 'https://via.placeholder.com/20'} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"/>
                                     <div className="flex flex-col">
                                         <span className="font-bold text-xs text-green-900">{vote.player?.name}</span>
                                         <span className="text-[9px] text-green-600 font-medium uppercase">{vote.player?.nickname}</span>
                                     </div>
                                  </div>
                              </div>
                          ))}
                          {goingVotes.length === 0 && <p className="text-gray-300 italic text-[10px] py-4 text-center">No confirmations yet.</p>}
                      </div>
                  </div>
                  <div>
                      <h4 className="text-red-700 font-bold uppercase text-[10px] tracking-widest mb-4 border-b border-red-100 pb-2 flex justify-between">
                          Unavailable ({missingVotes.length})
                      </h4>
                      <div className="space-y-2">
                          {missingVotes.map(vote => (
                              <div key={vote.id} className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/50 border border-red-100 opacity-70 group hover:opacity-100 transition-opacity">
                                  <div className="flex items-center gap-3">
                                     <img src={vote.player?.image || 'https://via.placeholder.com/20'} className="w-8 h-8 rounded-full object-cover grayscale border-2 border-white"/>
                                     <div className="flex flex-col">
                                         <span className="font-bold text-xs text-red-900 line-through decoration-red-300">{vote.player?.name}</span>
                                         <span className="text-[9px] text-red-600 font-medium uppercase">{vote.player?.nickname}</span>
                                     </div>
                                  </div>
                              </div>
                          ))}
                          {missingVotes.length === 0 && <p className="text-gray-300 italic text-[10px] py-4 text-center">Full squad available!</p>}
                      </div>
                  </div>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
