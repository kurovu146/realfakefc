export interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time: string;
  stadium: string;
  status: 'Finished' | 'Upcoming' | 'Live';
}

export const matches: Match[] = [
  { id: 1, homeTeam: "RealFake FC", awayTeam: "Imaginary United", homeScore: 3, awayScore: 1, date: "Sat 24 Jan 2026", time: "FT", stadium: "The Fake Stadium", status: "Finished" },
  { id: 2, homeTeam: "NonExistent City", awayTeam: "RealFake FC", date: "Sat 31 Jan 2026", time: "15:00", stadium: "Null Pointer Arena", status: "Upcoming" },
  { id: 3, homeTeam: "RealFake FC", awayTeam: "Placeholder Rovers", date: "Sun 08 Feb 2026", time: "17:30", stadium: "The Fake Stadium", status: "Upcoming" },
];
