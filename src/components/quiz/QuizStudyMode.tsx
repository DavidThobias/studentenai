
import { Button } from "@/components/ui/button";
import { PlayCircle } from 'lucide-react';
import ParagraphViewer from '@/components/ParagraphViewer';

interface QuizStudyModeProps {
  paragraphContent: string | null;
  paragraphNumber: number | null;
  onStartQuiz: () => void;
}

const QuizStudyMode = ({ 
  paragraphContent, 
  paragraphNumber,
  onStartQuiz 
}: QuizStudyModeProps) => {
  return (
    <div className="space-y-6">
      <ParagraphViewer 
        content={paragraphContent || ""}
        paragraphNumber={paragraphNumber || undefined}
      />
      
      <div className="flex justify-center mt-6">
        <Button 
          onClick={onStartQuiz}
          className="px-6 py-2 text-lg flex items-center gap-2"
          size="lg"
        >
          <PlayCircle className="h-5 w-5" />
          Start quiz over deze paragraaf
        </Button>
      </div>
    </div>
  );
};

export default QuizStudyMode;
