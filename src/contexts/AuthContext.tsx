
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
    throw new Error('useAuth moet binnen een AuthProvider gebruikt worden');
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

  // Load initial session
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        setIsLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log("User already logged in:", session.user.email);
        }
      } catch (error) {
        console.error("Error retrieving session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Clean up subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Translate error messages to Dutch
  const translateError = (errorMessage: string): string => {
    if (errorMessage.includes('Invalid login credentials')) {
      return 'Ongeldige inloggegevens. Controleer je e-mailadres en wachtwoord.';
    }
    if (errorMessage.includes('Email not confirmed')) {
      return 'E-mail is nog niet bevestigd. Controleer je inbox.';
    }
    if (errorMessage.includes('User already registered')) {
      return 'Dit e-mailadres is al geregistreerd.';
    }
    if (errorMessage.includes('invalid email')) {
      return 'Ongeldig e-mailadres formaat.';
    }
    if (errorMessage.includes('Password should be at least')) {
      return 'Wachtwoord moet minimaal 6 tekens bevatten.';
    }
    return errorMessage;
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        throw new Error(translateError(error.message));
      }
      
      console.log("Login successful:", data.user?.email);
      navigate('/');
      toast({
        title: "Succesvol ingelogd",
        description: "Welkom terug!",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Inloggen mislukt",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });
      
      if (error) {
        throw new Error(translateError(error.message));
      }
      
      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        throw new Error("Dit e-mailadres is al geregistreerd.");
      }
      
      toast({
        title: "Account aangemaakt",
        description: "Controleer je e-mail om je registratie te voltooien.",
      });
      
      navigate('/auth', { state: { justSignedUp: true } });
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Registratie mislukt",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      navigate('/auth');
      toast({
        title: "Uitgelogd",
        description: "Tot ziens!",
      });
    } catch (error: any) {
      console.error("Logout error:", error);
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
