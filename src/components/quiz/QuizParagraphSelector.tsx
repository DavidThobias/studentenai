
import { Button } from "@/components/ui/button";
import { ChevronRight, BookOpen, History } from "lucide-react";

interface QuizParagraphSelectorProps {
  paragraphs: any[];
  onSelectFirstParagraph: () => void;
  hasExistingQuiz?: boolean;
  onContinueExistingQuiz?: () => void;
}

const QuizParagraphSelector = ({ 
  paragraphs, 
  onSelectFirstParagraph,
  hasExistingQuiz = false,
  onContinueExistingQuiz
}: QuizParagraphSelectorProps) => {
  return (
    <div className="text-center py-8">
      <h3 className="text-xl font-medium mb-4">Selecteer een paragraaf om te beginnen</h3>
      <p className="text-muted-foreground mb-6">
        Klik op een paragraaf in het zijpaneel om de paragraaf te bestuderen en vervolgens een quiz te maken.
      </p>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        {paragraphs.length > 0 && (
          <Button 
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            onClick={onSelectFirstParagraph}
          >
            <BookOpen className="h-4 w-4" />
            Start met eerste paragraaf
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
        
        {hasExistingQuiz && onContinueExistingQuiz && (
          <Button 
            variant="outline"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-md"
            onClick={onContinueExistingQuiz}
          >
            <History className="h-4 w-4" />
            Doorgaan met je laatste quiz
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizParagraphSelector;
