
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user]);

  async function getProfile() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
      }
    } catch (error: any) {
      toast({
        title: 'Fout bij het laden van profiel',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          updated_at: new Date().toISOString(), // Convert Date to ISO string format
        })
        .eq('id', user?.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Profiel bijgewerkt',
        description: 'Je profielgegevens zijn succesvol bijgewerkt.',
      });
    } catch (error: any) {
      toast({
        title: 'Fout bij het bijwerken van profiel',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6">Mijn profiel</h1>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              type="text"
              value={user?.email || ''}
              disabled
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Je e-mailadres kan niet worden gewijzigd
            </p>
          </div>

          <div>
            <Label htmlFor="username">Gebruikersnaam</Label>
            <Input
              id="username"
              type="text"
              value={username || ''}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
              disabled={updating}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              onClick={updateProfile}
              disabled={updating || loading}
              className="bg-study-600 hover:bg-study-700"
            >
              {updating ? 'Bezig met opslaan...' : 'Profiel opslaan'}
            </Button>
            
            <Button variant="outline" onClick={signOut}>
              Uitloggen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
