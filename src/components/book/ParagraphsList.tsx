import { ListChecks, FileText, Loader2, DatabaseIcon, RefreshCcw, AlertTriangle, BookOpen, Trophy, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/context/AuthContext';

interface ParagraphData {
  id: number;
  paragraph_number?: number;
  content?: string;
  chapter_number: number;
}

interface QuizHistoryItem {
  id: string;
  completed_date?: string;
  created_at: string;
  score: number;
  total_questions: number;
  percentage: number;
  book_id: number;
  chapter_id?: number | null;
  paragraph_id?: number | null;
  user_id: string;
  completed: boolean;
}

interface TableInfoParams {
  table_name: string;
}

interface ParagraphsListProps {
  paragraphs: ParagraphData[];
  loadingParagraphs: boolean;
  onStartQuiz?: (chapterId: number, paragraphId?: number) => void;
  selectedChapterId?: number | null;
}

const ParagraphsList = ({ paragraphs, loadingParagraphs, onStartQuiz, selectedChapterId }: ParagraphsListProps) => {
  const navigate = useNavigate();
  const { id: bookId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [directDbCount, setDirectDbCount] = useState<number | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [edgeFunctionResult, setEdgeFunctionResult] = useState<any>(null);
  const [isTestingEdgeFunction, setIsTestingEdgeFunction] = useState(false);
  const [quizHistory, setQuizHistory] = useState<{ [paragraphId: number]: QuizHistoryItem[] }>({});
  const [loadingQuizHistory, setLoadingQuizHistory] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  
  const fetchQuizHistoryForAllParagraphs = useCallback(async () => {
    if (!user || !bookId || !selectedChapterId) return;
    
    try {
      setLoadingQuizHistory(true);
      
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('book_id', parseInt(bookId)) 
        .eq('chapter_id', selectedChapterId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching quiz history:', error);
        return;
      }
      
      const historyByParagraph: { [paragraphId: number]: QuizHistoryItem[] } = {};
      
      data?.forEach(item => {
        if (item.paragraph_id) {
          if (!historyByParagraph[item.paragraph_id]) {
            historyByParagraph[item.paragraph_id] = [];
          }
          
          historyByParagraph[item.paragraph_id].push({
            ...item,
            completed_date: item.created_at
          });
        }
      });
      
      setQuizHistory(historyByParagraph);
      console.log('Quiz history loaded:', historyByParagraph);
      
    } catch (err) {
      console.error('Error in fetchQuizHistoryForAllParagraphs:', err);
    } finally {
      setLoadingQuizHistory(false);
    }
  }, [user, bookId, selectedChapterId]);

  const fetchParagraphProgressData = useCallback(async () => {
    if (!user || !bookId || !selectedChapterId) return;
    
    try {
      const { data, error } = await supabase
        .from('paragraph_progress')
        .select('*')
        .eq('book_id', parseInt(bookId))
        .eq('chapter_id', selectedChapterId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error fetching paragraph progress:', error);
        return;
      }
      
      console.log('Paragraph progress loaded:', data);
      // We don't need to store this as it's mostly for logging/confirmation
      
    } catch (err) {
      console.error('Error in fetchParagraphProgressData:', err);
    }
  }, [user, bookId, selectedChapterId]);
  
  const manualRefresh = useCallback(() => {
    console.log('Manual refresh triggered');
    setLastRefreshTime(Date.now());
  }, []);
  
  useEffect(() => {
    console.log('ParagraphsList: paragraphs array updated:', paragraphs);
    console.log('ParagraphsList: loadingParagraphs:', loadingParagraphs);
    console.log('ParagraphsList: selectedChapterId:', selectedChapterId);
    
    if (paragraphs.length > 0 && user && bookId && selectedChapterId) {
      fetchQuizHistoryForAllParagraphs();
      fetchParagraphProgressData();
    }
  }, [paragraphs, loadingParagraphs, selectedChapterId, user, bookId, lastRefreshTime, fetchQuizHistoryForAllParagraphs, fetchParagraphProgressData]);

  useEffect(() => {
    if (!user || !bookId || !selectedChapterId) return;
    
    const channel = supabase
      .channel('paragraph-quiz-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_results',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Received real-time update for quiz_results:', payload);
          manualRefresh();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, bookId, selectedChapterId, manualRefresh]);
  
  useEffect(() => {
    if (!user || !bookId || !selectedChapterId) return;
    
    const channel = supabase
      .channel('paragraph-progress-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paragraph_progress',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Received real-time update for paragraph_progress:', payload);
          manualRefresh();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, bookId, selectedChapterId, manualRefresh]);

  const checkDatabaseDirectly = async () => {
    if (!selectedChapterId) return;
    
    try {
      setIsCheckingDb(true);
      const numericChapterId = Number(selectedChapterId);
      console.log('Checking database directly for paragraphs with chapter_number =', numericChapterId);
      
      const { count: totalCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });
        
      console.log('Total books/paragraphs in database:', totalCount);
      
      const { data: schemaData } = await supabase
        .rpc('get_table_info', { table_name: 'books' } as TableInfoParams);
      
      console.log('Table schema:', schemaData);
      
      const { data: chapterData, error: chapterError } = await supabase
        .from('books')
        .select('*')
        .eq('chapter_number', numericChapterId);
      
      console.log('Direct database check results:', {
        data: chapterData,
        error: chapterError,
        count: chapterData?.length || 0
      });
      
      let totalParagraphCount = chapterData?.length || 0;
      
      setDirectDbCount(totalParagraphCount);
    } catch (err) {
      console.error('Error checking database directly:', err);
      setDirectDbCount(null);
    } finally {
      setIsCheckingDb(false);
    }
  };
  
  const testEdgeFunction = async () => {
    if (!selectedChapterId) return;
    
    try {
      setIsTestingEdgeFunction(true);
      const numericChapterId = Number(selectedChapterId);
      console.log('Testing edge function with chapter_id =', numericChapterId);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';
      
      console.log('Access token available for edge function test:', !!accessToken);
      
      const response = await fetch('https://ncipejuazrewiizxtkcj.supabase.co/functions/v1/get-paragraphs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ chapterId: numericChapterId }),
      });
      
      console.log('Edge function response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Edge function response:', result);
        setEdgeFunctionResult(result);
      } else {
        const errorText = await response.text();
        console.error('Edge function error:', response.status, errorText);
        setEdgeFunctionResult({
          success: false,
          error: `Status ${response.status}: ${errorText || 'Unknown error'}`,
          status: response.status
        });
      }
    } catch (err) {
      console.error('Error testing edge function:', err);
      setEdgeFunctionResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsTestingEdgeFunction(false);
    }
  };

  const handleViewSummary = (paragraphId: number) => {
    if (bookId && selectedChapterId) {
      const params = new URLSearchParams();
      params.append('chapter', selectedChapterId.toString());
      params.append('paragraph', paragraphId.toString());
      
      navigate(`/books/${bookId}/summary?${params.toString()}`);
    }
  };

  const handleStartLearning = (paragraphId: number) => {
    if (bookId && selectedChapterId) {
      const params = new URLSearchParams();
      params.append('chapter', selectedChapterId.toString());
      params.append('paragraph', paragraphId.toString());
      
      navigate(`/books/${bookId}/learn?${params.toString()}`);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Datum onbekend';
    
    try {
      if (!/^\d{4}-\d{2}-\d{2}/.test(dateString) && isNaN(Date.parse(dateString))) {
        return 'Ongeldige datum';
      }
      
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Ongeldige datum';
      }
      
      // Calculate days difference for a more human-readable format
      const now = new Date();
      // Reset time part for accurate day comparison
      now.setHours(0, 0, 0, 0);
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(now.getTime() - compareDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Vandaag';
      } else if (diffDays === 1) {
        return 'Gisteren';
      } else if (diffDays < 7) {
        return `${diffDays} dagen geleden`;
      } else {
        return new Intl.DateTimeFormat('nl-NL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(date);
      }
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Datum fout';
    }
  };

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-semibold mb-6 flex justify-between items-center">
        <span>Paragrafen</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={manualRefresh} 
          className="flex items-center gap-1"
        >
          <RefreshCcw className={`h-4 w-4 ${loadingQuizHistory ? 'animate-spin' : ''}`} />
          Vernieuwen
        </Button>
      </h2>
      
      {loadingParagraphs ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Paragrafen laden...</p>
        </div>
      ) : paragraphs.length > 0 ? (
        <div className="space-y-4">
          {paragraphs.map((paragraph) => {
            const paragraphQuizHistory = quizHistory[paragraph.id] || [];
            const hasPreviousQuizzes = paragraphQuizHistory.length > 0;
            const latestQuiz = hasPreviousQuizzes ? paragraphQuizHistory[0] : null;
            
            return (
              <Card key={paragraph.id} className="transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex justify-between items-center">
                    <span>Paragraaf {paragraph.paragraph_number || "ID: " + paragraph.id}</span>
                    {latestQuiz && (
                      <Badge 
                        variant={latestQuiz.percentage >= 70 ? "secondary" : "outline"}
                        className={latestQuiz.percentage >= 70 ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                      >
                        Laatste score: {Math.round(latestQuiz.percentage)}%
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground whitespace-pre-line">
                      {paragraph.content ? 
                        paragraph.content.substring(0, 150) + (paragraph.content.length > 150 ? "..." : "") : 
                        'Geen inhoud beschikbaar'}
                    </p>
                    
                    {hasPreviousQuizzes && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                          Quiz Geschiedenis
                        </h4>
                        <div className="space-y-2">
                          {paragraphQuizHistory.slice(0, 2).map((quiz) => (
                            <div key={quiz.id} className="flex justify-between items-center text-sm p-2 rounded bg-slate-50">
                              <div>
                                <span className="font-medium">{quiz.score}/{quiz.total_questions}</span>
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {formatDate(quiz.created_at)}
                                </span>
                              </div>
                              {onStartQuiz && selectedChapterId && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => onStartQuiz(Number(selectedChapterId), paragraph.id)}
                                  className="h-7 px-2"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Opnieuw
                                </Button>
                              )}
                            </div>
                          ))}
                          
                          {paragraphQuizHistory.length > 2 && (
                            <div className="text-xs text-center text-muted-foreground">
                              +{paragraphQuizHistory.length - 2} meer pogingen
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => handleViewSummary(paragraph.id)}
                  >
                    <FileText className="h-4 w-4" />
                    Bekijk samenvatting
                  </Button>
                
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => handleStartLearning(paragraph.id)}
                  >
                    <BookOpen className="h-4 w-4" />
                    Start leren
                  </Button>
                
                  {onStartQuiz && selectedChapterId && (
                    <Button 
                      onClick={() => onStartQuiz(Number(selectedChapterId), paragraph.id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <ListChecks className="h-4 w-4" />
                      Quiz over paragraaf
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Geen paragrafen gevonden voor dit hoofdstuk. 
              Het kan zijn dat er nog geen paragrafen zijn toegevoegd.
            </p>
          </div>
          
          <Alert className="bg-blue-50 border-blue-200 mb-3">
            <DatabaseIcon className="h-4 w-4" />
            <AlertDescription className="ml-2">
              Debug informatie:
              <ul className="list-disc pl-5 mt-2">
                <li>Geselecteerde hoofdstuk ID: {selectedChapterId} (type: {typeof selectedChapterId})</li>
                <li>Huidige URL pad: {window.location.pathname}</li>
                <li>Paragrafen in array: {paragraphs.length}</li>
                <li>Tabel naam: books</li>
                <li>Query: SELECT * FROM "books" WHERE chapter_number = {selectedChapterId}</li>
                <li>Timestamp: {new Date().toISOString()}</li>
                <li>Direct DB check result: {directDbCount !== null ? `${directDbCount} paragrafen gevonden` : 'Niet gecontroleerd'}</li>
              </ul>
              
              <div className="mt-3 flex flex-wrap gap-2">
                <Button 
                  onClick={checkDatabaseDirectly} 
                  variant="outline" 
                  size="sm"
                  disabled={isCheckingDb || !selectedChapterId}
                >
                  <RefreshCcw className={`mr-2 h-4 w-4 ${isCheckingDb ? 'animate-spin' : ''}`} />
                  {isCheckingDb ? 'Database controleren...' : 'Database direct controleren'}
                </Button>
                
                <Button 
                  onClick={testEdgeFunction} 
                  variant="outline" 
                  size="sm"
                  disabled={isTestingEdgeFunction || !selectedChapterId}
                >
                  <RefreshCcw className={`mr-2 h-4 w-4 ${isTestingEdgeFunction ? 'animate-spin' : ''}`} />
                  {isTestingEdgeFunction ? 'Edge Function testen...' : 'Edge Function testen'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          {edgeFunctionResult && (
            <Alert className={edgeFunctionResult.success ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
              {edgeFunctionResult.success ? (
                <DatabaseIcon className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <AlertDescription className="ml-2">
                <p className="font-medium">Edge Function Test Resultaat:</p>
                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(edgeFunctionResult, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

export default ParagraphsList;
