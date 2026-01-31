export interface Player {
  id: number;
  name: string;
  number: number;
  position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  nationality: string;
  image: string;
}

export const players: Player[] = [
  // Goalkeepers
  { id: 1, name: "Brick Wall", number: 1, position: "Goalkeeper", nationality: "ENG", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p49262.png" }, // Alisson placeholder
  
  // Defenders
  { id: 2, name: "Gary Neville's Ghost", number: 2, position: "Defender", nationality: "ENG", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p106617.png" },
  { id: 3, name: "The Rock", number: 5, position: "Defender", nationality: "USA", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p97032.png" },
  { id: 4, name: "Slide Tackle", number: 3, position: "Defender", nationality: "BRA", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p209244.png" },
  
  // Midfielders
  { id: 5, name: "Pass Master", number: 8, position: "Midfielder", nationality: "ESP", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p61366.png" }, // KDB placeholder
  { id: 6, name: "Box To Box", number: 4, position: "Midfielder", nationality: "FRA", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p219847.png" },
  { id: 7, name: "Winger Speed", number: 11, position: "Midfielder", nationality: "JAM", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p165153.png" },

  // Forwards
  { id: 8, name: "Goal Machine", number: 9, position: "Forward", nationality: "NOR", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p223094.png" }, // Haaland placeholder
  { id: 9, name: "False Nine", number: 10, position: "Forward", nationality: "ARG", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p172649.png" },
];
