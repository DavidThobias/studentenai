import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  BarChart, 
  BookOpen, 
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpenCheck, 
  Clock, 
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface UserStats {
  total_quizzes: number;
  total_questions: number;
  total_correct_answers: number;
  average_score: number;
  books_studied: number;
  chapters_studied: number;
  paragraphs_studied: number;
  last_quiz_date: string | null;
  book_ids: number[];
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

interface ParagraphProgress {
  id: number;
  number: number;
  completed: boolean;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
}

interface ChapterProgress {
  id: number;
  title: string | null;
  progress: number;
  paragraphs: ParagraphProgress[];
}

interface BookProgress {
  id: number;
  title: string;
  overallProgress: number;
  chaptersProgress: ChapterProgress[];
  lastActive?: string;
}

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [booksProgress, setBooksProgress] = useState<BookProgress[]>([]);
  const [expandedBook, setExpandedBook] = useState<number | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<{[key: number]: boolean}>({});
  
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
          // Make sure viewData conforms to UserStats type
          const userStats: UserStats = {
            total_quizzes: viewData.total_quizzes || 0,
            total_questions: viewData.total_questions || 0,
            total_correct_answers: viewData.total_correct_answers || 0,
            average_score: viewData.average_score || 0,
            books_studied: viewData.books_studied || 0,
            chapters_studied: viewData.chapters_studied || 0,
            paragraphs_studied: viewData.paragraphs_studied || 0,
            last_quiz_date: viewData.last_quiz_date || null,
            book_ids: viewData.book_ids || []
          };
          
          setStats(userStats);
          
          // If we have book IDs from the stats, fetch their progress data
          if (userStats.book_ids && userStats.book_ids.length > 0) {
            await fetchBooksProgress(userStats.book_ids);
          }
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
            const bookIds = quizData.map(q => q.book_id);
            const booksStudied = new Set(bookIds).size;
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
              last_quiz_date: lastQuizDate,
              book_ids: Array.from(new Set(bookIds))
            });
            
            // Fetch book progress
            if (bookIds.length > 0) {
              await fetchBooksProgress(Array.from(new Set(bookIds)));
            }
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
              last_quiz_date: null,
              book_ids: []
            });
          }
        }
        
        // Fetch recent activity
        const { data: recentData, error: recentError } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (recentError) {
          console.error('Error fetching recent activity:', recentError);
          return;
        }
        
        if (recentData && recentData.length > 0) {
          // Fetch book titles for the book_ids we got from quiz_results
          const bookIds = recentData.map(item => item.book_id);
          const { data: booksData, error: booksError } = await supabase
            .from('books')
            .select('id, book_title')
            .in('id', bookIds);
            
          if (booksError) {
            console.error('Error fetching book titles:', booksError);
          }
          
          // Create a map of book_id -> book_title for quick lookups
          const bookTitleMap = new Map();
          if (booksData) {
            booksData.forEach(book => {
              if (!bookTitleMap.has(book.id)) {
                bookTitleMap.set(book.id, book.book_title);
              }
            });
          }
          
          const formattedActivity = recentData.map(item => ({
            id: item.id,
            book_id: item.book_id,
            book_title: bookTitleMap.get(item.book_id) || 'Onbekend boek',
            chapter_id: item.chapter_id,
            paragraph_id: item.paragraph_id,
            score: item.score,
            total_questions: item.total_questions,
            percentage: item.percentage,
            created_at: item.created_at
          }));
          
          setRecentActivity(formattedActivity);
          
          // Auto-expand the most recent book
          if (formattedActivity.length > 0) {
            setExpandedBook(formattedActivity[0].book_id);
          }
        }
      } catch (error) {
        console.error('Error in fetchUserStats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [user]);
  
  const fetchBooksProgress = async (bookIds: number[]) => {
    try {
      // First, get book titles
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('id, book_title')
        .in('id', bookIds);
        
      if (booksError) {
        console.error('Error fetching books:', booksError);
        return;
      }
      
      if (!booksData || booksData.length === 0) {
        return;
      }
      
      // Create a map for book titles
      const bookMap = new Map();
      booksData.forEach(book => {
        if (!bookMap.has(book.id)) {
          bookMap.set(book.id, book.book_title);
        }
      });
      
      // Now fetch progress data for each book
      const booksProgressData = await Promise.all(
        bookIds.map(async (bookId) => {
          // Get chapters for this book
          const { data: chaptersData, error: chaptersError } = await supabase
            .from('books')
            .select('chapter_number, chapter_title')
            .eq('book_id', bookId)
            .order('chapter_number');
            
          if (chaptersError) {
            console.error(`Error fetching chapters for book ${bookId}:`, chaptersError);
            return null;
          }
          
          // Deduplicate chapters
          const uniqueChapters = Array.from(
            new Map(chaptersData.map(ch => [ch.chapter_number, ch])).values()
          );
          
          // For each chapter, get paragraphs and their progress
          const chaptersProgress = await Promise.all(
            uniqueChapters.map(async (chapter) => {
              // Get paragraphs for this chapter
              const { data: paragraphsData, error: paragraphsError } = await supabase
                .from('books')
                .select('id, paragraph_number')
                .eq('book_id', bookId)
                .eq('chapter_number', chapter.chapter_number)
                .order('paragraph_number');
                
              if (paragraphsError) {
                console.error(`Error fetching paragraphs for chapter ${chapter.chapter_number}:`, paragraphsError);
                return null;
              }
              
              // Get progress for these paragraphs
              const { data: progressData, error: progressError } = await supabase
                .from('paragraph_progress')
                .select('*')
                .eq('user_id', user.id)
                .eq('book_id', bookId)
                .eq('chapter_id', chapter.chapter_number);
                
              if (progressError) {
                console.error(`Error fetching progress for chapter ${chapter.chapter_number}:`, progressError);
              }
              
              // Map progress data to paragraphs
              const paragraphsProgress = paragraphsData.map(paragraph => {
                const progress = progressData?.find(p => p.paragraph_id === paragraph.id);
                return {
                  id: paragraph.id,
                  number: paragraph.paragraph_number,
                  completed: progress?.completed || false,
                  score: progress?.score,
                  totalQuestions: progress?.total_questions,
                  percentage: progress?.percentage
                };
              });
              
              // Calculate chapter progress
              const completedParagraphs = paragraphsProgress.filter(p => p.completed).length;
              const chapterProgress = paragraphsData.length > 0 
                ? Math.round((completedParagraphs / paragraphsData.length) * 100) 
                : 0;
              
              return {
                id: chapter.chapter_number,
                title: chapter.chapter_title,
                progress: chapterProgress,
                paragraphs: paragraphsProgress
              };
            })
          );
          
          // Filter out null chapters
          const validChaptersProgress = chaptersProgress.filter(Boolean) as ChapterProgress[];
          
          // Calculate overall book progress
          const completedParagraphs = validChaptersProgress.reduce(
            (sum, chapter) => sum + chapter.paragraphs.filter(p => p.completed).length, 
            0
          );
          
          const totalParagraphs = validChaptersProgress.reduce(
            (sum, chapter) => sum + chapter.paragraphs.length, 
            0
          );
          
          const overallProgress = totalParagraphs > 0 
            ? Math.round((completedParagraphs / totalParagraphs) * 100) 
            : 0;
          
          // Get last activity for this book
          const { data: lastActivity, error: lastActivityError } = await supabase
            .from('quiz_results')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (lastActivityError) {
            console.error(`Error fetching last activity for book ${bookId}:`, lastActivityError);
          }
          
          return {
            id: bookId,
            title: bookMap.get(bookId) || `Boek ${bookId}`,
            overallProgress,
            chaptersProgress: validChaptersProgress,
            lastActive: lastActivity && lastActivity.length > 0 ? lastActivity[0].created_at : undefined
          };
        })
      );
      
      // Filter out null books and sort by last activity
      const validBooksProgress = booksProgressData
        .filter(Boolean) as BookProgress[];
        
      // Sort by last activity, most recent first
      validBooksProgress.sort((a, b) => {
        if (!a.lastActive) return 1;
        if (!b.lastActive) return -1;
        return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      });
      
      setBooksProgress(validBooksProgress);
    } catch (error) {
      console.error('Error in fetchBooksProgress:', error);
    }
  };
  
  const toggleChapter = (chapterId: number) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };
  
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
  
  const hasBooks = booksProgress && booksProgress.length > 0;
  
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
        
        {/* Last Activity Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Laatste activiteit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-10 w-10 text-blue-500 mr-3" />
              <div>
                <div className="text-sm">{formatDate(stats?.last_quiz_date || null)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Books Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Voortgang per boek</CardTitle>
          <CardDescription>Je studievoortgang per boek en hoofdstuk</CardDescription>
        </CardHeader>
        <CardContent>
          {hasBooks ? (
            <div className="space-y-4">
              <Accordion 
                type="multiple" 
                defaultValue={booksProgress.length > 0 ? [booksProgress[0].id.toString()] : []}
                className="space-y-2"
              >
                {booksProgress.map((book) => (
                  <AccordionItem 
                    key={book.id}
                    value={book.id.toString()} 
                    className="border rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center text-left">
                        <BookOpen className="h-5 w-5 text-study-600 mr-2 shrink-0" />
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <div className="flex items-center mt-1">
                            <Progress value={book.overallProgress} className="h-2 w-24 mr-2" />
                            <span className="text-xs text-muted-foreground">{book.overallProgress}% voltooid</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="pl-7 space-y-3 mt-2">
                        <Accordion type="multiple" className="space-y-2">
                          {book.chaptersProgress.map((chapter) => (
                            <AccordionItem 
                              key={chapter.id}
                              value={`${book.id}-${chapter.id}`} 
                              className="border rounded-lg overflow-hidden"
                            >
                              <AccordionTrigger className="px-3 py-2 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                                <div className="flex items-center text-left">
                                  <div>
                                    <p className="font-medium text-sm">Hoofdstuk {chapter.id}: {chapter.title}</p>
                                    <div className="flex items-center mt-1">
                                      <Progress value={chapter.progress} className="h-1.5 w-20 mr-2" />
                                      <span className="text-xs text-muted-foreground">{chapter.progress}% voltooid</span>
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3">
                                <div className="pl-4 space-y-2 mt-2">
                                  {chapter.paragraphs.map((paragraph) => (
                                    <div key={paragraph.id} className="flex items-center justify-between p-2 border rounded-md">
                                      <div className="flex items-center">
                                        {paragraph.completed ? (
                                          <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                                        ) : (
                                          <div className="h-4 w-4 rounded-full bg-gray-200 mr-2"></div>
                                        )}
                                        <p className="text-sm">Paragraaf {paragraph.number}</p>
                                      </div>
                                      {paragraph.completed && paragraph.percentage !== undefined && (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                          {Math.round(paragraph.percentage)}%
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                      <div className="mt-3 pl-7">
                        <Button 
                          size="sm" 
                          onClick={() => navigate(`/books/${book.id}`)}
                          variant="outline"
                          className="mt-2"
                        >
                          Ga naar boek
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpenCheck className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Je hebt nog geen boeken bestudeerd</p>
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
                  <BookOpenCheck className="h-5 w-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
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
