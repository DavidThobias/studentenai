
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, ArrowLeft, ChevronRight } from "lucide-react";

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  isStructuredLearning: boolean;
  hasNextParagraph: boolean;
  onRestart: () => void;
  onNextParagraph: () => void;
  onBackToBook: () => void;
}

const QuizResults = ({
  score,
  totalQuestions,
  isStructuredLearning,
  hasNextParagraph,
  onRestart,
  onNextParagraph,
  onBackToBook
}: QuizResultsProps) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  
  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="w-full max-w-md">
        <Progress 
          value={percentage} 
          className="h-6" 
        />
        <p className="text-center mt-2 text-sm text-muted-foreground">
          {percentage}% correct
        </p>
      </div>
      
      <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center">
        <span className="text-4xl font-bold">{score}/{totalQuestions}</span>
      </div>
      
      <p className="text-center text-lg">
        Je hebt {score} van de {totalQuestions} vragen goed beantwoord.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-md">
        <Button onClick={onRestart} variant="outline" className="flex-1">
          <RotateCcw className="mr-2 h-4 w-4" />
          Opnieuw proberen
        </Button>
        
        {isStructuredLearning && hasNextParagraph && (
          <Button onClick={onNextParagraph} className="flex-1 bg-green-600 hover:bg-green-700">
            Volgende paragraaf
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        
        {!isStructuredLearning && (
          <Button onClick={onBackToBook} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar boek
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizResults;
