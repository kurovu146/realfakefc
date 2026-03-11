import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { AuthContext } from './AuthContextValue';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  const checkWhitelist = async (email: string | undefined): Promise<{ allowed: boolean; role: 'admin' | 'member' | null }> => {
    if (!email) return { allowed: false, role: null };

    const { data, error } = await supabase
      .from('players')
      .select('email, role')
      .eq('email', email)
      .maybeSingle();

    if (error) {
        console.error('Whitelist check error:', error);
        return { allowed: false, role: null };
    }
    return { allowed: !!data, role: data?.role ?? null };
  };

  useEffect(() => {
    const initAuth = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const { allowed, role } = await checkWhitelist(currentUser.email);
                setIsWhitelisted(allowed);
                setUserRole(role);
            }
        } catch (err) {
            console.error('[Auth] initAuth error:', err);
        } finally {
            setLoading(false);
        }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
            const { allowed, role } = await checkWhitelist(currentUser.email);
            setIsWhitelisted(allowed);
            setUserRole(role);
        } else {
            setIsWhitelisted(false);
            setUserRole(null);
        }

        if (event === 'SIGNED_OUT') {
            // Force clear local cache
            setUser(null);
            setIsWhitelisted(false);
            setUserRole(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      } finally {
        setLoading(false);
      }
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

  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, isWhitelisted, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};


