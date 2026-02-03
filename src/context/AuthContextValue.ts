import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isWhitelisted: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
