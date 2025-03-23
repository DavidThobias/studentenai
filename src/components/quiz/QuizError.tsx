
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

interface QuizErrorProps {
  error: string | null;
  onBackToBook: () => void;
  onRetry: () => void;
}

const QuizError = ({ error, onBackToBook, onRetry }: QuizErrorProps) => {
  return (
    <>
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <div className="flex justify-between mt-4">
        <Button variant="outline" onClick={onBackToBook}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar boek
        </Button>
        <Button onClick={onRetry}>Probeer opnieuw</Button>
      </div>
    </>
  );
};

export default QuizError;
