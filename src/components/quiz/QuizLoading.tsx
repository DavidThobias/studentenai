
import { Loader2, Brain } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

const QuizLoading = () => {
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
