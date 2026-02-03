import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { AuthContext } from './AuthContextValue';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkWhitelist = async (email: string | undefined) => {
    if (!email) return false;
    if (email === ADMIN_EMAIL) return true;

    // Thêm timestamp vào query để tránh cache 304
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
        setLoading(true);
        // Lấy session mới nhất từ server, không dùng cache
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
            const allowed = await checkWhitelist(currentUser.email);
            setIsWhitelisted(allowed);
        }
        setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
          const allowed = await checkWhitelist(currentUser.email);
          setIsWhitelisted(allowed);
      } else {
          setIsWhitelisted(false);
      }

      if (event === 'SIGNED_OUT') {
          // Force clear local cache
          setUser(null);
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
        redirectTo: `${window.location.origin}/login`
      }
    });
    if (error) throw error;
  };

  const logout = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Xóa mọi dữ liệu trong localStorage liên quan đến auth
        localStorage.clear();
        
        // Chuyển hướng về home và reload mạnh trang để clear React state
        window.location.href = '/';
    } catch (err) {
        console.error('Logout error:', err);
        // Fallback: cứ reload trang
        window.location.reload();
    }
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ user, isAdmin, isWhitelisted, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};


