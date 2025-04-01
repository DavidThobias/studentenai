
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Trophy, ArrowRight, BarChart3, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import QuizResultsAccordion from './QuizResultsAccordion';
import { Button } from '@/components/ui/button';
import { motion } from "framer-motion";

const UserDashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    studyProgress: 0,
    quizScore: 0,
    totalQuizzes: 0,
    lastQuizDate: null as string | null
  });
  const [defaultBookId, setDefaultBookId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchDefaultBook();
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
      let lastQuizDate = null;
      if (quizData && quizData.length > 0) {
        const totalPercentage = quizData.reduce((sum, quiz) => sum + quiz.percentage, 0);
        averageScore = Math.round(totalPercentage / quizData.length);
        lastQuizDate = quizData[0].created_at;
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
      
      setStats({
        studyProgress: studyProgress || 0,
        quizScore: averageScore || 0,
        totalQuizzes: quizData?.length || 0,
        lastQuizDate: lastQuizDate
      });
      
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDefaultBook = async () => {
    try {
      // First try to get the most recently used book from quiz results
      const { data: recentQuiz, error: recentError } = await supabase
        .from('quiz_results')
        .select('book_id')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recentQuiz?.book_id) {
        setDefaultBookId(recentQuiz.book_id);
        return;
      }
      
      // If no recent quiz, just get the first available book
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('id, book_title')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (books?.id) {
        setDefaultBookId(books.id);
      }
    } catch (error) {
      console.error('Error fetching default book:', error);
    }
  };

  // Function to determine the color of the progress indicator based on the percentage
  const getProgressColor = (value: number) => {
    if (value >= 90) return "bg-green-500";
    if (value >= 70) return "bg-green-400";
    if (value >= 50) return "bg-yellow-400";
    return "bg-orange-400";
  };

  // Format date in a user-friendly way
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nog geen quiz gemaakt";
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return "Onbekende datum";
    }
  };

  return (
    <div className="grid gap-6 md:gap-8">
      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden border-l-4 border-l-blue-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Studievoortgang
            </CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studyProgress}%</div>
            <p className="text-xs text-muted-foreground">
              van het studiemateriaal doorgenomen
            </p>
            <Progress 
              value={stats.studyProgress} 
              className="mt-3 h-2 rounded-full"
              indicatorClassName={getProgressColor(stats.studyProgress)}
            />
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-l-4 border-l-purple-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Scores</CardTitle>
            <Trophy className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quizScore}%</div>
            <p className="text-xs text-muted-foreground">
              gemiddelde score op quizzen
            </p>
            <Progress 
              value={stats.quizScore} 
              className="mt-3 h-2 rounded-full" 
              indicatorClassName={getProgressColor(stats.quizScore)}
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-green-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Quizzes</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground">
              quizzen afgerond
            </p>
            <div className="h-2 mt-3"></div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-amber-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laatste Activiteit</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{formatDate(stats.lastQuizDate)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              laatste quiz gemaakt
            </p>
            <div className="h-2 mt-3"></div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="overflow-hidden border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle>Begin met leren</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Selecteer een hoofdstuk en start direct met leren door een quiz te maken over het materiaal.
            </p>
            
            <Link to={defaultBookId ? `/quiz?bookId=${defaultBookId}&structured=true` : "/quiz"}>
              <Button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700">
                Begin met leren
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="overflow-hidden border-t-4 border-t-purple-500">
          <CardHeader>
            <CardTitle>Quiz Resultaten</CardTitle>
          </CardHeader>
          <CardContent>
            <QuizResultsAccordion />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UserDashboard;
