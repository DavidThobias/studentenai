
import { Loader2 } from 'lucide-react';

const QuizLoading = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-center font-medium">Quiz wordt gegenereerd...</p>
      <p className="text-center text-sm text-muted-foreground mt-2">
        Dit kan enkele seconden duren
      </p>
    </div>
  );
};

export default QuizLoading;
