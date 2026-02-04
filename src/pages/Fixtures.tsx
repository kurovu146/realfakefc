import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Match } from "@/types/database";
import MatchFixture from "@/components/MatchFixture";
import { Link } from "react-router-dom";

export default function Fixtures() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [season, setSeason] = useState<number>(2026);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("matches")
      .select("*, match_votes(*, player:players(*))")
      .eq("season", season);

    if (data) setMatches(data);
    setLoading(false);
  }, [season]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Phân loại trận đấu
  const upcomingMatches = matches
    .filter((m) => m.status === "Upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Gần nhất lên đầu

  const finishedMatches = matches
    .filter((m) => m.status === "Finished" || m.status === "Live")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Mới nhất lên đầu

  return (
    <div className="bg-gray-50 min-h-screen py-10 pb-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-6xl font-heading text-pl-purple uppercase leading-none">
              Lịch thi đấu
            </h1>
            <p className="text-gray-400 mt-2 font-bold uppercase tracking-widest text-sm underline decoration-pl-green decoration-4">
              Đường tới vinh quang
            </p>
          </div>
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="border-2 border-pl-gray rounded-xl p-3 font-heading font-bold text-pl-purple cursor-pointer bg-white outline-none focus:border-pl-purple"
          >
            <option value={2026}>Mùa giải 2026</option>
            <option value={2025}>Mùa giải 2025</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 animate-pulse font-heading text-2xl text-gray-400 uppercase">
            Đang chuẩn bị lịch đấu...
          </div>
        ) : (
          <div className="space-y-12 max-w-4xl mx-auto">
            {/* --- UPCOMING SECTION --- */}
            <div>
              <h2 className="text-2xl font-bold uppercase text-pl-purple mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-pl-pink rounded-full"></span>
                Sắp diễn ra
              </h2>
              {upcomingMatches.length > 0 ? (
                <div className="space-y-4">
                  {upcomingMatches.map((match) => (
                    <Link
                      key={match.id}
                      to={`/fixtures/${match.id}`}
                      className="block transition-transform hover:scale-[1.01]"
                    >
                      <MatchFixture match={match} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                  <p className="text-gray-400 font-bold uppercase text-sm">
                    Chưa có trận đấu nào sắp tới
                  </p>
                </div>
              )}
            </div>

            {/* --- RESULTS SECTION --- */}
            <div>
              <h2 className="text-2xl font-bold uppercase text-pl-purple mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-pl-green rounded-full"></span>
                Kết quả thi đấu
              </h2>
              {finishedMatches.length > 0 ? (
                <div className="space-y-4">
                  {finishedMatches.map((match) => (
                    <Link
                      key={match.id}
                      to={`/fixtures/${match.id}`}
                      className="block transition-transform hover:scale-[1.01]"
                    >
                      <MatchFixture match={match} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                  <p className="text-gray-400 font-bold uppercase text-sm">
                    Chưa có kết quả nào
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
