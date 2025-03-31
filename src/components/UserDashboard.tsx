
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Trophy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import QuizResultsAccordion from './QuizResultsAccordion';
import { Button } from '@/components/ui/button';

const UserDashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    studyProgress: 0,
    quizScore: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserStats();
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
      
      setStats({
        studyProgress: studyProgress || 0,
        quizScore: averageScore || 0
      });
      
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
      
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Begin met leren</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Selecteer een hoofdstuk en start direct met leren door een quiz te maken over het materiaal.
          </p>
          
          <Link to="/quiz">
            <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
              Begin met leren
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
      
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Quiz Resultaten</CardTitle>
        </CardHeader>
        <CardContent>
          <QuizResultsAccordion />
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;
