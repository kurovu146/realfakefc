import type { Player } from "@/types/database";

interface PlayerCardProps {
  player: Player;
  onClick?: (player: Player) => void;
}

export default function PlayerCard({ player, onClick }: PlayerCardProps) {
  return (
    <div 
      onClick={() => onClick?.(player)}
      className="group relative bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 cursor-pointer"
    >
      {/* Header Background Pattern */}
      <div className="absolute top-0 left-0 w-full h-2/3 bg-gradient-to-b from-pl-purple to-white opacity-5 z-0"></div>
      
      {/* Click Overlay Indicator */}
      <div className="absolute inset-0 bg-pl-purple/0 group-hover:bg-pl-purple/5 transition-colors z-20"></div>

      {/* Image Container */}
      <div className="relative z-10 pt-4 px-4 flex justify-center items-end h-64 overflow-hidden bg-gray-50">
        <img 
          src={player.image || 'https://placehold.co/250x250/38003c/ffffff?text=Player'} 
          alt={player.name} 
          className="h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      {/* Info Section */}
      <div className="relative z-30 bg-white p-4 pt-6">
        {/* Kit Number Badge */}
        <div className="absolute -top-6 right-4 w-12 h-12 bg-pl-pink text-white flex items-center justify-center font-heading font-bold text-xl rounded-full shadow-md border-2 border-white">
          {player.number}
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{player.position}</span>
          {player.nickname && <span className="text-xs font-bold text-pl-purple px-2 py-0.5 bg-pl-green/20 rounded-full">"{player.nickname}"</span>}
        </div>
        
        <h3 className="text-2xl font-heading font-bold text-pl-purple leading-none group-hover:text-pl-pink transition-colors truncate">
          {player.name}
        </h3>
        
        {/* Stats Preview */}
        <div className="mt-3 flex gap-4 text-[10px] font-bold text-gray-400 uppercase border-t border-gray-100 pt-2">
             <div className="flex flex-col">
                <span>Height</span>
                <span className="text-pl-purple">{player.height ? `${player.height} cm` : '-'}</span>
             </div>
             <div className="flex flex-col">
                <span>Weight</span>
                <span className="text-pl-purple">{player.weight ? `${player.weight} kg` : '-'}</span>
             </div>
        </div>
        
        <div className="mt-4 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
           <div className="h-full bg-pl-green w-0 group-hover:w-full transition-all duration-700 ease-out"></div>
        </div>
      </div>
    </div>
  );
}