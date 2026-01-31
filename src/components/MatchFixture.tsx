import type { Match } from "@/types/database";
import { cn } from "@/lib/utils";

interface MatchFixtureProps {
  match: Match;
}

export default function MatchFixture({ match }: MatchFixtureProps) {
  const isFinished = match.status === 'Finished';
  const isLive = match.status === 'Live';
  
  // Vote logic
  const votes = match.match_votes || [];
  const going = votes.filter(v => v.is_going);
  const missing = votes.filter(v => !v.is_going);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-pl-purple transition-colors cursor-pointer group mb-4">
      {/* Top Bar: Stadium & Date */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-4 font-bold uppercase tracking-wider">
        <span>{match.stadium || 'TBD'}</span>
        <div className="flex items-center gap-2">
           <span>{new Date(match.date).toLocaleDateString()}</span>
           {isLive && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
        </div>
      </div>

      {/* Main Content: Teams & Score */}
      <div className="flex justify-between items-center mb-4">
        {/* RealFake FC (Home) */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-pl-purple rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0">
             RF
          </div>
          <span className="font-heading text-lg font-bold text-pl-purple truncate">RealFake FC</span>
        </div>

        {/* Score / Time */}
        <div className={cn(
          "mx-4 px-4 py-1 rounded min-w-[80px] text-center font-bold font-heading text-xl",
          isFinished ? "bg-pl-purple text-white" : "bg-gray-100 text-pl-purple",
          isLive && "bg-pl-pink text-white"
        )}>
          {isFinished || isLive ? (
            <span>{match.home_score} - {match.away_score}</span>
          ) : (
            <span>{match.time.substring(0, 5)}</span>
          )}
        </div>

        {/* Opponent (Away) */}
        <div className="flex items-center gap-3 flex-1 justify-end text-right">
          <span className="font-heading text-lg font-bold text-pl-purple truncate">{match.opponent}</span>
           <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 text-xs shrink-0 overflow-hidden">
             {match.opponent_logo ? <img src={match.opponent_logo} alt={match.opponent} className="w-full h-full object-cover"/> : match.opponent.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
      
      {/* Attendance Summary (New Feature) */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase">Squad Availability</span>
          <span className="bg-pl-green text-pl-purple text-xs font-bold px-2 py-0.5 rounded-full">
            {going.length} Going
          </span>
        </div>
        
        {/* Chips Display */}
        <div className="flex flex-wrap gap-1">
           {going.map(v => (
             <span key={v.id} className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
               {v.player?.nickname || v.player?.name || 'Unknown'}
             </span>
           ))}
           {missing.map(v => (
             <span key={v.id} className="text-[10px] font-bold bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 line-through decoration-red-400">
               {v.player?.nickname || v.player?.name || 'Unknown'}
             </span>
           ))}
           {votes.length === 0 && <span className="text-[10px] text-gray-400 italic">No votes yet</span>}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-dashed border-gray-100 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
         <span className="text-xs font-bold text-pl-pink uppercase flex items-center gap-1">
            {isFinished ? 'Tap to View Results' : 'Tap to Vote'} <span className="text-lg leading-none">&rsaquo;</span>
         </span>
      </div>
    </div>
  );
}
