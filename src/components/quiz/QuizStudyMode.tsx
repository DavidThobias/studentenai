
import { Button } from "@/components/ui/button";
import { BookOpen, Play, History, ArrowLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from "@/components/ui/card";

interface QuizStudyModeProps {
  paragraphContent: string | null;
  paragraphNumber: number | null;
  onStartQuiz: () => void;
  hasExistingQuiz?: boolean;
  onContinueExistingQuiz?: () => void;
  onBackToParagraphSelection?: () => void;
}

const QuizStudyMode = ({ 
  paragraphContent, 
  paragraphNumber,
  onStartQuiz,
  hasExistingQuiz = false,
  onContinueExistingQuiz,
  onBackToParagraphSelection
}: QuizStudyModeProps) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-xl font-medium">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3>Paragraaf {paragraphNumber}</h3>
      </div>

      <Card className="mb-6 shadow-sm">
        <CardContent className="p-6">
          <div className="prose prose-sm sm:prose-base max-w-none">
            {paragraphContent ? (
              <ReactMarkdown>{paragraphContent}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">Geen inhoud beschikbaar voor deze paragraaf.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start mt-4">
        {onBackToParagraphSelection && (
          <Button 
            variant="outline"
            onClick={onBackToParagraphSelection}
            className="flex items-center gap-2 px-4 py-2 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar paragraaf overzicht
          </Button>
        )}
        
        <Button 
          onClick={onStartQuiz}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Play className="h-4 w-4" />
          Start quiz over deze paragraaf
        </Button>

        {hasExistingQuiz && onContinueExistingQuiz && (
          <Button 
            variant="outline"
            onClick={onContinueExistingQuiz}
            className="flex items-center gap-2 px-4 py-2 rounded-md"
          >
            <History className="h-4 w-4" />
            Doorgaan met je laatste quiz
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizStudyMode;
