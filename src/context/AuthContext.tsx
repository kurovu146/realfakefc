import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { AuthContext } from './AuthContextValue';

const AUTH_TIMEOUT_MS = 8000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const callIdRef = useRef(0);

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
    // Safety timeout: nếu auth check bị hang, force tắt loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, AUTH_TIMEOUT_MS);

    // Dùng onAuthStateChange làm nguồn duy nhất (Supabase fire INITIAL_SESSION ngay khi subscribe)
    // Không cần gọi getSession() riêng → tránh race condition
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const callId = ++callIdRef.current;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsWhitelisted(false);
        setUserRole(null);
        clearTimeout(timeoutId);
        setLoading(false);
        return;
      }

      try {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { allowed, role } = await checkWhitelist(currentUser.email);
          // Chỉ cập nhật nếu đây là lần gọi mới nhất (tránh stale callback)
          if (callId !== callIdRef.current) return;
          setIsWhitelisted(allowed);
          setUserRole(role);
        } else {
          setIsWhitelisted(false);
          setUserRole(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        if (callId !== callIdRef.current) return;
        setUser(null);
        setIsWhitelisted(false);
        setUserRole(null);
      } finally {
        if (callId === callIdRef.current) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    });

    return () => {
      callIdRef.current = -1;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
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


