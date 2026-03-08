import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import Login from '@/pages/Login';

const INACTIVITY_TIMEOUT = 5 * 60 * 60 * 1000; // 5 hours

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      supabase.auth.signOut();
    }, INACTIVITY_TIMEOUT);
    localStorage.setItem('lastActivity', Date.now().toString());
  }, []);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN') {
        // Reset lastActivity on fresh login so inactivity check doesn't immediately sign out
        localStorage.setItem('lastActivity', Date.now().toString());
      }
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // If we have a valid session, update lastActivity to prevent stale expiry
        localStorage.setItem('lastActivity', Date.now().toString());
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Inactivity tracker
  useEffect(() => {
    if (!session) return;

    // Check if already expired from previous session
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity && Date.now() - parseInt(lastActivity) > INACTIVITY_TIMEOUT) {
      supabase.auth.signOut();
      return;
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [session, resetTimer]);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return <>{children}</>;
}
