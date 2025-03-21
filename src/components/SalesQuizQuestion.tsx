
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Brain, Eye, EyeOff, ArrowRight, Bug } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Quiz, { QuizQuestion } from "./Quiz";

interface QuestionData {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface DebugData {
  prompt?: string;
  response?: any;
}

interface SalesQuizQuestionProps {
  showDebug?: boolean;
  bookId?: number;
}

const SalesQuizQuestion = ({ showDebug = false, bookId }: SalesQuizQuestionProps) => {
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<DebugData>({});
  const [debugAccordion, setDebugAccordion] = useState<string | null>(null);
  const [showDebugSection, setShowDebugSection] = useState(showDebug);
  
  // Quiz state
  const [quizOpen, setQuizOpen] = useState(false);
  const [questions, setQuestions] = useState<Array<QuizQuestion>>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  
  // Debug state for tracking quiz progression
  const [stateLog, setStateLog] = useState<string[]>([]);
  
  // Add debug log function
  const addLog = (message: string) => {
    console.log(`[QUIZ DEBUG] ${message}`);
    setStateLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Log state changes
  useEffect(() => {
    if (quizOpen) {
      addLog(`Quiz state update: currentQuestion=${currentQuestionIndex}, totalQuestions=${questions.length}, isAnswerSubmitted=${isAnswerSubmitted}, score=${score}`);
    }
  }, [quizOpen, currentQuestionIndex, isAnswerSubmitted, score, questions.length]);

  const generateSalesQuiz = async (questionCount: number = 5) => {
    try {
      setIsGenerating(true);
      setQuizError(null);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setQuizSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
      
      addLog(`Generating ${questionCount} quiz questions for book ID: ${bookId || 'not specified'}`);
      
      const { data, error } = await supabase.functions.invoke('generate-sales-question', {
        body: { count: questionCount, bookId, debug: true }
      });
      
      if (error) {
        console.error('Error generating quiz:', error);
        setQuizError(`Er is een fout opgetreden: ${error.message}`);
        addLog(`Error: ${error.message}`);
        return;
      }
      
      if (data && data.success && data.questions && Array.isArray(data.questions)) {
        // Format the questions from the API
        const formattedQuestions: QuizQuestion[] = data.questions.map((q: any) => {
          return {
            question: q.question,
            options: q.options,
            correctAnswer: q.correct.charCodeAt(0) - 65, // Convert 'A', 'B', 'C', 'D' to 0, 1, 2, 3
            explanation: "Dit is het correcte antwoord volgens de theorie uit het Basisboek Sales."
          };
        });
        
        setQuestions(formattedQuestions);
        addLog(`Created ${formattedQuestions.length} questions from the API response`);
        
        // Automatically open quiz when questions are ready
        setQuizOpen(true);
      } else {
        setQuizError('Geen vragen konden worden gegenereerd');
        addLog(`Failed to generate questions: Invalid response format`);
        console.error('Invalid response format:', data);
      }
    } catch (err) {
      console.error('Error in generateSalesQuiz:', err);
      setQuizError(`Er is een onverwachte fout opgetreden`);
      addLog(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartQuiz = async () => {
    try {
      addLog('Starting quiz generation');
      await generateSalesQuiz(5);
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast.error('Er ging iets mis bij het starten van de quiz');
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (!isAnswerSubmitted) {
      addLog(`Selected answer: ${index}`);
      setQuizSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (quizSelectedAnswer === null) {
      toast.info('Selecteer eerst een antwoord');
      return;
    }

    addLog(`Submitting answer: ${quizSelectedAnswer}`);
    setIsAnswerSubmitted(true);
    
    if (questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      if (quizSelectedAnswer === currentQuestion.correctAnswer) {
        setScore(prevScore => prevScore + 1);
        addLog('Answer correct, score updated');
      } else {
        addLog('Answer incorrect');
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      addLog(`Moving to next question (${currentQuestionIndex + 1})`);
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setQuizSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      addLog('Quiz complete, showing results');
      setIsQuizComplete(true);
    }
  };

  const forceNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      addLog(`FORCE: Moving to next question (${currentQuestionIndex + 1})`);
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setQuizSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      addLog('FORCE: Cannot advance, already at last question');
      toast.info('Je bent al bij de laatste vraag');
    }
  };

  const restartQuiz = () => {
    addLog('Restarting quiz');
    setCurrentQuestionIndex(0);
    setQuizSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
  };

  const handleCloseQuiz = () => {
    addLog('Closing quiz');
    setQuizOpen(false);
  };

  const generateQuestion = async () => {
    try {
      setLoading(true);
      setQuestion(null);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setDebugData({});
      setDebugAccordion(null);
      
      console.log("Generating question with debug:", showDebugSection, "bookId:", bookId);
      
      // Include bookId if available and always include debug
      const payload = bookId ? { bookId, debug: true } : { debug: true };
      
      console.log("Payload for generate-quiz:", payload);
      
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: payload
      });
      
      console.log("Full response from generate-quiz:", data, error);
      
      if (error) {
        console.error('Error generating question:', error);
        toast.error('Er is een fout opgetreden bij het genereren van de vraag');
        return;
      }
      
      if (data && data.success && data.questions && data.questions.length > 0) {
        // Format the first question from the response
        const questionData = data.questions[0];
        
        // Format options to include A, B, C, D prefixes if not already included
        const formattedOptions = questionData.options.map((opt: string, index: number) => {
          if (opt.match(/^[A-D]\. /)) {
            return opt; // Already has prefix
          } else {
            return `${String.fromCharCode(65 + index)}: ${opt}`;
          }
        });
        
        const formattedQuestion: QuestionData = {
          question: questionData.question,
          options: formattedOptions,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation
        };
        
        setQuestion(formattedQuestion);
        
        // Always save debug data regardless of showDebug setting
        if (data.debug) {
          console.log("Debug data received:", data.debug);
          setDebugData({
            prompt: data.debug.prompt,
            response: data.debug.response
          });
          // Auto-open the prompt accordion
          setDebugAccordion("prompt");
        } else {
          console.warn("No debug data in response despite requesting it");
        }
      } else {
        toast.error('Ongeldige response ontvangen van de server');
        console.error('Invalid response from server:', data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Er is een fout opgetreden bij het genereren van de vraag');
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = () => {
    if (!selectedAnswer || !question) return;
    
    // Extract the letter from the selected answer (A, B, C, or D)
    const selectedLetter = selectedAnswer.charAt(0);
    
    // Format the correct answer in the same format
    const correctIndex = question.correctAnswer;
    const correctLetter = String.fromCharCode(65 + correctIndex);
    
    setIsCorrect(selectedLetter === correctLetter);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!question ? (
        <div className="flex flex-col items-center gap-4">
          <Button 
            onClick={handleStartQuiz} 
            disabled={loading || isGenerating}
            size="lg"
            className="bg-study-600 hover:bg-study-700 text-white"
          >
            {loading || isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Quiz met meerdere vragen genereren...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-5 w-5" />
                Genereer een quiz met meerdere vragen
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
        <Card className="shadow-lg border-study-100">
          <CardHeader className="bg-study-50 border-b border-study-100">
            <CardTitle className="text-xl text-center">Quiz Vraag</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-lg font-medium mb-6">{question.question}</p>
            
            <RadioGroup
              value={selectedAnswer || undefined}
              onValueChange={setSelectedAnswer}
              className="space-y-3"
            >
              {question.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-2 p-3 rounded-md border ${
                    selectedAnswer === option && isCorrect === null
                      ? 'border-study-300 bg-study-50'
                      : selectedAnswer === option && isCorrect === true
                      ? 'border-green-300 bg-green-50'
                      : selectedAnswer === option && isCorrect === false
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <label
                    htmlFor={`option-${index}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 w-full cursor-pointer"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </RadioGroup>

            {isCorrect !== null && (
              <Alert className={`mt-6 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <AlertTitle className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                  {isCorrect ? 'Correct!' : 'Helaas, dat is niet juist'}
                </AlertTitle>
                <AlertDescription className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                  {isCorrect 
                    ? 'Goed gedaan! Je hebt de juiste optie gekozen.'
                    : `Het juiste antwoord is: ${String.fromCharCode(65 + question.correctAnswer)}: ${question.options[question.correctAnswer]}`}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Debug section - show regardless of initial showDebug prop if user has toggled it on */}
            {showDebug && (
              <div className="flex justify-end mt-4">
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
              </div>
            )}
            
            {/* Always show debug if enabled */}
            {showDebug && showDebugSection && (
              <div className="mt-6 border border-gray-200 rounded-md overflow-hidden">
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
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={generateQuestion}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Laden...
                </>
              ) : (
                <>
                  <Loader2 className="mr-2 h-4 w-4" />
                  Nieuwe vraag
                </>
              )}
            </Button>
            <Button 
              onClick={checkAnswer}
              disabled={!selectedAnswer || isCorrect !== null}
              className={!selectedAnswer ? 'opacity-50' : ''}
            >
              Controleer antwoord
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Quiz Component */}
      <Quiz 
        questions={questions} 
        onClose={handleCloseQuiz} 
        open={quizOpen} 
        title="Quiz over Sales"
        error={quizError}
        isGenerating={isGenerating}
        currentQuestionIndex={currentQuestionIndex}
        selectedAnswer={quizSelectedAnswer}
        isAnswerSubmitted={isAnswerSubmitted}
        score={score}
        isQuizComplete={isQuizComplete}
        handleAnswerSelect={handleAnswerSelect}
        handleSubmitAnswer={handleSubmitAnswer}
        handleNextQuestion={handleNextQuestion}
        restartQuiz={restartQuiz}
      />

      {/* Debug panel - only show when quiz is open */}
      {quizOpen && showDebug && showDebugSection && (
        <div className="mt-6 border border-gray-200 rounded-md p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Quiz Debug Panel</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceNextQuestion}
              className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
            >
              <Bug className="mr-1 h-3 w-3" />
              Force Next Question
            </Button>
          </div>
          <div className="text-xs font-mono h-40 overflow-y-auto p-2 bg-gray-100 rounded border border-gray-300">
            {stateLog.map((log, i) => (
              <div key={i} className="border-b border-gray-200 py-1">{log}</div>
            ))}
            {stateLog.length === 0 && <div className="text-gray-500">No logs yet</div>}
          </div>
          <div className="mt-2 text-xs grid grid-cols-2 gap-2">
            <div className="bg-gray-100 p-1 rounded">
              <span className="font-bold">Questions:</span> {questions.length}
            </div>
            <div className="bg-gray-100 p-1 rounded">
              <span className="font-bold">Current Index:</span> {currentQuestionIndex}
            </div>
            <div className="bg-gray-100 p-1 rounded">
              <span className="font-bold">Answer Submitted:</span> {isAnswerSubmitted ? 'Yes' : 'No'}
            </div>
            <div className="bg-gray-100 p-1 rounded">
              <span className="font-bold">Score:</span> {score}
            </div>
            <div className="bg-gray-100 p-1 rounded">
              <span className="font-bold">Complete:</span> {isQuizComplete ? 'Yes' : 'No'}
            </div>
            <div className="bg-gray-100 p-1 rounded">
              <span className="font-bold">Selected Answer:</span> {quizSelectedAnswer !== null ? quizSelectedAnswer : 'None'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesQuizQuestion;
