
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, HelpCircle, ArrowRight, Eye } from "lucide-react";
import { QuizQuestion } from "@/hooks/useQuiz";
import { useEffect } from "react";
import ReactMarkdown from 'react-markdown';

interface QuizQuestionProps {
  question: QuizQuestion;
  currentQuestionIndex: number;
  questionsTotal: number;
  selectedAnswer: number | null;
  isAnswerSubmitted: boolean;
  score: number;
  showExplanation: boolean;
  showParagraphContent: boolean;
  currentParagraphContent: string;
  structuredLearning: boolean;
  onAnswerSelect: (index: number) => void;
  onSubmitAnswer: () => void;
  onNextQuestion: () => void;
  onToggleExplanation: () => void;
  onToggleParagraphContent: () => void;
}

const QuizQuestionComponent = ({
  question,
  currentQuestionIndex,
  questionsTotal,
  selectedAnswer,
  isAnswerSubmitted,
  score,
  showExplanation,
  showParagraphContent,
  currentParagraphContent,
  structuredLearning,
  onAnswerSelect,
  onSubmitAnswer,
  onNextQuestion,
  onToggleExplanation,
  onToggleParagraphContent
}: QuizQuestionProps) => {
  // Reset focus on radio buttons when moving to next question
  useEffect(() => {
    // When the question changes or when the answer is reset, clear any active focus
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }
    
    // Force clear any radio selections in the DOM
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    radioInputs.forEach((radio: Element) => {
      const radioElement = radio as HTMLInputElement;
      radioElement.checked = false;
    });
  }, [currentQuestionIndex, selectedAnswer]);
  
  // Format the paragraph content for better rendering
  const formattedParagraphContent = currentParagraphContent
    .replace(/\*\*(.*?)\*\*/g, "\n\n**$1**\n\n")
    .replace(/^-\s/gm, "\n- ")
    .replace(/^(\d+)\.\s/gm, "\n$1. ")
    .replace(/\n{3,}/g, "\n\n");
  
  return (
    <Card className="border-2 max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium text-muted-foreground">
            Vraag {currentQuestionIndex + 1} van {questionsTotal}
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            Score: {score} / {isAnswerSubmitted ? currentQuestionIndex + 1 : currentQuestionIndex}
          </div>
        </div>
        <Progress 
          value={(currentQuestionIndex / questionsTotal) * 100} 
          className="h-2 mb-2" 
        />
        <CardTitle className="text-lg">
          {question.question}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {structuredLearning && showParagraphContent && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md border">
            <h3 className="font-medium mb-2">Paragraaf inhoud:</h3>
            <div className="text-sm study-content overflow-y-auto max-h-60">
              <div className="react-markdown-content">
                <ReactMarkdown>{formattedParagraphContent}</ReactMarkdown>
              </div>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={onToggleParagraphContent}
              className="mt-2"
            >
              Verberg inhoud
            </Button>
          </div>
        )}
        
        <RadioGroup
          value={selectedAnswer?.toString()}
          onValueChange={(value) => onAnswerSelect(parseInt(value))}
          className="space-y-3"
          disabled={isAnswerSubmitted}
        >
          {question.options.map((option, index) => (
            <div
              key={`${currentQuestionIndex}-${index}`}
              className={`flex items-center space-x-2 rounded-lg border p-4 ${
                isAnswerSubmitted
                  ? index === question.correctAnswer
                    ? 'border-green-500 bg-green-50'
                    : index === selectedAnswer
                    ? 'border-red-500 bg-red-50'
                    : ''
                  : 'hover:border-primary'
              }`}
            >
              <RadioGroupItem value={index.toString()} id={`option-${currentQuestionIndex}-${index}`} />
              <Label htmlFor={`option-${currentQuestionIndex}-${index}`} className="flex-grow cursor-pointer">
                {option}
              </Label>
              {isAnswerSubmitted && (
                <div className="ml-2">
                  {index === question.correctAnswer ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : index === selectedAnswer ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </RadioGroup>

        {/* Always show explanation when answer is submitted, no need for toggle anymore */}
        {isAnswerSubmitted && (
          <Alert className="mt-4">
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>Uitleg</AlertTitle>
            <AlertDescription>
              {question.explanation}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-2">
          {structuredLearning && !showParagraphContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleParagraphContent}
            >
              <Eye className="mr-2 h-4 w-4" />
              Toon paragraaf
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isAnswerSubmitted ? (
            <Button
              onClick={onSubmitAnswer}
              disabled={selectedAnswer === null}
            >
              Controleer antwoord
            </Button>
          ) : (
            <Button onClick={onNextQuestion} className="animate-pulse">
              {currentQuestionIndex < questionsTotal - 1 ? (
                <>
                  Volgende vraag
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                'Bekijk resultaten'
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default QuizQuestionComponent;
