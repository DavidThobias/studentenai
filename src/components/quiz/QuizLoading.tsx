
import { Loader2, Brain } from 'lucide-react';
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
  const batchInfo = totalBatches > 1 ? 
    `Batch ${currentBatch + 1} van ${totalBatches}` : '';
  
  const termsInfo = totalTerms > 0 ? 
    `${processedTerms} van ${totalTerms} begrippen verwerkt` : '';
  
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="relative w-16 h-16">
        <Loader2 className="h-16 w-16 animate-spin text-primary absolute" />
        <div className="h-16 w-16 rounded-full border-2 border-muted-foreground/20 absolute"></div>
      </div>
      <div className="text-center">
        <h3 className="text-xl font-medium mb-2">Quiz wordt gegenereerd...</h3>
        <p className="text-muted-foreground">
          We maken vragen specifiek voor deze paragraaf
        </p>
        
        {totalBatches > 1 && (
          <p className="text-sm text-primary mt-1">
            {batchInfo}{termsInfo ? ` - ${termsInfo}` : ''}
          </p>
        )}
      </div>
      
      <Progress value={undefined} className="w-full max-w-md h-2" />
      
      <div className="text-sm text-muted-foreground max-w-md text-center">
        <p>Dit kan even duren als er veel begrippen zijn. Het systeem maakt een vraag voor elk gemarkeerd begrip uit de tekst.</p>
        <div className="flex items-center justify-center mt-3 gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span>De AI denkt na over de beste vragen</span>
        </div>
      </div>
    </div>
  );
};

export default QuizLoading;
