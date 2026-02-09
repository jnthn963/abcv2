import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGovernor: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isGovernor: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGovernor, setIsGovernor] = useState(false);

  // UI-only role check: used solely for conditional rendering (e.g. showing governor nav links).
  // All privileged operations are re-validated server-side in edge functions.
  const checkGovernorRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "governor")
      .maybeSingle();
    setIsGovernor(!!data);
  };

  useEffect(() => {
    // Set up auth listener FIRST, then check current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => checkGovernorRole(session.user.id), 0);
        } else {
          setIsGovernor(false);
        }
        setIsLoading(false);

        // On logout or token expiry, force redirect to landing
        if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
          setUser(null);
          setSession(null);
          setIsGovernor(false);
          window.location.replace("/");
        }
      }
    );

    // Re-validate session from backend on every page load (no cached assumptions)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkGovernorRole(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsGovernor(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isGovernor, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
