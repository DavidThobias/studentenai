
import { useState, useEffect } from 'react';
import { Loader2, Brain } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface QuizLoadingProps {
  showDetailsAfter?: number; // Show details after this many seconds
}

const QuizLoading = ({ showDetailsAfter = 3 }: QuizLoadingProps) => {
  const [progress, setProgress] = useState(5);
  const [showDetails, setShowDetails] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'starting' | 'extracting' | 'generating' | 'formatting'>('starting');
  const [ellipsis, setEllipsis] = useState('');
  
  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Cap at 95% until complete
        return prev < 95 ? prev + 1 : prev;
      });
      
      // Rotate through loading phases
      if (progress > 20 && progress < 40) {
        setLoadingPhase('extracting');
      } else if (progress >= 40 && progress < 80) {
        setLoadingPhase('generating');
      } else if (progress >= 80) {
        setLoadingPhase('formatting');
      }
    }, 200);
    
    // Animate ellipsis
    const ellipsisInterval = setInterval(() => {
      setEllipsis(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);
    
    // Show details after delay
    const timer = setTimeout(() => {
      setShowDetails(true);
    }, showDetailsAfter * 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(ellipsisInterval);
      clearTimeout(timer);
    };
  }, [progress, showDetailsAfter]);
  
  const getPhaseDescription = () => {
    switch (loadingPhase) {
      case 'starting':
        return 'Starten van het proces';
      case 'extracting':
        return 'Gemarkeerde begrippen herkennen';
      case 'generating':
        return 'Vragen genereren voor alle begrippen';
      case 'formatting':
        return 'Antwoorden en uitleg formatteren';
      default:
        return 'Bezig met laden';
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="relative w-16 h-16">
        <Loader2 className="h-16 w-16 animate-spin text-primary absolute" />
        <div className="h-16 w-16 rounded-full border-2 border-muted-foreground/20 absolute"></div>
      </div>
      <div className="text-center">
        <h3 className="text-xl font-medium mb-2">Quiz wordt gegenereerd{ellipsis}</h3>
        <p className="text-muted-foreground">
          {showDetails ? getPhaseDescription() : 'We maken vragen specifiek voor deze paragraaf'}
        </p>
      </div>
      <Progress value={progress} className="w-full max-w-md h-2" />
      
      {showDetails && (
        <div className="text-sm text-muted-foreground max-w-md text-center">
          <p>Dit kan even duren als er veel begrippen zijn. Het systeem maakt een vraag voor elk gemarkeerd begrip uit de tekst.</p>
          <div className="flex items-center justify-center mt-3 gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span>De AI denkt na over de beste vragen</span>
          </div>
        </div>
      )}
      
      {!showDetails && (
        <p className="text-sm text-muted-foreground">
          Dit kan enkele seconden duren
        </p>
      )}
    </div>
  );
};

export default QuizLoading;
