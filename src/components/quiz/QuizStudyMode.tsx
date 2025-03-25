
import { Button } from "@/components/ui/button";
import { BookOpen, Play, History } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface QuizStudyModeProps {
  paragraphContent: string | null;
  paragraphNumber: number | null;
  onStartQuiz: () => void;
  hasExistingQuiz?: boolean;
  onContinueExistingQuiz?: () => void;
}

const QuizStudyMode = ({ 
  paragraphContent, 
  paragraphNumber,
  onStartQuiz,
  hasExistingQuiz = false,
  onContinueExistingQuiz
}: QuizStudyModeProps) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-xl font-medium">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3>Paragraaf {paragraphNumber}</h3>
      </div>

      <div className="prose prose-sm sm:prose-base max-w-none mb-6 p-4 bg-card rounded-md shadow-sm">
        {paragraphContent ? (
          <ReactMarkdown>{paragraphContent}</ReactMarkdown>
        ) : (
          <p className="text-muted-foreground">Geen inhoud beschikbaar voor deze paragraaf.</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start mt-4">
        <Button 
          onClick={onStartQuiz}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          <Play className="mr-2 h-4 w-4" />
          Start quiz over deze paragraaf
        </Button>

        {hasExistingQuiz && onContinueExistingQuiz && (
          <Button 
            variant="outline"
            onClick={onContinueExistingQuiz}
            className="px-4 py-2 rounded-md"
          >
            <History className="mr-2 h-4 w-4" />
            Doorgaan met je laatste quiz
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizStudyMode;
