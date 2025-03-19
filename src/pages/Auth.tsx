
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Vul een geldig e-mailadres in'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens bevatten'),
});

const signupSchema = z.object({
  email: z.string().email('Vul een geldig e-mailadres in'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens bevatten'),
  confirmPassword: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens bevatten'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Auth = () => {
  const { user, signIn, signUp, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  
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

  // If user is already logged in, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (values: LoginFormValues) => {
    try {
      setError(null);
      await signIn(values.email, values.password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignup = async (values: SignupFormValues) => {
    try {
      setError(null);
      await signUp(values.email, values.password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center">
          <div className="bg-study-100 p-3 rounded-full mb-4">
            <BookOpen className="h-8 w-8 text-study-600" />
          </div>
          <h2 className="text-3xl font-bold">
            {isLogin ? 'Inloggen bij StudyJoy' : 'Registreren bij StudyJoy'}
          </h2>
          <p className="text-muted-foreground mt-2 text-center">
            {isLogin
              ? 'Log in om van alle functies gebruik te maken'
              : 'Maak een account aan om van alle functies gebruik te maken'}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {location.state?.justSignedUp && isLogin && (
          <Alert>
            <AlertDescription>
              Registratie succesvol! Je kunt nu inloggen.
            </AlertDescription>
          </Alert>
        )}

        {isLogin ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="jouw@email.nl" 
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
                className="w-full bg-study-600 hover:bg-study-700"
                disabled={isLoading}
              >
                {isLoading ? 'Bezig met inloggen...' : 'Inloggen'}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6">
              <FormField
                control={signupForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="jouw@email.nl" 
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
                className="w-full bg-study-600 hover:bg-study-700"
                disabled={isLoading}
              >
                {isLoading ? 'Bezig met registreren...' : 'Registreren'}
              </Button>
            </form>
          </Form>
        )}

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={toggleAuthMode}
            className="text-study-600 hover:text-study-800 text-sm font-medium"
          >
            {isLogin
              ? 'Nog geen account? Registreer je hier'
              : 'Heb je al een account? Log hier in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
