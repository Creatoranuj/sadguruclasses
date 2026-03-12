import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type AppRole = "admin" | "student" | "teacher";

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
}

export interface UserProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  mobile: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── User data fetch ──────────────────────────────────────────────────────────
async function fetchUserData(
  supabaseUser: SupabaseUser,
  isSignup = false
): Promise<{ user: User; profile: UserProfile; role: AppRole }> {
  const email = supabaseUser.email ?? "";
  const metaName = supabaseUser.user_metadata?.full_name ?? null;

  const defaults = (): { user: User; profile: UserProfile; role: AppRole } => ({
    user: { id: supabaseUser.id, email, fullName: metaName, role: "student" },
    profile: { id: supabaseUser.id, email, fullName: metaName, avatarUrl: null, mobile: null },
    role: "student",
  });

  try {
    const dataPromise = Promise.all([
      supabase.from("profiles").select("id, full_name, email, avatar_url, mobile").eq("id", supabaseUser.id).single(),
      supabase.rpc("get_user_role", { _user_id: supabaseUser.id }),
    ]);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("fetchUserData timeout")), 8000)
    );
    const [profileResult, roleResult] = await Promise.race([dataPromise, timeoutPromise]);

    let profileData = profileResult.data;

    if (profileResult.error) console.warn("[AuthContext] Profile fetch failed:", profileResult.error.message);
    if (roleResult.error) console.warn("[AuthContext] Role fetch failed:", roleResult.error.message);

    if (!profileData && isSignup) {
      await new Promise(r => setTimeout(r, 1000));
      const retry = await supabase.from("profiles").select("id, full_name, email, avatar_url, mobile").eq("id", supabaseUser.id).single();
      profileData = retry.data;
    }

    const role: AppRole = (roleResult.data as AppRole) ?? "student";
    const fullName = profileData?.full_name ?? metaName;

    return {
      user: { id: supabaseUser.id, email: profileData?.email ?? email, fullName, role },
      profile: {
        id: supabaseUser.id,
        email: profileData?.email ?? email,
        fullName,
        avatarUrl: profileData?.avatar_url ?? null,
        mobile: profileData?.mobile ?? null,
      },
      role,
    };
  } catch (err) {
    console.warn("[AuthContext] fetchUserData error:", err);
    return defaults();
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const fetchInProgress = useRef<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const cachedData = useRef<{ userId: string; user: User; profile: UserProfile; role: AppRole } | null>(null);

  // One-time cleanup of stale session tokens from old code
  useEffect(() => {
    localStorage.removeItem("sg_session_token");
    localStorage.removeItem("sg_session_id");
  }, []);

  const loadUser = useCallback(async (supabaseUser: SupabaseUser | null, isSignup = false) => {
    if (!supabaseUser) {
      if (isMounted.current) { setUser(null); setProfile(null); setRole(null); }
      return;
    }

    // Return cached data immediately if available and within cooldown
    const now = Date.now();
    if (cachedData.current?.userId === supabaseUser.id && now - lastFetchTime.current < 5000) {
      if (isMounted.current) {
        setUser(cachedData.current.user);
        setProfile(cachedData.current.profile);
        setRole(cachedData.current.role);
      }
      return;
    }

    if (fetchInProgress.current === supabaseUser.id) return;
    fetchInProgress.current = supabaseUser.id;

    // If cached, apply immediately while refreshing in background
    if (cachedData.current?.userId === supabaseUser.id) {
      if (isMounted.current) {
        setUser(cachedData.current.user);
        setProfile(cachedData.current.profile);
        setRole(cachedData.current.role);
      }
    }

    try {
      const data = await fetchUserData(supabaseUser, isSignup);
      cachedData.current = { userId: supabaseUser.id, ...data };
      lastFetchTime.current = Date.now();
      if (isMounted.current) { setUser(data.user); setProfile(data.profile); setRole(data.role); }
    } catch {
      // On error, keep cached data if available, otherwise clear
      if (!cachedData.current || cachedData.current.userId !== supabaseUser.id) {
        if (isMounted.current) { setUser(null); setProfile(null); setRole(null); }
      }
    } finally {
      fetchInProgress.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    let initialLoadDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      initialLoadDone = true;
      if (session?.user) {
        const isSignup = _event === "SIGNED_IN" && !session.user.last_sign_in_at;
        await loadUser(session.user, isSignup);
      } else {
        if (isMounted.current) { setUser(null); setProfile(null); setRole(null); }
      }
      if (isMounted.current) setIsLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!initialLoadDone) {
        if (session?.user) {
          await loadUser(session.user);
        }
        if (isMounted.current) setIsLoading(false);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signup = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    if (isMounted.current) { setUser(null); setProfile(null); setRole(null); }
  };

  const refetchUserData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await loadUser(session?.user ?? null);
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: role === "admin",
        isStudent: role === "student",
        isTeacher: role === "teacher",
        login,
        signup,
        logout,
        refetchUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
