
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';

// Define login schema with simple validation
const loginSchema = z.object({
  email: z.string().email('Voer een geldig e-mailadres in'),
  password: z.string().min(1, 'Wachtwoord is verplicht'),
});

// Define signup schema with stronger password requirements
const signupSchema = z.object({
  email: z.string().min(1, 'E-mailadres is verplicht').email('Voer een geldig e-mailadres in'),
  password: z.string()
    .min(8, 'Wachtwoord moet minimaal 8 tekens bevatten')
    .regex(/[A-Z]/, 'Wachtwoord moet minimaal 1 hoofdletter bevatten')
    .regex(/[a-z]/, 'Wachtwoord moet minimaal 1 kleine letter bevatten')
    .regex(/[0-9]/, 'Wachtwoord moet minimaal 1 cijfer bevatten'),
  confirmPassword: z.string().min(1, 'Bevestig je wachtwoord'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"]
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Auth = () => {
  const { user, signIn, signUp, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  
  // Initialize form with react-hook-form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Reset error when switching between login and signup
  useEffect(() => {
    setError(null);
    
    // Reset form state when toggling between login and signup
    if (isLogin) {
      signupForm.reset();
    } else {
      loginForm.reset();
    }
  }, [isLogin]);

  // Redirect if user is already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (values: LoginFormValues) => {
    try {
      setError(null);
      await signIn(values.email, values.password);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message);
    }
  };

  const handleSignup = async (values: SignupFormValues) => {
    try {
      setError(null);
      await signUp(values.email, values.password);
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold">
            {isLogin ? 'Inloggen' : 'Account aanmaken'}
          </h2>
          <p className="text-muted-foreground mt-2 text-center">
            {isLogin 
              ? 'Welkom terug! Log in om door te gaan.' 
              : 'Maak een account aan om te beginnen.'}
          </p>
        </div>

        {/* Display error message if any */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Show success message if just signed up */}
        {location.state?.justSignedUp && isLogin && (
          <Alert>
            <AlertDescription>
              Registratie succesvol! Je kunt nu inloggen.
            </AlertDescription>
          </Alert>
        )}

        {/* Password requirements (only for signup) */}
        {!isLogin && (
          <Alert>
            <AlertDescription className="text-sm">
              Je wachtwoord moet voldoen aan deze eisen:
              <ul className="list-disc pl-4 mt-2">
                <li>Minimaal 8 tekens lang</li>
                <li>Minimaal 1 hoofdletter (A-Z)</li>
                <li>Minimaal 1 kleine letter (a-z)</li>
                <li>Minimaal 1 cijfer (0-9)</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Login form */}
        {isLogin ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mailadres</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="naam@voorbeeld.nl" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wachtwoord</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Inloggen...' : 'Inloggen'}
              </Button>
            </form>
          </Form>
        ) : (
          /* Signup form */
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6">
              <FormField
                control={signupForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mailadres</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="naam@voorbeeld.nl" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wachtwoord</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={signupForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bevestig wachtwoord</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Account aanmaken...' : 'Account aanmaken'}
              </Button>
            </form>
          </Form>
        )}

        {/* Toggle between login and signup */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline text-sm font-medium"
          >
            {isLogin
              ? 'Nog geen account? Registreer je hier'
              : 'Al een account? Log hier in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
