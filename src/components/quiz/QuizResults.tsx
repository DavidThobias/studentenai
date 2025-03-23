
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, ArrowLeft, ChevronRight, Trophy } from "lucide-react";

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
  const isPassing = percentage >= 70;
  
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
        <div className="bg-muted p-4 rounded-md text-center max-w-md">
          <p className="font-medium mb-2">
            {isPassing 
              ? "Gefeliciteerd! Je kunt doorgaan naar de volgende paragraaf." 
              : "Je hebt minimaal 70% nodig om door te gaan. Probeer het nog eens."}
          </p>
          <p className="text-sm text-muted-foreground">
            {isPassing 
              ? "Deze paragraaf is nu gemarkeerd als voltooid." 
              : "Lees de paragraaf nog eens door en probeer de quiz opnieuw."}
          </p>
        </div>
      )}
      
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
        
        {!isStructuredLearning || (!hasNextParagraph && isStructuredLearning) ? (
          <Button onClick={onBackToBook} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar boek
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default QuizResults;
