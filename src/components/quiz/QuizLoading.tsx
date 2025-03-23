
import { Loader2 } from 'lucide-react';
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
      <Progress value={65} className="w-full max-w-md h-2" />
      <p className="text-sm text-muted-foreground">
        Dit kan enkele seconden duren
      </p>
    </div>
  );
};

export default QuizLoading;
