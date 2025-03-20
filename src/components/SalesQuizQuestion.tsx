
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Eye, EyeOff, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuiz } from '@/hooks/useQuiz';
import Quiz from '@/components/Quiz';

interface DebugData {
  prompt?: string;
  response?: any;
}

interface SalesQuizQuestionProps {
  showDebug?: boolean;
  bookId?: number;
}

const SalesQuizQuestion = ({ showDebug = false, bookId }: SalesQuizQuestionProps) => {
  const [debugData, setDebugData] = useState<DebugData>({});
  const [debugAccordion, setDebugAccordion] = useState<string | null>(null);
  const [showDebugSection, setShowDebugSection] = useState(showDebug);
  const [quizOpen, setQuizOpen] = useState(false);

  const {
    questions,
    isGenerating,
    quizError,
    generateSalesQuiz,
    currentQuestionIndex,
    selectedAnswer,
    isAnswerSubmitted,
    score,
    isQuizComplete,
    handleAnswerSelect,
    handleSubmitAnswer,
    handleNextQuestion,
    restartQuiz
  } = useQuiz();

  const handleStartQuiz = async () => {
    // Generate 5 sales questions at once
    await generateSalesQuiz(5);
    setQuizOpen(true);
  };

  const handleCloseQuiz = () => {
    setQuizOpen(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!quizOpen ? (
        <div className="flex flex-col items-center gap-4">
          <Button 
            onClick={handleStartQuiz} 
            disabled={isGenerating}
            size="lg"
            className="bg-study-600 hover:bg-study-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Quiz genereren...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-5 w-5" />
                Genereer een quiz over sales (5 vragen)
              </>
            )}
          </Button>
          
          {showDebug && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDebugSection(!showDebugSection)}
              className="text-xs"
            >
              {showDebugSection ? (
                <>
                  <EyeOff className="mr-1 h-3 w-3" />
                  Verberg debug info
                </>
              ) : (
                <>
                  <Eye className="mr-1 h-3 w-3" />
                  Toon debug info
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <Quiz 
          questions={questions} 
          onClose={handleCloseQuiz} 
          open={quizOpen} 
          title="Quiz: Basisboek Sales"
          error={quizError}
          isGenerating={isGenerating}
          currentQuestionIndex={currentQuestionIndex}
          selectedAnswer={selectedAnswer}
          isAnswerSubmitted={isAnswerSubmitted}
          score={score}
          isQuizComplete={isQuizComplete}
          handleAnswerSelect={handleAnswerSelect}
          handleSubmitAnswer={handleSubmitAnswer}
          handleNextQuestion={handleNextQuestion}
          restartQuiz={restartQuiz}
        />
      )}
      
      {/* Debug section (shown if we have debug data and it's enabled) */}
      {showDebug && showDebugSection && debugData.prompt && (
        <Card className="mt-6 border border-gray-200 rounded-md overflow-hidden">
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={debugAccordion || undefined}
            onValueChange={(value) => setDebugAccordion(value)}
          >
            <AccordionItem value="prompt">
              <AccordionTrigger className="px-4 py-2 bg-gray-50 text-sm">
                OpenAI Prompt
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-gray-50 text-xs font-mono whitespace-pre-wrap">
                {debugData.prompt || 'Geen prompt beschikbaar'}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="response">
              <AccordionTrigger className="px-4 py-2 bg-gray-50 text-sm">
                OpenAI Response
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-gray-50 text-xs font-mono whitespace-pre-wrap">
                {debugData.response ? 
                  JSON.stringify(debugData.response, null, 2) : 
                  'Geen response beschikbaar'}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      )}
    </div>
  );
};

export default SalesQuizQuestion;
