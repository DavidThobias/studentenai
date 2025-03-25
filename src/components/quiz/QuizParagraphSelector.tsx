
import { Button } from "@/components/ui/button";

interface QuizParagraphSelectorProps {
  paragraphs: any[];
  onSelectFirstParagraph: () => void;
}

const QuizParagraphSelector = ({ 
  paragraphs, 
  onSelectFirstParagraph 
}: QuizParagraphSelectorProps) => {
  return (
    <div className="text-center py-8">
      <h3 className="text-xl font-medium mb-4">Selecteer een paragraaf om te beginnen</h3>
      <p className="text-muted-foreground mb-6">
        Klik op een paragraaf in het zijpaneel om de paragraaf te bestuderen en vervolgens een quiz te maken.
      </p>
      {paragraphs.length > 0 && (
        <Button 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          onClick={onSelectFirstParagraph}
        >
          Start met eerste paragraaf
        </Button>
      )}
    </div>
  );
};

export default QuizParagraphSelector;
