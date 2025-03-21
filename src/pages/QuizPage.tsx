import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw, Loader2, AlertCircle, Bug, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const QuizPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Quiz state
  const [questions, setQuestions] = useState<Array<QuizQuestion>>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Quiz context params
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [paragraphId, setParagraphId] = useState<number | null>(null);
  const [quizTitle, setQuizTitle] = useState<string>("Quiz");
  
  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  const [debugAccordion, setDebugAccordion] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>({
    prompt: null,
    response: null,
    apiResponse: null
  });
  const [stateLog, setStateLog] = useState<string[]>([]);
  
  // Load params from URL on initial render
  useEffect(() => {
    // Extract params from URL
    const bookIdParam = searchParams.get('bookId');
    const chapterIdParam = searchParams.get('chapterId');
    const paragraphIdParam = searchParams.get('paragraphId');
    
    addLog(`URL parameters: bookId=${bookIdParam}, chapterId=${chapterIdParam}, paragraphId=${paragraphIdParam}`);
    
    // Set state from URL params
    if (bookIdParam) {
      const numericBookId = parseInt(bookIdParam);
      setBookId(numericBookId);
      addLog(`Setting bookId from URL: ${numericBookId}`);
    } else {
      // Try to get from localStorage as fallback
      const savedBookId = localStorage.getItem('quizBookId');
      if (savedBookId) {
        const numericBookId = parseInt(savedBookId);
        setBookId(numericBookId);
        addLog(`Setting bookId from localStorage fallback: ${numericBookId}`);
      } else {
        addLog('No bookId found in URL or localStorage');
      }
    }
    
    if (chapterIdParam) {
      const numericChapterId = parseInt(chapterIdParam);
      setChapterId(numericChapterId);
      addLog(`Setting chapterId from URL: ${numericChapterId}`);
    }
    
    if (paragraphIdParam) {
      const numericParagraphId = parseInt(paragraphIdParam);
      setParagraphId(numericParagraphId);
      addLog(`Setting paragraphId from URL: ${numericParagraphId}`);
    }
    
    // Set quiz title based on context
    if (paragraphIdParam) {
      setQuizTitle(`Quiz over paragraaf ${paragraphIdParam}`);
    } else if (chapterIdParam) {
      setQuizTitle(`Quiz over hoofdstuk ${chapterIdParam}`);
    } else if (bookIdParam) {
      setQuizTitle("Quiz over het boek");
    } else {
      setQuizTitle("Quiz over Sales");
    }
    
    // Try to load saved quiz state only if no URL params provided
    const savedQuiz = localStorage.getItem('quizState');
    if (savedQuiz && !bookIdParam && !chapterIdParam && !paragraphIdParam) {
      try {
        const quizState = JSON.parse(savedQuiz);
        setQuestions(quizState.questions || []);
        setCurrentQuestionIndex(quizState.currentQuestionIndex || 0);
        setSelectedAnswer(quizState.selectedAnswer);
        setIsAnswerSubmitted(quizState.isAnswerSubmitted || false);
        setScore(quizState.score || 0);
        setIsQuizComplete(quizState.isQuizComplete || false);
        
        if (!bookIdParam && quizState.bookId) {
          setBookId(quizState.bookId);
        }
        if (!chapterIdParam && quizState.chapterId) {
          setChapterId(quizState.chapterId);
        }
        if (!paragraphIdParam && quizState.paragraphId) {
          setParagraphId(quizState.paragraphId);
        }
        
        addLog('Loaded saved quiz state from localStorage');
      } catch (error) {
        console.error('Error loading saved quiz:', error);
        addLog(`Error loading saved quiz: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // If we have valid context, automatically start generation if we have no questions
    const hasValidContext = bookIdParam || (savedQuiz && JSON.parse(savedQuiz).bookId);
    const hasQuestions = savedQuiz && JSON.parse(savedQuiz).questions && JSON.parse(savedQuiz).questions.length > 0;
    
    if (hasValidContext && !hasQuestions) {
      addLog('Auto-starting quiz generation with context');
      generateQuiz();
    } else if (!hasValidContext) {
      addLog('Missing required context (bookId) for auto-generation');
      setQuizError('Geen boek geselecteerd. Ga terug naar een boek en start de quiz daar.');
    }
  }, [searchParams]);
  
  // Save quiz state to localStorage whenever it changes
  useEffect(() => {
    if (questions.length > 0) {
      const quizState = {
        questions,
        currentQuestionIndex,
        selectedAnswer,
        isAnswerSubmitted,
        score,
        isQuizComplete,
        bookId,
        chapterId,
        paragraphId
      };
      localStorage.setItem('quizState', JSON.stringify(quizState));
      addLog('Saved quiz state to localStorage');
    }
  }, [questions, currentQuestionIndex, selectedAnswer, isAnswerSubmitted, score, isQuizComplete, bookId, chapterId, paragraphId]);
  
  // Add debug log function
  const addLog = (message: string) => {
    console.log(`[QUIZ DEBUG] ${message}`);
    setStateLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  // Add the missing handleBackToHome function
  const handleBackToHome = () => {
    navigate('/');
  };
  
  // Navigate back to book detail page
  const handleBackToBook = () => {
    if (bookId) {
      navigate(`/books/${bookId}`);
    } else {
      navigate('/books');
    }
  };
  
  // Modified to handle both direct calls and click events
  const generateQuiz = async (questionCountOrEvent?: number | React.MouseEvent<HTMLButtonElement>) => {
    // Default question count
    let questionCount = 5;
    
    // If the argument is a number, use it as question count
    if (typeof questionCountOrEvent === 'number') {
      questionCount = questionCountOrEvent;
    }
    
    try {
      setIsGenerating(true);
      setQuizError(null);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
      
      addLog(`Generating ${questionCount} quiz questions for context: bookId=${bookId}, chapterId=${chapterId}, paragraphId=${paragraphId}`);
      
      // Construct payload with all available context
      const payload: any = { 
        count: questionCount, 
        debug: true 
      };
      
      // Add context parameters if available
      if (bookId) payload.bookId = bookId;
      if (chapterId) payload.chapterId = chapterId;
      if (paragraphId) payload.paragraphId = paragraphId;
      
      addLog(`Sending payload to generate-sales-question: ${JSON.stringify(payload)}`);
      
      const { data, error } = await supabase.functions.invoke('generate-sales-question', {
        body: payload
      });
      
      // Save the raw API response for debugging
      if (data) {
        debugData.apiResponse = data;
        setDebugData({...debugData, apiResponse: data});
        addLog(`Full API response received: ${JSON.stringify(data).substring(0, 100)}...`);
        console.log('Full API response:', data);
      }
      
      if (error) {
        console.error('Error generating quiz:', error);
        setQuizError(`Er is een fout opgetreden: ${error.message}`);
        addLog(`Error: ${error.message}`);
        return;
      }
      
      if (data && data.success && data.questions && Array.isArray(data.questions)) {
        // Format the questions from the API
        const formattedQuestions: QuizQuestion[] = data.questions.map((q: any) => {
          // Check the correct answer format and convert appropriately
          let correctAnswerIndex;
          
          if (typeof q.correct === 'string' && q.correct.length === 1) {
            // If it's a single letter like 'A', 'B', 'C', 'D'
            correctAnswerIndex = q.correct.charCodeAt(0) - 65; // Convert 'A', 'B', 'C', 'D' to 0, 1, 2, 3
            addLog(`Converting letter correct answer '${q.correct}' to index ${correctAnswerIndex}`);
          } else if (typeof q.correct === 'number') {
            // If it's already a number
            correctAnswerIndex = q.correct;
            addLog(`Using numeric correct answer: ${correctAnswerIndex}`);
          } else {
            // Default to first option if unknown format
            correctAnswerIndex = 0;
            addLog(`Unknown correct answer format: ${typeof q.correct}, value: ${q.correct}. Defaulting to index 0.`);
          }
          
          return {
            question: q.question,
            options: q.options,
            correctAnswer: correctAnswerIndex,
            explanation: q.explanation || "Dit is het correcte antwoord volgens de theorie uit het Basisboek Sales."
          };
        });
        
        setQuestions(formattedQuestions);
        addLog(`Created ${formattedQuestions.length} questions from the API response`);
        
        // Save debug data
        if (data.debug) {
          setDebugData({
            ...debugData,
            prompt: data.debug.prompt,
            response: data.debug.response
          });
          addLog('Debug data saved from API response');
        }
      } else {
        setQuizError('Geen vragen konden worden gegenereerd. Controleer of er content beschikbaar is voor dit boek/hoofdstuk.');
        addLog(`Failed to generate questions: Invalid response format or no questions returned`);
        console.error('Invalid response format or no questions:', data);
      }
    } catch (err) {
      console.error('Error in generateQuiz:', err);
      setQuizError(`Er is een onverwachte fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
      addLog(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (!isAnswerSubmitted) {
      addLog(`Selected answer: ${index}`);
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.info('Selecteer eerst een antwoord');
      return;
    }

    addLog(`Submitting answer: ${selectedAnswer}`);
    setIsAnswerSubmitted(true);
    
    if (questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      if (selectedAnswer === currentQuestion.correctAnswer) {
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
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setShowExplanation(false);
    } else {
      addLog('Quiz complete, showing results');
      setIsQuizComplete(true);
    }
  };

  const handleToggleExplanation = () => {
    addLog(`${showExplanation ? 'Hiding' : 'Showing'} explanation`);
    setShowExplanation(!showExplanation);
  };

  const restartQuiz = () => {
    addLog('Restarting quiz');
    generateQuiz();
  };
  
  const forceNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      addLog(`FORCE: Moving to next question (${currentQuestionIndex + 1})`);
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setShowExplanation(false);
    } else {
      addLog('FORCE: Cannot advance, already at last question');
      toast.info('Je bent al bij de laatste vraag');
    }
  };

  const renderLoadingContent = () => {
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

  const renderErrorContent = () => {
    return (
      <>
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{quizError}</AlertDescription>
        </Alert>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handleBackToBook}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar boek
          </Button>
          <Button onClick={generateQuiz}>Probeer opnieuw</Button>
        </div>
      </>
    );
  };

  const renderEmptyContent = () => {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-6">
        <Alert variant="warning" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Voor het genereren van een quiz is een boek, hoofdstuk of paragraaf nodig.
            Ga naar een boekdetailpagina om een quiz te starten.
          </AlertDescription>
        </Alert>
        
        {bookId ? (
          <div className="space-y-4 w-full max-w-md">
            <p className="text-center text-muted-foreground">
              {bookId && !chapterId && 'Genereer een quiz over het hele boek:'}
              {chapterId && !paragraphId && `Genereer een quiz over hoofdstuk ${chapterId}:`}
              {paragraphId && `Genereer een quiz over paragraaf ${paragraphId}:`}
            </p>
            <Button onClick={generateQuiz} className="w-full">Genereer quiz</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={handleBackToHome} className="mt-4">Terug naar home</Button>
        )}
      </div>
    );
  };

  const renderResultsContent = () => {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="w-full max-w-md">
          <Progress 
            value={Math.round((score / questions.length) * 100)} 
            className="h-6" 
          />
          <p className="text-center mt-2 text-sm text-muted-foreground">
            {Math.round((score / questions.length) * 100)}% correct
          </p>
        </div>
        
        <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center">
          <span className="text-4xl font-bold">{score}/{questions.length}</span>
        </div>
        
        <p className="text-center text-lg">
          Je hebt {score} van de {questions.length} vragen goed beantwoord.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-md">
          <Button onClick={restartQuiz} variant="outline" className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" />
            Opnieuw proberen
          </Button>
          
          {bookId ? (
            <Button onClick={handleBackToBook} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar boek
            </Button>
          ) : (
            <Button onClick={handleBackToHome} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar home
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderQuestionContent = () => {
    if (!questions || questions.length === 0 || currentQuestionIndex >= questions.length) {
      console.error('Invalid questions array or currentQuestionIndex:', { 
        questionsLength: questions?.length, 
        currentQuestionIndex 
      });
      return renderEmptyContent();
    }

    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) {
      console.error('Current question is undefined. Index:', currentQuestionIndex, 'Questions:', questions);
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fout bij het laden van de vraag</AlertTitle>
          <AlertDescription>
            Er is een probleem met het laden van deze vraag. Probeer de quiz opnieuw te starten.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Card className="border-2 max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-muted-foreground">
              Vraag {currentQuestionIndex + 1} van {questions.length}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Score: {score} / {isAnswerSubmitted ? currentQuestionIndex + 1 : currentQuestionIndex}
            </div>
          </div>
          <Progress 
            value={(currentQuestionIndex / questions.length) * 100} 
            className="h-2 mb-2" 
          />
          <CardTitle className="text-lg">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedAnswer?.toString()}
            onValueChange={(value) => handleAnswerSelect(parseInt(value))}
            className="space-y-3"
            disabled={isAnswerSubmitted}
          >
            {currentQuestion.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-2 rounded-lg border p-4 ${
                  isAnswerSubmitted
                    ? index === currentQuestion.correctAnswer
                      ? 'border-green-500 bg-green-50'
                      : index === selectedAnswer
                      ? 'border-red-500 bg-red-50'
                      : ''
                    : 'hover:border-primary'
                }`}
              >
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-grow cursor-pointer">
                  {option}
                </Label>
                {isAnswerSubmitted && (
                  <div className="ml-2">
                    {index === currentQuestion.correctAnswer ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : index === selectedAnswer ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </RadioGroup>

          {isAnswerSubmitted && showExplanation && (
            <Alert className="mt-4">
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>Uitleg</AlertTitle>
              <AlertDescription>
                {currentQuestion.explanation}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleExplanation}
              disabled={!isAnswerSubmitted}
            >
              {showExplanation ? 'Verberg uitleg' : 'Toon uitleg'}
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {!isAnswerSubmitted ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
              >
                Controleer antwoord
              </Button>
            ) : (
              <Button onClick={handleNextQuestion} className="animate-pulse">
                {currentQuestionIndex < questions.length - 1 ? (
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

  // Main render function
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{quizTitle}</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? (
              <>
                <EyeOff className="mr-1 h-4 w-4" />
                Verberg debug
              </>
            ) : (
              <>
                <Bug className="mr-1 h-4 w-4" />
                Debug info
              </>
            )}
          </Button>
          {bookId ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToBook}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Terug naar boek
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToHome}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Terug
            </Button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="mb-8">
        {isGenerating ? (
          renderLoadingContent()
        ) : quizError ? (
          renderErrorContent()
        ) : questions.length === 0 ? (
          renderEmptyContent()
        ) : isQuizComplete ? (
          renderResultsContent()
        ) : (
          renderQuestionContent()
        )}
      </div>
      
      {/* Debug Panel */}
      {showDebug && (
        <div className="mt-8 border border-gray-200 rounded-md overflow-hidden bg-gray-50 max-w-4xl mx-auto">
          <h2 className="font-semibold p-4 bg-gray-100 border-b border-gray-200">
            Debug Informatie
          </h2>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="state">
              <AccordionTrigger className="px-4 py-2">
                Quiz State
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-gray-50 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-100 p-1 rounded">
                    <span className="font-bold">Book ID:</span> {bookId || 'None'}
                  </div>
                  <div className="bg-gray-100 p-1 rounded">
                    <span className="font-bold">Chapter ID:</span> {chapterId || 'None'}
                  </div>
                  <div className="bg-gray-100 p-1 rounded">
                    <span className="font-bold">Paragraph ID:</span> {paragraphId || 'None'}
                  </div>
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
                    <span className="font-bold">Selected Answer:</span> {selectedAnswer !== null ? selectedAnswer : 'None'}
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
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
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="api">
              <AccordionTrigger className="px-4 py-2">
                API Response
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-gray-50">
                <div className="text-xs font-mono whitespace-pre-wrap bg-gray-100 p-2 rounded border border-gray-200 overflow-x-auto max-h-80 overflow-y-auto">
                  {debugData.apiResponse ? 
                    JSON.stringify(debugData.apiResponse, null, 2) : 
                    'Geen API response beschikbaar'}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="prompt">
              <AccordionTrigger className="px-4 py-2">
                OpenAI Prompt
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-gray-50">
                <div className="text-xs font-mono whitespace-pre-wrap bg-gray-100 p-2 rounded border border-gray-200 overflow-x-auto">
                  {debugData.prompt || 'Geen prompt beschikbaar'}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="response">
              <AccordionTrigger className="px-4 py-2">
                OpenAI Response
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-gray-50">
                <div className="text-xs font-mono whitespace-pre-wrap bg-gray-100 p-2 rounded border border-gray-200 overflow-x-auto">
                  {debugData.response ? 
                    JSON.stringify(debugData.response, null, 2) : 
                    'Geen response beschikbaar'}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="logs">
              <AccordionTrigger className="px-4 py-2">
                Event Logs
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="text-xs font-mono h-40 overflow-y-auto p-2 bg-gray-100 border-t border-gray-200">
                  {stateLog.map((log, i) => (
                    <div key={i} className="border-b border-gray-200 py-1">{log}</div>
                  ))}
                  {stateLog.length === 0 && <div className="text-gray-500">No logs yet</div>}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
