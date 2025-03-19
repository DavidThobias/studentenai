
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check active session and user on mount
    const getInitialSession = async () => {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Attempting to sign in with email:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("Login error:", error);
        throw error;
      }
      
      console.log("Sign in successful:", data);
      navigate('/');
      toast({
        title: "Succesvol ingelogd",
        description: "Welkom terug!",
      });
    } catch (error: any) {
      console.error("Login error details:", error);
      toast({
        title: "Inloggen mislukt",
        description: error.message.includes('Invalid login credentials') 
          ? "Ongeldige inloggegevens. Controleer je e-mailadres en wachtwoord."
          : error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Attempting to sign up with email:", email);
      
      // Make sure Supabase is initialized correctly
      console.log("Supabase client initialized:", !!supabase);
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          // This ensures we get redirected back to our app after email confirmation
          emailRedirectTo: window.location.origin + '/auth'
        }
      });
      
      if (error) {
        console.error("Signup error:", error);
        throw error;
      }
      
      console.log("Sign up response:", data);
      
      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        console.error("User already exists error");
        throw new Error("User already registered");
      }
      
      toast({
        title: "Account aangemaakt",
        description: "Controleer je e-mail om je registratie te voltooien.",
      });
      
      // Navigate to login after signup
      navigate('/auth', { state: { justSignedUp: true } });
    } catch (error: any) {
      console.error("Signup error details:", error);
      
      let errorMessage = error.message;
      
      // Check for specific error cases
      if (error.message.includes('User already registered') || 
          (error.message === "User already registered")) {
        errorMessage = "Dit e-mailadres is al geregistreerd.";
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = "Wachtwoord moet minimaal 6 tekens bevatten.";
      } else if (error.message.includes('invalid email')) {
        errorMessage = "Ongeldig e-mailadres formaat.";
      }
      
      toast({
        title: "Registratie mislukt",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
      toast({
        title: "Uitgelogd",
        description: "Tot ziens!",
      });
    } catch (error: any) {
      toast({
        title: "Uitloggen mislukt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
