
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import BookHeader from '@/components/book/BookHeader';
import BookOverview from '@/components/book/BookOverview';
import UpcomingFeatures from '@/components/book/UpcomingFeatures';
import LoadingBookDetail from '@/components/book/LoadingBookDetail';
import { useBookDetail } from '@/hooks/useBookDetail';
import { toast } from "sonner";
import Layout from '@/components/Layout';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuizHistoryItem {
  id: string;
  completed_date: string;
  score: number;
  total_questions: number;
  percentage: number;
}

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { 
    book, 
    chapters, 
    paragraphs, 
    loading: bookLoading, 
    loadingParagraphs, 
    error, 
    fetchParagraphs,
    selectedChapterId
  } = useBookDetail(id);

  // Fetch quiz history for this book when component mounts
  useEffect(() => {
    if (user && id) {
      fetchQuizHistory();
    }
  }, [user, id]);

  const fetchQuizHistory = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('book_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) {
        console.error('Error fetching quiz history:', error);
        return;
      }
      
      setQuizHistory(data || []);
    } catch (err) {
      console.error('Error in fetchQuizHistory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = (chapterId: number, paragraphId?: number) => {
    console.log(`Starting quiz for chapter ID: ${chapterId}${paragraphId ? `, paragraph ID: ${paragraphId}` : ''}`);
    
    if (!book?.id) {
      toast.error('Boek informatie ontbreekt');
      return;
    }
    
    // Navigate to quiz page with parameters
    const params = new URLSearchParams();
    params.append('bookId', book.id.toString());
    params.append('chapterId', chapterId.toString());
    
    if (paragraphId) {
      params.append('paragraphId', paragraphId.toString());
    }
    
    // Add structured parameter to indicate we want structured learning
    params.append('structured', 'true');
    
    navigate(`/quiz?${params.toString()}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Check if this is the Sales book
  const isSalesBook = book?.book_title?.toLowerCase().includes('sales');

  if (bookLoading) {
    return (
      <Layout>
        <div className="pt-28 pb-20 px-6">
          <LoadingBookDetail />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <BookHeader 
            title={book?.book_title} 
            author={book?.author_name || 'Onbekende auteur'} 
          />

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <BookOverview book={book} />

          {/* Quiz History Section */}
          {quizHistory.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-semibold mb-8">Jouw Quiz Geschiedenis</h2>
              <div className="space-y-4">
                {quizHistory.map((quiz) => (
                  <Card key={quiz.id} className="border-l-4 border-study-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center">
                          <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                          Quiz Resultaat
                        </div>
                        <div className="text-sm font-normal text-muted-foreground">
                          {formatDate(quiz.completed_date)}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg font-medium">
                            Score: {quiz.score}/{quiz.total_questions} ({Math.round(quiz.percentage)}%)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {quiz.percentage >= 70 ? 'Geslaagd!' : 'Niet geslaagd'}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStartQuiz(selectedChapterId || 1)}
                          className="flex items-center gap-1"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Opnieuw proberen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <UpcomingFeatures />
        </div>
      </div>
    </Layout>
  );
};

export default BookDetail;
