
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, ArrowLeft, ChevronRight, Trophy, Share } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  isStructuredLearning: boolean;
  hasNextParagraph: boolean;
  bookId: number | null;
  chapterId: number | null;
  paragraphId: number | null;
  onRestart: () => void;
  onNextParagraph: () => void;
  onBackToBook: () => void;
}

const QuizResults = ({
  score,
  totalQuestions,
  isStructuredLearning,
  hasNextParagraph,
  bookId,
  chapterId,
  paragraphId,
  onRestart,
  onNextParagraph,
  onBackToBook
}: QuizResultsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const percentage = Math.round((score / totalQuestions) * 100);
  const isPassing = percentage >= 70;
  
  // Automatically save results when component mounts
  useEffect(() => {
    saveResultsToDatabase();
  }, []);
  
  const saveResultsToDatabase = async () => {
    try {
      setIsSaving(true);
      
      // Check if a session exists
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Je moet ingelogd zijn om resultaten op te slaan");
        return;
      }
      
      if (!bookId) {
        toast.error("Boek-ID ontbreekt");
        return;
      }
      
      const { error } = await supabase
        .from('quiz_results')
        .insert({
          user_id: session.user.id,
          book_id: bookId,
          chapter_id: chapterId,
          paragraph_id: paragraphId,
          score: score,
          total_questions: totalQuestions,
          percentage: percentage,
          completed: true,
          completed_date: new Date().toISOString() // Add completed date
        });
      
      if (error) {
        console.error('Error saving quiz results:', error);
        toast.error("Er is een fout opgetreden bij het opslaan van je resultaten");
        return;
      }
      
      // If paragraph progress should be tracked
      if (isStructuredLearning && paragraphId) {
        // Check if there's an existing record
        const { data: existingProgress } = await supabase
          .from('paragraph_progress')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('paragraph_id', paragraphId)
          .maybeSingle();
          
        if (existingProgress) {
          // Update existing record
          await supabase
            .from('paragraph_progress')
            .update({
              completed: isPassing,
              score: score,
              total_questions: totalQuestions,
              percentage: percentage,
              last_attempted: new Date().toISOString(),
              completed_date: isPassing ? new Date().toISOString() : existingProgress.completed_date
            })
            .eq('id', existingProgress.id);
        } else {
          // Insert new record
          await supabase
            .from('paragraph_progress')
            .insert({
              user_id: session.user.id,
              paragraph_id: paragraphId,
              chapter_id: chapterId,
              book_id: bookId,
              completed: isPassing,
              score: score,
              total_questions: totalQuestions,
              percentage: percentage,
              completed_date: isPassing ? new Date().toISOString() : null
            });
        }
      }
      
      // Let's also store the quiz state in localStorage so it can be retrieved later
      const quizState = {
        bookId,
        chapterId,
        paragraphId,
        score,
        totalQuestions,
        percentage,
        isPassing,
        completedDate: new Date().toISOString()
      };
      
      // Save with a unique key based on book, chapter, paragraph
      const stateKey = `quizResult_${bookId}_${chapterId || 'all'}_${paragraphId || 'all'}`;
      localStorage.setItem(stateKey, JSON.stringify(quizState));
      
      // Also save a reference to the most recent quiz
      localStorage.setItem('lastCompletedQuiz', stateKey);
      
      toast.success("Quiz resultaten opgeslagen!");
      setIsSaved(true);
    } catch (error) {
      console.error('Error in saveResultsToDatabase:', error);
      toast.error("Er is een onverwachte fout opgetreden");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleShareResults = () => {
    // Create share text
    const shareText = `Ik heb ${score} van de ${totalQuestions} vragen goed beantwoord in mijn Sales quiz! Score: ${percentage}%`;
    
    // Check if the Web Share API is available
    if (navigator.share) {
      navigator.share({
        title: 'Mijn Quiz Resultaten',
        text: shareText,
      }).catch((error) => {
        console.error('Error sharing:', error);
        toast.error("Delen is niet gelukt");
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(shareText)
        .then(() => toast.success("Resultaten gekopieerd naar klembord"))
        .catch(() => toast.error("Kopiëren naar klembord is niet gelukt"));
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8">
      <Trophy className={`h-16 w-16 ${isPassing ? 'text-yellow-500' : 'text-gray-400'}`} />
      
      <div className="w-full max-w-md">
        <Progress 
          value={percentage} 
          className={`h-6 ${isPassing ? 'bg-green-100' : ''}`}
        />
        <p className="text-center mt-2 text-sm text-muted-foreground">
          {percentage}% correct
        </p>
      </div>
      
      <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center
        ${isPassing ? 'border-green-500 text-green-600' : 'border-orange-300 text-orange-600'}`}>
        <span className="text-4xl font-bold">{score}/{totalQuestions}</span>
      </div>
      
      <p className="text-center text-lg">
        Je hebt {score} van de {totalQuestions} vragen goed beantwoord.
      </p>
      
      {isStructuredLearning && (
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="font-medium mb-2 text-center">
              {isPassing 
                ? "Gefeliciteerd! Je kunt doorgaan naar de volgende paragraaf." 
                : "Je hebt minimaal 70% nodig om door te gaan. Probeer het nog eens."}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {isPassing 
                ? "Deze paragraaf is nu gemarkeerd als voltooid." 
                : "Lees de paragraaf nog eens door en probeer de quiz opnieuw."}
            </p>
          </CardContent>
        </Card>
      )}
      
      <div className="flex gap-3 mt-4">
        <Button 
          onClick={handleShareResults} 
          variant="outline"
          className="flex items-center gap-1"
        >
          <Share className="h-4 w-4" />
          Delen
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-md">
        <Button onClick={onRestart} variant="outline" className="flex-1 flex items-center justify-center gap-1">
          <RotateCcw className="h-4 w-4" />
          Opnieuw proberen
        </Button>
        
        {isStructuredLearning && hasNextParagraph && (
          <Button onClick={onNextParagraph} className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-1">
            Volgende paragraaf
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        
        {!isStructuredLearning || (!hasNextParagraph && isStructuredLearning) ? (
          <Button onClick={onBackToBook} className="flex-1 flex items-center justify-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Terug naar boek
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default QuizResults;
