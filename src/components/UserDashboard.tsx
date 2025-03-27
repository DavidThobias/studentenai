
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, BookOpen, Trophy, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

interface RecentMaterial {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  type: 'quiz' | 'study';
  score?: number;
}

const UserDashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    studyProgress: 0,
    quizScore: 0,
    learningGoals: { completed: 0, total: 5 }
  });
  const [recentMaterials, setRecentMaterials] = useState<RecentMaterial[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchRecentActivity();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch quiz results to calculate average score
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (quizError) throw quizError;
      
      // Calculate average score from quiz results
      let averageScore = 0;
      if (quizData && quizData.length > 0) {
        const totalPercentage = quizData.reduce((sum, quiz) => sum + quiz.percentage, 0);
        averageScore = Math.round(totalPercentage / quizData.length);
      }
      
      // Fetch paragraph progress for study progress calculation
      const { data: progressData, error: progressError } = await supabase
        .from('paragraph_progress')
        .select('*')
        .eq('user_id', user?.id);
      
      if (progressError) throw progressError;
      
      // Calculate study progress
      let studyProgress = 0;
      if (progressData && progressData.length > 0) {
        const completedParagraphs = progressData.filter(p => p.completed).length;
        const totalParagraphs = progressData.length;
        studyProgress = Math.round((completedParagraphs / totalParagraphs) * 100) || 0;
      }
      
      // Fetch learning goals (simplified for now)
      const completedGoals = progressData ? 
        Math.min(Math.floor(progressData.filter(p => p.completed).length / 2), 5) : 0;
      
      setStats({
        studyProgress: studyProgress || 0,
        quizScore: averageScore || 0,
        learningGoals: { completed: completedGoals, total: 5 }
      });
      
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Get recent quiz results without using foreign key relationships
      const { data: quizResults, error: quizError } = await supabase
        .from('quiz_results')
        .select(`
          id,
          created_at,
          book_id,
          chapter_id,
          paragraph_id,
          percentage
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (quizError) throw quizError;
      
      // If we have quiz results, fetch the corresponding book titles
      if (quizResults && quizResults.length > 0) {
        // Get all book IDs from the quiz results
        const bookIds = quizResults.map(result => result.book_id);
        
        // Fetch book titles for those IDs
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('id, book_title')
          .in('id', bookIds);
        
        if (booksError) throw booksError;
        
        // Create a map of book ID to book title using JS to handle the deduplication
        const bookTitleMap: {[key: number]: string} = {};
        booksData?.forEach(book => {
          bookTitleMap[book.id] = book.book_title;
        });
        
        // Format the data for display
        const formattedResults = quizResults.map(result => {
          const daysDiff = calculateDaysDifference(new Date(result.created_at));
          const daysText = daysDiff === 0 
            ? 'vandaag' 
            : daysDiff === 1 
              ? 'gisteren' 
              : `${daysDiff} dagen geleden`;
          
          return {
            id: result.id,
            title: bookTitleMap[result.book_id] || 'Basisboek Sales',
            subtitle: `Hoofdstuk ${result.chapter_id || '?'}: Paragraaf ${result.paragraph_id || '?'}`,
            date: daysText,
            type: 'quiz',
            score: result.percentage
          };
        });
        
        setRecentMaterials(formattedResults);
      } else {
        setRecentMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentMaterials([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysDifference = (date: Date): number => {
    const today = new Date();
    // Reset time part for accurate day comparison
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today.getTime() - compareDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="grid gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Studievoortgang
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studyProgress}%</div>
            <p className="text-xs text-muted-foreground">
              van het studiemateriaal doorgenomen
            </p>
            <Progress value={stats.studyProgress} className="mt-3" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Scores</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quizScore}%</div>
            <p className="text-xs text-muted-foreground">
              gemiddelde score op quizzen
            </p>
            <Progress value={stats.quizScore} className="mt-3" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Leerdoelen
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.learningGoals.completed}/{stats.learningGoals.total}</div>
            <p className="text-xs text-muted-foreground">
              leerdoelen behaald
            </p>
            <Progress value={(stats.learningGoals.completed / stats.learningGoals.total) * 100} className="mt-3" />
          </CardContent>
        </Card>
      </div>
      
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Recent Studiemateriaal</CardTitle>
          <CardDescription>
            Bekijk je recent bekeken studiemateriaal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
              <span className="ml-2">Laden...</span>
            </div>
          ) : recentMaterials.length > 0 ? (
            <div className="space-y-4">
              {recentMaterials.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center space-x-3">
                    {item.type === 'quiz' ? (
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-study-600" />
                    )}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                      {item.score !== undefined && (
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                          Score: {Math.round(item.score)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="h-3 w-3 mr-1 opacity-70" />
                    {item.date}
                  </span>
                </div>
              ))}
              
              {recentMaterials.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">Je hebt nog geen recente activiteit</p>
                  <Link to="/books" className="text-primary hover:underline">
                    Bekijk beschikbare boeken
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">Je hebt nog geen recente activiteit</p>
              <Link to="/books" className="text-primary hover:underline">
                Bekijk beschikbare boeken
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;
