import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isWhitelisted: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkWhitelist = async (email: string | undefined) => {
    if (!email) return false;
    if (email === ADMIN_EMAIL) return true;

    // Kiểm tra xem email có trong bảng players không
    const { data, error } = await supabase
      .from('players')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
        console.error('Whitelist check error:', error);
        return false;
    }
    return !!data;
  };

  useEffect(() => {
    const initAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
            const allowed = await checkWhitelist(currentUser.email);
            setIsWhitelisted(allowed);
            // Nếu không được phép, tự động sign out sau khi hiện thông báo (xử lý ở UI)
        }
        setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
          const allowed = await checkWhitelist(currentUser.email);
          setIsWhitelisted(allowed);
      } else {
          setIsWhitelisted(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ user, isAdmin, isWhitelisted, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};