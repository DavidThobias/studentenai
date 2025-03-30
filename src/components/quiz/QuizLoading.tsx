
import { useState, useEffect } from 'react';
import { Loader2, Brain, Database, CheckCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface QuizLoadingProps {
  showDetailsAfter?: number; // Show details after this many seconds
  currentBatch?: number;
  totalBatches?: number;
  processedTerms?: number;
  totalTerms?: number;
}

const QuizLoading = ({ 
  showDetailsAfter = 3, 
  currentBatch = 0, 
  totalBatches = 1, 
  processedTerms = 0, 
  totalTerms = 0 
}: QuizLoadingProps) => {
  const [progress, setProgress] = useState(5);
  const [showDetails, setShowDetails] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'starting' | 'extracting' | 'generating' | 'formatting'>('starting');
  const [ellipsis, setEllipsis] = useState('');
  
  // Simulate progress for current batch
  useEffect(() => {
    // Calculate overall progress including already processed batches
    // Each batch counts for a portion of the total progress (up to 95%)
    const batchProgress = totalBatches > 0 ? 
      ((currentBatch / totalBatches) * 100) : 0;
    
    // Start the progress for this batch from the previous batch completion point
    const startProgress = Math.min(batchProgress, 95);
    
    // If it's the last batch, let the progress complete to 100%
    const isLastBatch = currentBatch === totalBatches - 1;
    const maxProgress = isLastBatch ? 100 : 
      Math.min(((currentBatch + 1) / totalBatches) * 100, 95);
    
    setProgress(startProgress);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        // Approach but don't exceed maxProgress
        const increment = (maxProgress - prev) / 10;
        const newProgress = prev + Math.max(0.5, increment);
        return newProgress < maxProgress ? newProgress : maxProgress;
      });
      
      // Set loading phase based on progress within the current batch
      const batchRelativeProgress = (progress - startProgress) / (maxProgress - startProgress) * 100;
      
      if (batchRelativeProgress < 25) {
        setLoadingPhase('starting');
      } else if (batchRelativeProgress < 50) {
        setLoadingPhase('extracting');
      } else if (batchRelativeProgress < 75) {
        setLoadingPhase('generating');
      } else {
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
  }, [currentBatch, totalBatches, showDetailsAfter]);
  
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
  
  const getBatchProgress = () => {
    if (totalBatches <= 1) return '';
    
    return `Verwerkt ${processedTerms} van ${totalTerms} begrippen (Batch ${currentBatch + 1} van ${totalBatches})`;
  };
  
  const getCompletedBatches = () => {
    if (currentBatch === 0) return null;
    
    return (
      <div className="mt-3 flex items-center justify-center text-xs text-primary">
        <CheckCircle className="h-3 w-3 mr-1" />
        <span>{currentBatch} batch{currentBatch !== 1 ? 'es' : ''} voltooid</span>
      </div>
    );
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
        
        {totalBatches > 1 && (
          <p className="text-sm text-primary mt-1">
            {getBatchProgress()}
          </p>
        )}
        
        {getCompletedBatches()}
      </div>
      
      <Progress value={progress} className="w-full max-w-md h-2" />
      
      {showDetails && (
        <div className="text-sm text-muted-foreground max-w-md text-center">
          <p>Dit kan even duren als er veel begrippen zijn. Het systeem maakt een vraag voor elk gemarkeerd begrip uit de tekst.</p>
          <div className="flex items-center justify-center mt-3 gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span>De AI denkt na over de beste vragen</span>
          </div>
          
          {totalTerms > 15 && (
            <div className="flex items-center justify-center mt-2 gap-2">
              <Database className="h-4 w-4 text-amber-500" />
              <span>Grote hoeveelheid begrippen ({totalTerms}) gevonden - wordt in batches verwerkt</span>
            </div>
          )}
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
