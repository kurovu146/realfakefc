import type { Player } from "@/types/database";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  onClick?: (player: Player) => void;
}

export default function PlayerCard({ player, onClick }: PlayerCardProps) {
  const isInjured = player.status === "Injured";

  return (
    <div
      onClick={() => onClick?.(player)}
      className={cn(
        "group relative bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 cursor-pointer h-full flex flex-col",
        isInjured && "opacity-80 grayscale-[0.3]",
      )}
    >
      <div className="absolute top-0 left-0 w-full h-2/3 bg-linear-to-b from-pl-purple to-white opacity-5 z-0"></div>
      <div className="absolute inset-0 bg-pl-purple/0 group-hover:bg-pl-purple/5 transition-colors z-20"></div>

      {/* Image Container */}
      <div className="relative z-10 pt-4 px-4 flex justify-center items-end h-64 overflow-hidden bg-gray-50">
        <img
          src={
            player.image ||
            "https://placehold.co/250x250/38003c/ffffff?text=Player"
          }
          alt={player.name}
          className="h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* Content */}
      <div className="relative z-30 bg-white p-4 pt-6 grow flex flex-col">
        {/* Kit Number */}
        <div className="absolute -top-6 right-4 w-12 h-12 bg-pl-pink text-white flex items-center justify-center font-heading font-bold text-xl rounded-full shadow-md border-2 border-white">
          {player.number}
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {player.position}
          </span>
          {player.nickname && (
            <span className="text-[10px] font-bold text-pl-purple px-2 py-0.5 bg-pl-green/20 rounded-full">
              "{player.nickname}"
            </span>
          )}
        </div>

        <h3 className="text-xl font-heading font-bold text-pl-purple leading-inherit group-hover:text-pl-pink transition-colors truncate">
          {player.name}
        </h3>

        {/* INJURED BADGE INSIDE CARD */}
        {isInjured && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-bold text-red-600 uppercase tracking-tighter">
              Chấn thương
            </span>
          </div>
        )}

        {/* Bottom Info */}
        <div className="mt-auto pt-4 grid grid-cols-2 gap-2 border-t border-gray-100">
          <div className="flex flex-col text-left">
            <span className="text-[8px] font-bold text-gray-400 uppercase">
              Ngày sinh
            </span>
            <span className="text-[10px] font-bold text-pl-purple">
              {player.dob ? new Date(player.dob).toLocaleDateString() : "CXĐ"}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] font-bold text-gray-400 uppercase">
              Gia nhập
            </span>
            <span className="text-[10px] font-bold text-pl-purple">
              {player.joined_at
                ? new Date(player.joined_at).getFullYear()
                : "2014"}
            </span>
          </div>
        </div>

        <div className="mt-3 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-pl-green w-0 group-hover:w-full transition-all duration-700 ease-out"></div>
        </div>
      </div>
    </div>
  );
}
