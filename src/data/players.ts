export interface Player {
  id: number;
  name: string;
  number: number;
  position: 'Thủ môn' | 'Hậu vệ' | 'Tiền vệ' | 'Tiền đạo' | 'Quản lý';
  nationality: string;
  image: string;
}

export const players: Player[] = [
  // Thủ môn
  { id: 1, name: "Brick Wall", number: 1, position: "Thủ môn", nationality: "ENG", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p49262.png" }, // Alisson placeholder
  
  // Hậu vệ
  { id: 2, name: "Gary Neville's Ghost", number: 2, position: "Hậu vệ", nationality: "ENG", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p106617.png" },
  { id: 3, name: "The Rock", number: 5, position: "Hậu vệ", nationality: "USA", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p97032.png" },
  { id: 4, name: "Slide Tackle", number: 3, position: "Hậu vệ", nationality: "BRA", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p209244.png" },
  
  // Tiền vệ
  { id: 5, name: "Pass Master", number: 8, position: "Tiền vệ", nationality: "ESP", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p61366.png" }, // KDB placeholder
  { id: 6, name: "Box To Box", number: 4, position: "Tiền vệ", nationality: "FRA", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p219847.png" },
  { id: 7, name: "Winger Speed", number: 11, position: "Tiền vệ", nationality: "JAM", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p165153.png" },

  // Tiền đạo
  { id: 8, name: "Goal Machine", number: 9, position: "Tiền đạo", nationality: "NOR", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p223094.png" }, // Haaland placeholder
  { id: 9, name: "False Nine", number: 10, position: "Tiền đạo", nationality: "ARG", image: "https://resources.premierleague.com/premierleague/photos/players/250x250/p172649.png" },
];
