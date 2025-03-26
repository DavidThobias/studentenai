
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  BarChart, 
  BookOpen, 
  BookOpenCheck, 
  Clock, 
  Award, 
  Loader2,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface UserStats {
  total_quizzes: number;
  total_questions: number;
  total_correct_answers: number;
  average_score: number;
  books_studied: number;
  chapters_studied: number;
  paragraphs_studied: number;
  last_quiz_date: string | null;
}

interface RecentActivity {
  id: string;
  book_id: number;
  book_title: string;
  chapter_id: number | null;
  paragraph_id: number | null;
  score: number;
  total_questions: number;
  percentage: number;
  created_at: string;
}

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchUserStats = async () => {
      try {
        setLoading(true);
        
        // First check if user has stats in the view
        const { data: viewData, error: viewError } = await supabase
          .from('user_quiz_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (viewError && viewError.code !== 'PGRST116') {
          console.error('Error fetching user stats:', viewError);
        }
        
        if (viewData) {
          setStats(viewData as UserStats);
        } else {
          // Calculate stats manually if no data in view
          const { data: quizData, error: quizError } = await supabase
            .from('quiz_results')
            .select('*')
            .eq('user_id', user.id);
            
          if (quizError) {
            console.error('Error fetching quiz results:', quizError);
            return;
          }
          
          if (quizData && quizData.length > 0) {
            const totalQuizzes = quizData.length;
            const totalQuestions = quizData.reduce((sum, quiz) => sum + quiz.total_questions, 0);
            const totalCorrectAnswers = quizData.reduce((sum, quiz) => sum + quiz.score, 0);
            const averageScore = totalQuestions > 0 ? (totalCorrectAnswers / totalQuestions) * 100 : 0;
            
            // Get unique books, chapters, paragraphs
            const booksStudied = new Set(quizData.map(q => q.book_id)).size;
            const chaptersStudied = new Set(quizData.filter(q => q.chapter_id).map(q => q.chapter_id)).size;
            const paragraphsStudied = new Set(quizData.filter(q => q.paragraph_id).map(q => q.paragraph_id)).size;
            
            // Get the last quiz date
            const lastQuizDate = quizData.length > 0 
              ? new Date(Math.max(...quizData.map(q => new Date(q.created_at).getTime()))).toISOString()
              : null;
              
            setStats({
              total_quizzes: totalQuizzes,
              total_questions: totalQuestions,
              total_correct_answers: totalCorrectAnswers,
              average_score: averageScore,
              books_studied: booksStudied,
              chapters_studied: chaptersStudied,
              paragraphs_studied: paragraphsStudied,
              last_quiz_date: lastQuizDate
            });
          } else {
            // No quiz data yet
            setStats({
              total_quizzes: 0,
              total_questions: 0,
              total_correct_answers: 0,
              average_score: 0,
              books_studied: 0,
              chapters_studied: 0,
              paragraphs_studied: 0,
              last_quiz_date: null
            });
          }
        }
        
        // Fetch recent activity
        const { data: recentData, error: recentError } = await supabase
          .from('quiz_results')
          .select(`
            id,
            book_id,
            chapter_id,
            paragraph_id,
            score,
            total_questions,
            percentage,
            created_at,
            books!inner(book_title)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (recentError) {
          console.error('Error fetching recent activity:', recentError);
          return;
        }
        
        if (recentData) {
          const formattedActivity = recentData.map(item => ({
            id: item.id,
            book_id: item.book_id,
            book_title: item.books?.book_title || 'Onbekend boek',
            chapter_id: item.chapter_id,
            paragraph_id: item.paragraph_id,
            score: item.score,
            total_questions: item.total_questions,
            percentage: item.percentage,
            created_at: item.created_at
          }));
          
          setRecentActivity(formattedActivity);
        }
      } catch (error) {
        console.error('Error in fetchUserStats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [user]);
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nog geen quiz gemaakt';
    
    return new Date(dateString).toLocaleString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getAchievementLevel = () => {
    if (!stats) return 'Beginner';
    
    const { total_quizzes, average_score } = stats;
    
    if (total_quizzes >= 20 && average_score >= 85) return 'Expert';
    if (total_quizzes >= 10 && average_score >= 75) return 'Gevorderd';
    if (total_quizzes >= 5 && average_score >= 60) return 'Competent';
    if (total_quizzes >= 1) return 'Beginner';
    
    return 'Nieuw';
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Laden...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Stats Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Totale voortgang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.average_score ? Math.round(stats.average_score) : 0}%
            </div>
            <p className="text-sm text-muted-foreground">
              Gemiddelde score over alle quizzen
            </p>
            <Progress 
              value={stats?.average_score || 0} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>
        
        {/* Study Stats Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Studiemateriaal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold">{stats?.books_studied || 0}</div>
                <p className="text-xs text-muted-foreground">Boeken</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.chapters_studied || 0}</div>
                <p className="text-xs text-muted-foreground">Hoofdstukken</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.paragraphs_studied || 0}</div>
                <p className="text-xs text-muted-foreground">Paragrafen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Quiz Stats Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Quiz prestaties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold">{stats?.total_quizzes || 0}</div>
                <p className="text-xs text-muted-foreground">Quizzen gemaakt</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.total_correct_answers || 0}/{stats?.total_questions || 0}</div>
                <p className="text-xs text-muted-foreground">Goede antwoorden</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Achievement Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Achievement niveau</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Award className="h-10 w-10 text-yellow-500 mr-3" />
              <div>
                <div className="text-xl font-bold">{getAchievementLevel()}</div>
                <p className="text-xs text-muted-foreground">
                  Laatste activiteit: {formatDate(stats?.last_quiz_date || null)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recente activiteiten</CardTitle>
          <CardDescription>Je laatste quiz resultaten</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-study-600 mr-2" />
                    <div>
                      <p className="font-medium text-sm">{activity.book_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.chapter_id ? `Hoofdstuk ${activity.chapter_id}` : 'Volledige boek'} 
                        {activity.paragraph_id ? `, Paragraaf ${activity.paragraph_id}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Badge 
                      className={activity.percentage >= 70 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}
                    >
                      {activity.score}/{activity.total_questions} • {Math.round(activity.percentage)}%
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate(`/books/${activity.book_id}`)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpenCheck className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Je hebt nog geen quizzen gemaakt</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate('/books')}
                variant="outline"
              >
                Bekijk boeken
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Aanbevelingen</CardTitle>
          <CardDescription>Gebaseerd op je studiegedrag</CardDescription>
        </CardHeader>
        <CardContent>
          {stats && stats.total_quizzes > 0 ? (
            <div className="space-y-4">
              {stats.average_score < 70 && (
                <div className="flex items-start p-4 border rounded-md bg-amber-50 border-amber-200">
                  <BookOpen className="h-5 w-5 text-amber-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Herhaal je moeilijkste onderwerpen</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Je gemiddelde score is {Math.round(stats.average_score)}%. Probeer eerdere hoofdstukken nog eens te herhalen 
                      om je begrip te verbeteren.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
                      onClick={() => navigate('/books')}
                    >
                      Bekijk boeken
                    </Button>
                  </div>
                </div>
              )}
              
              {recentActivity.length > 0 && (
                <div className="flex items-start p-4 border rounded-md bg-green-50 border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">Ga verder waar je gebleven bent</p>
                    <p className="text-sm text-green-700 mt-1">
                      Je laatste studie activiteit was in "{recentActivity[0].book_title}".
                      Ga verder met je studie om consistente vooruitgang te boeken.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 bg-green-100 border-green-300 text-green-800 hover:bg-green-200"
                      onClick={() => navigate(`/books/${recentActivity[0].book_id}`)}
                    >
                      Doorgaan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Begin met studeren om persoonlijke aanbevelingen te krijgen</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate('/books')}
              >
                Start nu met leren
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;
