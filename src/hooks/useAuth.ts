import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    let currentCallId = 0;

    const checkAdminRole = async (userId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.rpc("check_admin_role", {
          p_user_id: userId,
        });

        if (error) {
          console.error("❌ Admin check error:", error);
          return false;
        }

        return data === true;
      } catch (error) {
        console.error("❌ Admin check failed:", error);
        return false;
      }
    };

    const handleSession = async (session: Session | null) => {
      if (!mountedRef.current) return;

      const callId = ++currentCallId;

      if (session?.user) {
        let isAdminUser = false;

        try {
          isAdminUser = await checkAdminRole(session.user.id);
        } catch {
          // If admin check fails, just default to false — don't block
          isAdminUser = false;
        }

        // Discard stale calls
        if (!mountedRef.current || callId !== currentCallId) return;

        setSession(session);
        setUser(session.user);
        setIsAdmin(isAdminUser);
      } else {
        if (!mountedRef.current || callId !== currentCallId) return;

        setSession(null);
        setUser(null);
        setIsAdmin(false);
      }

      // ALWAYS set loading to false — this was the root cause
      if (mountedRef.current && callId === currentCallId) {
        setLoading(false);
        initializedRef.current = true;
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ Error getting session:", error);
          // Still unblock loading even on error
          if (mountedRef.current) {
            setLoading(false);
            initializedRef.current = true;
          }
          return;
        }

        await handleSession(session);
      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        // Always unblock on any error
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          initializedRef.current = true;
        }
      }
    };

    // Safety net: if nothing resolves within 5 seconds, force loading off
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current && !initializedRef.current) {
        console.warn("⚠️ Auth init timed out — forcing loading to false");
        setLoading(false);
        initializedRef.current = true;
      }
    }, 5000);

    initAuth();

    // Listen for auth state changes (login/logout AFTER initial load)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the initial USER_UPDATED that fires on reload — we handle it in initAuth
      if (!initializedRef.current) return;
      await handleSession(session);
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Sign in error:", error);
        return { error };
      }

      return { error: null, data };
    } catch (error) {
      console.error("❌ Sign in failed:", error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error("❌ Sign up error:", error);
        return { error };
      }

      return { error: null, data };
    } catch (error) {
      console.error("❌ Sign up failed:", error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("❌ Sign out error:", error);
        return { error };
      }

      setSession(null);
      setUser(null);
      setIsAdmin(false);

      return { error: null };
    } catch (error) {
      console.error("❌ Sign out failed:", error);
      return { error: error as Error };
    }
  };

  return {
    user,
    session,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
  };
};