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
import QuizDebug from "./QuizDebug";

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

const SalesQuizQuestion = ({ showDebug = true, bookId }: SalesQuizQuestionProps) => {
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<DebugData>({});
  const [debugAccordion, setDebugAccordion] = useState<string | null>(null);
  const [showDebugSection, setShowDebugSection] = useState(showDebug);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const [quizOpen, setQuizOpen] = useState(false);
  const [questions, setQuestions] = useState<Array<QuizQuestion>>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  
  const [stateLog, setStateLog] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    console.log(`[QUIZ DEBUG] ${message}`);
    setStateLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (quizOpen) {
      addLog(`Quiz state update: currentQuestion=${currentQuestionIndex}, totalQuestions=${questions.length}, isAnswerSubmitted=${isAnswerSubmitted}, score=${score}`);
    }
  }, [quizOpen, currentQuestionIndex, isAnswerSubmitted, score, questions.length]);

  useEffect(() => {
    if (quizOpen && questions.length > 0) {
      addLog(`Question changed to ${currentQuestionIndex}, resetting selected answer state`);
      if (!isAnswerSubmitted) {
        setQuizSelectedAnswer(null);
      }
    }
  }, [currentQuestionIndex, quizOpen, questions]);

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
        const formattedQuestions: QuizQuestion[] = data.questions.map((q: any) => {
          let correctIndex;
          if (typeof q.correctAnswer === 'number') {
            correctIndex = q.correctAnswer;
          } else if (q.correct && typeof q.correct === 'string') {
            correctIndex = q.correct.charCodeAt(0) - 65;
          } else {
            correctIndex = 0;
          }
          
          const cleanedOptions = q.options.map((opt: string) => {
            return opt.replace(/^[A-D]\.\s*/, '');
          });
          
          let cleanedExplanation = q.explanation || "Dit is het correcte antwoord volgens de theorie uit het Basisboek Sales.";
          cleanedExplanation = cleanedExplanation
            .replace(/\b(optie|option|antwoord|answer)\s+[A-D]\b/gi, "het juiste antwoord")
            .replace(/\b[Oo]ptie [A-D]\b/g, "een optie")
            .replace(/\b[Aa]ntwoord [A-D]\b/g, "een antwoord");
          
          return {
            question: q.question,
            options: cleanedOptions,
            correctAnswer: correctIndex,
            explanation: cleanedExplanation
          };
        });
        
        setQuestions(formattedQuestions);
        addLog(`Created ${formattedQuestions.length} questions from the API response`);
        
        const distribution = {
          A: 0, B: 0, C: 0, D: 0
        };
        
        formattedQuestions.forEach(q => {
          const letter = String.fromCharCode(65 + q.correctAnswer);
          distribution[letter as keyof typeof distribution]++;
        });
        
        addLog(`Answer distribution: A=${distribution.A}, B=${distribution.B}, C=${distribution.C}, D=${distribution.D}`);
        
        if (data.debug) {
          setDebugData({
            prompt: data.debug.prompt,
            response: data.debug.response
          });
          setDebugAccordion("prompt");
          addLog('Debug data saved from API response');
        }
        
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

  const checkAnswerDistribution = (questions: QuizQuestion[]) => {
    if (questions.length < 4) return;
    
    const distribution = {
      A: 0, B: 0, C: 0, D: 0
    };
    
    questions.forEach(q => {
      const letter = String.fromCharCode(65 + q.correctAnswer);
      distribution[letter as keyof typeof distribution]++;
    });
    
    const expected = questions.length / 4;
    const isBalanced = Object.values(distribution).every(c => Math.abs(c - expected) <= 1);
    
    if (!isBalanced) {
      addLog(`Warning: Answer distribution is not balanced: A=${distribution.A}, B=${distribution.B}, C=${distribution.C}, D=${distribution.D}`);
    } else {
      addLog(`Answer distribution is well balanced: A=${distribution.A}, B=${distribution.B}, C=${distribution.C}, D=${distribution.D}`);
    }
  };

  const generateQuestion = async () => {
    try {
      setLoading(true);
      setQuestion(null);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setDebugData({});
      setDebugAccordion(null);
      setShowExplanation(false);
      
      console.log("Generating question with debug:", showDebugSection, "bookId:", bookId);
      
      const payload = bookId ? { bookId, debug: true } : { debug: true };
      
      console.log("Payload for generate-sales-question:", payload);
      
      const { data, error } = await supabase.functions.invoke('generate-sales-question', {
        body: payload
      });
      
      console.log("Full response from generate-sales-question:", data, error);
      
      if (error) {
        console.error('Error generating question:', error);
        toast.error('Er is een fout opgetreden bij het genereren van de vraag');
        return;
      }
      
      if (data && data.success && data.questions && data.questions.length > 0) {
        const questionData = data.questions[0];
        
        const correctIndex = questionData.correct.charCodeAt(0) - 65;
        
        const formattedOptions = questionData.options.map((opt: string, index: number) => {
          if (opt.match(/^[A-D]\. /)) {
            return opt;
          } else {
            return `${String.fromCharCode(65 + index)}: ${opt}`;
          }
        });
        
        const formattedQuestion: QuestionData = {
          question: questionData.question,
          options: formattedOptions,
          correctAnswer: correctIndex,
          explanation: questionData.explanation || "Dit is het correcte antwoord volgens de theorie uit het Basisboek Sales."
        };
        
        setQuestion(formattedQuestion);
        
        if (data.debug) {
          console.log("Debug data received:", data.debug);
          setDebugData({
            prompt: data.debug.prompt,
            response: data.debug.response
          });
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
    
    const selectedLetter = selectedAnswer.charAt(0);
    
    const correctIndex = question.correctAnswer;
    const correctLetter = String.fromCharCode(65 + correctIndex);
    
    setIsCorrect(selectedLetter === correctLetter);
    setShowExplanation(true);
  };

  const handleToggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };

  const defaultBatchProgress = {
    currentBatch: 0,
    totalBatches: 1,
    processedObjectives: 0,  
    totalObjectives: 0,      
    startTime: Date.now()    
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
            
            {isCorrect !== null && showExplanation && (
              <Alert className="mt-4">
                <AlertTitle>Uitleg</AlertTitle>
                <AlertDescription>
                  {question.explanation}
                </AlertDescription>
              </Alert>
            )}
            
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
            
            {isCorrect !== null && (
              <Button 
                variant="outline"
                onClick={handleToggleExplanation}
                size="sm"
              >
                {showExplanation ? 'Verberg uitleg' : 'Toon uitleg'}
              </Button>
            )}
            
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
        batchProgress={defaultBatchProgress}
      />

      {quizOpen && showDebugSection && (
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
          {questions.length >= 4 && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => checkAnswerDistribution(questions)}
                className="w-full text-xs"
              >
                Check Answer Distribution
              </Button>
            </div>
          )}
          
          <div className="mt-4">
            <QuizDebug
              bookId={bookId || null}
              chapterId={null}
              paragraphId={null}
              stateLog={stateLog}
              questionsCount={questions.length}
              currentQuestionIndex={currentQuestionIndex}
              isGenerating={isGenerating}
              debugData={debugData}
              openAIPrompt={debugData?.prompt}
              openAIResponse={debugData?.response}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesQuizQuestion;
