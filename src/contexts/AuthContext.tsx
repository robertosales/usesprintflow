import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  currentTeamId: string | null;
  setCurrentTeamId: (id: string | null) => void;
  teams: { id: string; name: string }[];
  refreshTeams: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (data) setProfile(data as Profile);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const admin = data?.some((r: any) => r.role === "admin") ?? false;
      setIsAdmin(admin);
      return admin;
    } catch (err) {
      console.error("Error fetching role:", err);
      return false;
    }
  };

  const refreshTeams = async () => {
    try {
      const { data } = await supabase.from("teams").select("id, name");
      const teamList = (data || []) as { id: string; name: string }[];
      setTeams(teamList);
      if (teamList.length > 0 && !currentTeamId) {
        setCurrentTeamId(teamList[0].id);
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      await Promise.all([
        fetchProfile(userId),
        fetchRole(userId),
        refreshTeams(),
      ]);
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase auth
          setTimeout(() => {
            loadUserData(session.user.id).finally(() => setLoading(false));
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setTeams([]);
          setCurrentTeamId(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setTeams([]);
    setCurrentTeamId(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isAdmin, loading, signOut, currentTeamId, setCurrentTeamId, teams, refreshTeams }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
