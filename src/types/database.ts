export interface Player {
  id: number;
  name: string;
  number: number;
  position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  status?: 'Active' | 'Injured';
  nickname?: string;
  email?: string;
  phone?: string;
  image: string;
  height?: number;
  weight?: number;
  dob?: string;
  joined_at?: string;
}

export interface Match {
  id: number;
  season: number;
  date: string;
  time: string;
  stadium: string;
  opponent: string;
  opponent_logo?: string;
  is_home: boolean;
  home_score: number;
  away_score: number;
  status: 'Upcoming' | 'Finished' | 'Live';
  match_votes?: MatchVote[];
}

export interface MatchStat {
  id: number;
  match_id: number;
  player_id: number;
  goals: number;
  assists: number;
  own_goals: number;
  is_motm: boolean;
  player?: Player; // Joined data
}

export interface MatchVote {
  id: number;
  match_id: number;
  player_id: number;
  is_going: boolean;
  note?: string;
  player?: Player; // Joined data
}
