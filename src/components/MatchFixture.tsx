import { useState, useEffect } from "react";
import type { Match } from "@/types/database";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface MatchFixtureProps {
  match: Match;
}

interface TeamNameProps {
  name: string;
  logoUrl?: string | null;
  align?: "left" | "right";
}

const TeamName = ({ name, logoUrl, align = "left" }: TeamNameProps) => (
  <div
    className={cn(
      "relative group/name flex flex-col md:flex-row items-center gap-2 flex-1 min-w-0",
      align === "right" && "md:flex-row-reverse",
    )}
  >
    {/* LOGO */}
    <div
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-md overflow-hidden border border-gray-100 bg-white",
        name === "RealFake FC"
          ? "border-pl-purple/20"
          : "bg-gray-50 text-gray-400 border-gray-200",
      )}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
      ) : name === "RealFake FC" ? (
        <span className="text-pl-purple font-bold">RF</span>
      ) : (
        name.substring(0, 2).toUpperCase()
      )}
    </div>

    {/* NAME WITH TOOLTIP */}
    <div className="relative w-full min-w-0">
      <span
        className={cn(
          "font-heading text-sm md:text-base font-bold text-pl-purple truncate block w-full",
          align === "right"
            ? "text-center md:text-right"
            : "text-center md:text-left",
        )}
      >
        {name === "RealFake FC" ? "RF FC" : name}
      </span>

      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-pl-purple text-white text-[10px] font-bold rounded shadow-xl opacity-0 group-hover/name:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 uppercase tracking-widest border border-white/10">
        {name}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-pl-purple"></div>
      </div>
    </div>
  </div>
);

export default function MatchFixture({ match }: MatchFixtureProps) {
  const [teamLogo, setTeamLogo] = useState<string | null>(null);
  const isFinished = match.status === "Finished";
  const isLive = match.status === "Live";

  // Vote logic
  const votes = match.match_votes || [];
  const going = votes.filter((v) => v.is_going);

  useEffect(() => {
    async function fetchLogo() {
      const { data } = await supabase
        .from("site_settings")
        .select("logo_url")
        .single();
      if (data?.logo_url) setTeamLogo(data.logo_url);
    }
    fetchLogo();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 hover:border-pl-purple transition-all cursor-pointer group h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center text-[10px] text-gray-400 mb-4 font-bold uppercase tracking-widest border-b border-gray-50 pb-2">
          <span className="truncate max-w-37.5">
            {match.stadium || "TBD Stadium"}
          </span>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span>{new Date(match.date).toLocaleDateString()}</span>
            {isLive && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 mb-6">
          <TeamName name="RealFake FC" logoUrl={teamLogo} align="left" />

          <div
            className={cn(
              "mx-1 px-3 py-1.5 rounded-lg min-w-17.5 text-center font-bold font-heading text-lg md:text-xl shadow-inner",
              isFinished
                ? "bg-pl-purple text-white"
                : "bg-gray-100 text-pl-purple border border-gray-200",
              isLive && "bg-pl-pink text-white animate-pulse",
            )}
          >
            {isFinished || isLive ? (
              <span>
                {match.home_score} - {match.away_score}
              </span>
            ) : (
              <span>{match.time.substring(0, 5)}</span>
            )}
          </div>

          <TeamName
            name={match.opponent}
            logoUrl={match.opponent_logo}
            align="right"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 mt-auto">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            Squad Status
          </span>
          <span className="bg-pl-green/20 text-pl-purple text-[9px] font-bold px-2 py-0.5 rounded-full border border-pl-green/30 uppercase">
            {going.length} Going
          </span>
        </div>

        <div className="flex flex-wrap gap-1 min-h-6">
          {going.slice(0, 5).map((v) => (
            <span
              key={v.id}
              className="text-[9px] font-bold bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100"
            >
              {v.player?.nickname || v.player?.name.split(" ").pop()}
            </span>
          ))}
          {going.length > 5 && (
            <span className="text-[9px] font-bold text-gray-400 px-1">
              +{going.length - 5}
            </span>
          )}
          {going.length === 0 && (
            <span className="text-[9px] text-gray-300 italic">
              No reports yet
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-dashed border-gray-100 flex justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
        <span className="text-[10px] font-bold text-pl-pink uppercase flex items-center gap-1 tracking-widest">
          {isFinished ? "Match Records" : "Matchday Access"}{" "}
          <span className="text-lg leading-none">&rsaquo;</span>
        </span>
      </div>
    </div>
  );
}