
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, HelpCircle, ArrowRight, Eye, Calculator } from "lucide-react";
import { QuizQuestion } from "@/hooks/useQuiz";
import { useEffect, useState } from "react";
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
  currentParagraphContent: string | null;
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
  // Add local state to ensure UI is properly reset between questions
  const [localSelectedAnswer, setLocalSelectedAnswer] = useState<number | null>(selectedAnswer);
  
  // Format the paragraph content for better rendering with null check
  const formattedParagraphContent = currentParagraphContent 
    ? currentParagraphContent
        .replace(/\*\*(.*?)\*\*/g, "\n\n**$1**\n\n")
        .replace(/^-\s/gm, "\n- ")
        .replace(/^(\d+)\.\s/gm, "\n$1. ")
        .replace(/\n{3,}/g, "\n\n")
    : "";
  
  // Check if question contains a calculation or table (for different styling)
  const containsTable = question.question.includes('|---|') || question.question.includes('<table>');
  const containsCalculation = question.question.includes('berekening') || 
                             question.question.includes('bereken') || 
                             question.question.includes('calculatie');
  
  // Reset local state when question changes or when parent state is reset
  useEffect(() => {
    setLocalSelectedAnswer(selectedAnswer);
    console.log(`Question changed to ${currentQuestionIndex}, syncing selection state to ${selectedAnswer}`);
  }, [currentQuestionIndex, question.question, selectedAnswer]);
  
  // Handle local selection and propagate to parent
  const handleLocalAnswerSelect = (value: string) => {
    const index = parseInt(value);
    setLocalSelectedAnswer(index);
    onAnswerSelect(index);
  };
  
  // Create a function to generate a safe display for explanations that avoids references to specific options
  const getSafeExplanation = () => {
    if (!question.explanation) return "";
    
    // Return the explanation as-is since we've updated the backend to avoid option-specific references
    return question.explanation;
  };
  
  // Function to clean up option text to show just the concept name without explanation
  const cleanOptionText = (option: string) => {
    // Remove any A., B., C., D. prefixes
    let cleaned = option.replace(/^[A-D][:.]\s*/, '');
    
    // If there's a colon with explanation, take only the part before it
    // This pattern matches a concept name followed by a colon and explanation
    if (cleaned.includes(':') && !cleaned.startsWith('http')) {
      const parts = cleaned.split(/:(.*)/s);
      if (parts.length >= 2) {
        cleaned = parts[0].trim();
      }
    }
    
    // If there's a dash with explanation, take only the part before it
    // This pattern matches a concept name followed by a dash and explanation
    if (cleaned.includes(' - ')) {
      const parts = cleaned.split(/ - (.*)/s);
      if (parts.length >= 2) {
        cleaned = parts[0].trim();
      }
    }
    
    // For options that have a "waarbij" explanation
    if (cleaned.includes(' waarbij ')) {
      cleaned = cleaned.split(' waarbij ')[0].trim();
    }
    
    // For options that have a "die" explanation
    if (cleaned.includes(' die ')) {
      cleaned = cleaned.split(' die ')[0].trim();
    }
    
    return cleaned;
  };
  
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
        <CardTitle className="text-lg flex items-start gap-2">
          {containsCalculation && <Calculator className="h-5 w-5 text-blue-500 shrink-0 mt-1" />}
          <div className={`${containsTable ? 'overflow-x-auto w-full' : ''}`}>
            <ReactMarkdown>{question.question}</ReactMarkdown>
          </div>
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
          value={localSelectedAnswer !== null ? localSelectedAnswer.toString() : undefined}
          onValueChange={handleLocalAnswerSelect}
          className="space-y-3"
          disabled={isAnswerSubmitted}
        >
          {question.options.map((option, index) => {
            // Clean the option text to show just the concept without explanation
            const cleanedOption = cleanOptionText(option);
            
            return (
              <div
                key={`question-${currentQuestionIndex}-option-${index}`}
                className={`flex items-center space-x-2 rounded-lg border p-4 ${
                  isAnswerSubmitted
                    ? index === question.correctAnswer
                      ? 'border-green-500 bg-green-50'
                      : index === localSelectedAnswer
                      ? 'border-red-500 bg-red-50'
                      : ''
                    : 'hover:border-primary'
                }`}
              >
                <RadioGroupItem value={index.toString()} id={`option-${currentQuestionIndex}-${index}`} />
                <Label htmlFor={`option-${currentQuestionIndex}-${index}`} className="flex-grow cursor-pointer">
                  <ReactMarkdown>{cleanedOption}</ReactMarkdown>
                </Label>
                {isAnswerSubmitted && (
                  <div className="ml-2">
                    {index === question.correctAnswer ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : index === localSelectedAnswer ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </RadioGroup>

        {isAnswerSubmitted && showExplanation && (
          <Alert className="mt-4">
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>Uitleg</AlertTitle>
            <AlertDescription>
              <ReactMarkdown>{getSafeExplanation()}</ReactMarkdown>
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
              disabled={localSelectedAnswer === null}
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
