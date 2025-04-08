
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  BookOpen, 
  ArrowLeft, 
  Loader2,
  FileText,
  Play,
  List,
  Bug,
  Eye,
  EyeOff
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useBookDetail } from '@/hooks/useBookDetail';
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import ParagraphViewer from '@/components/ParagraphViewer';
import ChaptersList from '@/components/book/ChaptersList';
import { useBookQuizGenerator, BatchProgress } from '@/hooks/useBookQuizGenerator';
import QuizDebug from '@/components/quiz/QuizDebug';
import QuizStudyMode from '@/components/quiz/QuizStudyMode';

// Define quiz states for each paragraph
interface ParagraphProgress {
  id: number;
  paragraphNumber: number;
  chapterId: number;
  completed: boolean;
  score?: number;
  totalQuestions?: number;
  lastAttemptDate?: Date;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const StructuredLearningPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState<ParagraphProgress[]>([]);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [activeParagraphId, setActiveParagraphId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentParagraphContent, setCurrentParagraphContent] = useState<string>('');
  const [currentParagraphNumber, setCurrentParagraphNumber] = useState<number | undefined>(undefined);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [isChapterSelectionMode, setIsChapterSelectionMode] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [debugData, setDebugData] = useState<any>({});
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'chapter-list' | 'content' | 'quiz'>('chapter-list');

  // Function to add log messages
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };
  
  // Get book details including chapters
  const { 
    book, 
    chapters, 
    paragraphs, 
    loading, 
    loadingParagraphs, 
    error, 
    fetchParagraphs,
    selectedChapterId,
    isOnlineMarketingBook
  } = useBookDetail(id);

  // Get quiz generator hook
  const {
    questions: hookQuestions,
    isGenerating: isGeneratingQuiz,
    quizError,
    objectives,
    startQuizGeneration,
    debugData: quizDebugData,
    openAIPrompt,
    openAIResponse
  } = useBookQuizGenerator({
    bookId: book?.id || null,
    chapterId: selectedChapterId,
    paragraphId: activeParagraphId,
    isOnlineMarketing: isOnlineMarketingBook,
    addLog
  });

  // Update debug data whenever it changes
  useEffect(() => {
    if (quizDebugData) {
      setDebugData(quizDebugData);
    }
  }, [quizDebugData]);

  // Check for chapter in URL parameters
  useEffect(() => {
    const chapterIdParam = searchParams.get('chapterId');
    if (chapterIdParam && chapters.length > 0) {
      const chapterId = parseInt(chapterIdParam);
      const chapterExists = chapters.some(ch => ch.id === chapterId);
      
      if (chapterExists) {
        fetchParagraphs(chapterId, book?.book_title);
        setIsChapterSelectionMode(false);
        setViewMode('content');
      }
    } else if (chapters.length > 0 && selectedChapterId === null) {
      // Default to first chapter if none selected
      fetchParagraphs(chapters[0].id, book?.book_title);
    }
  }, [chapters, searchParams, book]);

  // Update questions when hook questions change
  useEffect(() => {
    if (hookQuestions.length > 0) {
      setQuestions(hookQuestions);
    }
  }, [hookQuestions]);

  // Initialize progress data when paragraphs are loaded
  useEffect(() => {
    if (paragraphs.length > 0 && !loadingParagraphs) {
      // Create progress tracking for each paragraph
      const initialProgressData = paragraphs.map(p => ({
        id: p.id,
        paragraphNumber: p.paragraph_number || 0,
        chapterId: p.chapter_number,
        completed: false,
      }));
      
      setProgressData(initialProgressData);
      
      // Set the first paragraph as active if none is selected
      if (activeParagraphId === null && initialProgressData.length > 0) {
        setActiveParagraphId(initialProgressData[0].id);
        setCurrentParagraphContent(paragraphs[0].content || 'No content available');
        setCurrentParagraphNumber(paragraphs[0].paragraph_number);
      }
    }
  }, [paragraphs, loadingParagraphs]);

  // Check if the debug panel should be shown
  useEffect(() => {
    // Show debug panel if URL has debug=true or if in development mode
    const debugParam = searchParams.get('debug');
    if (debugParam === 'true' || import.meta.env.DEV) {
      setShowDebugPanel(true);
    }
  }, [searchParams]);

  // Calculate overall chapter progress
  const calculateChapterProgress = () => {
    if (progressData.length === 0) return 0;
    const completedCount = progressData.filter(p => p.completed).length;
    return Math.round((completedCount / progressData.length) * 100);
  };

  // Handle chapter selection
  const handleChapterSelect = (chapterId: number) => {
    addLog(`Selecting chapter: ${chapterId}`);
    fetchParagraphs(chapterId, book?.book_title);
    setIsChapterSelectionMode(false);
    setViewMode('content');
    setSearchParams({ chapterId: chapterId.toString() });
  };

  // Start study mode for a specific paragraph
  const startParagraphStudy = (paragraphId: number) => {
    try {
      setActiveParagraphId(paragraphId);
      setIsStudyMode(true);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
      
      // Find the paragraph content
      const paragraph = paragraphs.find(p => p.id === paragraphId);
      if (paragraph) {
        setCurrentParagraphContent(paragraph.content || 'No content available');
        setCurrentParagraphNumber(paragraph.paragraph_number);
        setActiveAccordion(`paragraph-${paragraphId}`);
      }
      
      setViewMode('content');
      
    } catch (err) {
      console.error('Error starting paragraph study:', err);
      toast.error('Er is een fout opgetreden bij het starten van de studie');
    }
  };

  // Start quiz for a specific paragraph
  const startParagraphQuiz = async (paragraphId: number) => {
    try {
      setIsStudyMode(false);
      setActiveParagraphId(paragraphId);
      setIsGenerating(true);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
      setViewMode('quiz');
      
      // Generate questions specific to this paragraph using the correct edge function
      if (!book?.id || !selectedChapterId) {
        toast.error('Book or chapter information missing');
        return;
      }
      
      addLog(`Starting quiz generation for paragraph ${paragraphId}`);
      
      if (isOnlineMarketingBook) {
        addLog('Using online marketing quiz generator');
        await startQuizGeneration(5);
      } else {
        addLog('Using sales question generator');
        const { data, error } = await supabase.functions.invoke('generate-sales-question', {
          body: { 
            bookId: book.id,
            chapterId: selectedChapterId,
            paragraphId: paragraphId,
            debug: true
          }
        });
        
        if (error) {
          toast.error(`Error generating questions: ${error.message}`);
          return;
        }
        
        if (data && data.success && data.questions && Array.isArray(data.questions)) {
          // Process questions from API response
          const formattedQuestions: QuizQuestion[] = data.questions.map((q: any) => {
            // Determine correct answer index
            let correctAnswerIndex;
            if (typeof q.correct === 'string' && q.correct.length === 1) {
              correctAnswerIndex = q.correct.charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1, etc.
            } else if (typeof q.correct === 'number') {
              correctAnswerIndex = q.correct;
            } else {
              correctAnswerIndex = 0;
            }
            
            return {
              question: q.question,
              options: q.options,
              correctAnswer: correctAnswerIndex,
              explanation: q.explanation || "Dit is het correcte antwoord."
            };
          });
          
          setQuestions(formattedQuestions);
          
          // Set debug data if available
          if (data.debug) {
            setDebugData(data.debug);
            
            if (data.debug.prompt) {
              addLog('Debug prompt received from API');
            }
            
            if (data.debug.response) {
              addLog('Debug response received from API');
            }
          }
        } else {
          toast.error('Invalid response received from question generator');
        }
      }
    } catch (err) {
      console.error('Error starting paragraph quiz:', err);
      toast.error('An error occurred while starting the quiz');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle selecting an answer
  const handleAnswerSelect = (index: number) => {
    if (!isAnswerSubmitted) {
      setSelectedAnswer(index);
    }
  };

  // Handle submitting an answer
  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.info('Selecteer eerst een antwoord');
      return;
    }

    setIsAnswerSubmitted(true);
    
    if (questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      if (selectedAnswer === currentQuestion.correctAnswer) {
        setScore(prevScore => prevScore + 1);
      }
    }
  };

  // Handle moving to the next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      completeQuiz();
    }
  };
  
  // Complete the quiz and update progress
  const completeQuiz = () => {
    setIsQuizComplete(true);
    
    // Calculate percentage score
    const percentage = Math.round((score / questions.length) * 100);
    const passingScore = 70; // 70% passing threshold
    
    // Update progress data
    setProgressData(prevData => 
      prevData.map(p => {
        if (p.id === activeParagraphId) {
          return {
            ...p,
            completed: percentage >= passingScore,
            score: score,
            totalQuestions: questions.length,
            lastAttemptDate: new Date()
          };
        }
        return p;
      })
    );
    
    if (percentage >= passingScore) {
      toast.success(`Je hebt dit onderdeel met succes afgerond! (${percentage}%)`);
    } else {
      toast.info(`Je moet minimaal 70% scoren om door te gaan. Probeer het nog eens. (${percentage}%)`);
    }
  };
  
  // Reset quiz state
  const resetQuiz = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
    setIsStudyMode(false);
    setViewMode('content');
  };
  
  // Go to next paragraph
  const goToNextParagraph = () => {
    resetQuiz();
    
    // Find the current index and move to the next paragraph
    const currentIndex = progressData.findIndex(p => p.id === activeParagraphId);
    if (currentIndex >= 0 && currentIndex < progressData.length - 1) {
      const nextParagraph = progressData[currentIndex + 1];
      setActiveParagraphId(nextParagraph.id);
      
      // Update paragraph content
      const paragraph = paragraphs.find(p => p.id === nextParagraph.id);
      if (paragraph) {
        setCurrentParagraphContent(paragraph.content || 'No content available');
        setCurrentParagraphNumber(paragraph.paragraph_number);
      }
    }
  };
  
  // Back to chapter selection
  const backToChapterSelection = () => {
    setIsChapterSelectionMode(true);
    setViewMode('chapter-list');
    resetQuiz();
    setSearchParams({});
  };

  // Handle going back to book detail
  const handleBackToBook = () => {
    navigate(`/books/${id}`);
  };

  // Toggle debug panel
  const toggleDebugPanel = () => {
    setShowDebugPanel(!showDebugPanel);
    if (!showDebugPanel) {
      // Add 'debug=true' to the URL when enabling the debug panel
      const newParams = new URLSearchParams(searchParams);
      newParams.set('debug', 'true');
      setSearchParams(newParams);
    } else {
      // Remove 'debug=true' from the URL when disabling the debug panel
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('debug');
      setSearchParams(newParams);
    }
  };

  // Create default batch progress for debug panel
  const defaultBatchProgress: BatchProgress = {
    currentBatch: 0,
    totalBatches: 1,
    processedObjectives: 0,  
    totalObjectives: 0,      
    startTime: Date.now()    
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-center font-medium">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{book?.book_title || 'Boek'} - Gestructureerd Leren</h1>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleDebugPanel}
              className="flex items-center gap-1"
            >
              {showDebugPanel ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Verberg debug</span>
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4" />
                  <span className="hidden sm:inline">Toon debug</span>
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleBackToBook}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar boek
            </Button>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {viewMode === 'chapter-list' && (
          // Chapter selection mode
          <div className="mb-8">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Kies een hoofdstuk om mee te beginnen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Selecteer een hoofdstuk om gestructureerd te leren. Je kunt per paragraaf je kennis testen met een quiz.
                </p>
              </CardContent>
            </Card>
            
            <ChaptersList 
              chapters={chapters}
              onChapterSelect={handleChapterSelect}
              selectedChapterId={selectedChapterId}
            />
          </div>
        )}
        
        {viewMode !== 'chapter-list' && (
          <Button 
            variant="outline" 
            onClick={backToChapterSelection}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar hoofdstukkenoverzicht
          </Button>
        )}
        
        {viewMode === 'content' && (
          <>
            {/* Chapter progress */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Voortgang Hoofdstuk {selectedChapterId}</span>
                  <Badge variant="outline">{calculateChapterProgress()}% voltooid</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={calculateChapterProgress()} className="h-3 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Werk alle paragrafen door om het hoofdstuk te voltooien.
                </p>
              </CardContent>
            </Card>
            
            {/* Paragraph content and study mode */}
            {activeParagraphId && (
              <div className="mb-8">
                <QuizStudyMode
                  paragraphContent={currentParagraphContent}
                  paragraphNumber={currentParagraphNumber || 0}
                  onStartQuiz={() => startParagraphQuiz(activeParagraphId)}
                  hasExistingQuiz={false}
                  onBackToParagraphSelection={() => setViewMode('content')}
                />
              </div>
            )}
            
            {/* Debug Panel */}
            {showDebugPanel && (
              <div className="mb-8">
                <QuizDebug
                  stateLog={logs}
                  debugData={debugData}
                  bookId={book?.id || null}
                  chapterId={selectedChapterId}
                  paragraphId={activeParagraphId}
                  isStructuredLearning={true}
                  questionsCount={questions.length}
                  currentQuestionIndex={currentQuestionIndex}
                  isGenerating={isGenerating || isGeneratingQuiz}
                  paragraphsCount={paragraphs.length}
                  batchProgress={defaultBatchProgress}
                  openAIPrompt={openAIPrompt}
                  openAIResponse={openAIResponse}
                />
              </div>
            )}
            
            {/* Paragraphs list with progress indicators */}
            <div className="grid grid-cols-1 gap-4 mb-8">
              <h2 className="text-xl font-semibold">Paragrafen</h2>
              
              {loadingParagraphs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span>Paragrafen laden...</span>
                </div>
              ) : paragraphs.length > 0 ? (
                <Accordion type="single" collapsible value={activeAccordion} onValueChange={setActiveAccordion}>
                  {paragraphs.map((paragraph, index) => {
                    const progress = progressData.find(p => p.id === paragraph.id);
                    const isActive = activeParagraphId === paragraph.id;
                    const paragraphNumber = paragraph.paragraph_number || index + 1;
                    
                    return (
                      <AccordionItem key={paragraph.id} value={`paragraph-${paragraph.id}`}>
                        <AccordionTrigger className={`hover:bg-slate-50 px-3 ${isActive ? 'bg-slate-50' : ''}`}>
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center">
                              {progress?.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              ) : (
                                <span className="h-5 w-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 mr-2">
                                  {paragraphNumber}
                                </span>
                              )}
                              <span>
                                Paragraaf {paragraphNumber}
                              </span>
                            </div>
                            
                            {progress?.completed && progress.score !== undefined && progress.totalQuestions !== undefined && (
                              <Badge 
                                variant="outline"
                                className="ml-auto mr-4 bg-green-50 text-green-700 hover:bg-green-100"
                              >
                                Score: {progress.score}/{progress.totalQuestions}
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 py-3">
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {paragraph.content ? 
                                paragraph.content.substring(0, 150) + (paragraph.content.length > 150 ? '...' : '') : 
                                'Geen inhoud beschikbaar'}
                            </p>
                            
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                onClick={() => startParagraphStudy(paragraph.id)}
                                disabled={isGenerating}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                <BookOpen className="h-4 w-4" />
                                Bekijk paragraaf
                              </Button>
                              
                              <Button 
                                onClick={() => startParagraphQuiz(paragraph.id)}
                                disabled={isGenerating}
                                className="flex items-center gap-2"
                              >
                                <Play className="h-4 w-4" />
                                Start quiz
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription>
                    Geen paragrafen gevonden voor dit hoofdstuk.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}
        
        {/* Quiz Display */}
        {viewMode === 'quiz' && questions.length > 0 && (
          <Card className="border-none shadow-none mt-8">
            {/* Debug Panel */}
            {showDebugPanel && (
              <div className="mb-8">
                <QuizDebug
                  stateLog={logs}
                  debugData={debugData}
                  bookId={book?.id || null}
                  chapterId={selectedChapterId}
                  paragraphId={activeParagraphId}
                  isStructuredLearning={true}
                  questionsCount={questions.length}
                  currentQuestionIndex={currentQuestionIndex}
                  isGenerating={isGenerating || isGeneratingQuiz}
                  paragraphsCount={paragraphs.length}
                  batchProgress={defaultBatchProgress}
                  openAIPrompt={openAIPrompt}
                  openAIResponse={openAIResponse}
                />
              </div>
            )}
            
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium">
                  Vraag {currentQuestionIndex + 1} van {questions.length}
                </div>
                <div className="text-sm font-medium">
                  Score: {score} / {isAnswerSubmitted ? currentQuestionIndex + 1 : currentQuestionIndex}
                </div>
              </div>
              <Progress 
                value={(currentQuestionIndex / questions.length) * 100} 
                className="h-2 mb-4" 
              />
              <CardTitle className="text-lg">
                {questions[currentQuestionIndex]?.question}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {questions[currentQuestionIndex]?.options.map((option, index) => (
                  <div
                    key={`question-${currentQuestionIndex}-option-${index}`}
                    className={`flex items-center space-x-2 rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedAnswer === index ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                    } ${
                      isAnswerSubmitted
                        ? index === questions[currentQuestionIndex].correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : index === selectedAnswer
                          ? 'border-red-500 bg-red-50'
                          : ''
                        : ''
                    }`}
                    onClick={() => handleAnswerSelect(index)}
                  >
                    <div className={`h-6 w-6 rounded-full border flex items-center justify-center ${
                      selectedAnswer === index
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="flex-grow">
                      {option}
                    </div>
                    {isAnswerSubmitted && (
                      <div className="ml-2">
                        {index === questions[currentQuestionIndex].correctAnswer ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : index === selectedAnswer ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {isAnswerSubmitted && (
                <Alert className={selectedAnswer === questions[currentQuestionIndex].correctAnswer ? 
                    'bg-green-50 border-green-200 mt-6' : 'bg-blue-50 border-blue-200 mt-6'}>
                  <AlertDescription>
                    <h4 className="font-semibold mb-1">Uitleg:</h4>
                    {questions[currentQuestionIndex].explanation}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline"
                onClick={resetQuiz}
              >
                Terug naar paragraaf
              </Button>
              
              {!isAnswerSubmitted ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                >
                  Controleer antwoord
                </Button>
              ) : (
                <Button onClick={handleNextQuestion}>
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      Volgende vraag
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    'Voltooien'
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
        
        {/* Quiz completion screen */}
        {isQuizComplete && (
          <Card className="border-none shadow-none mb-8 mt-8">
            <CardHeader>
              <CardTitle className="text-center">Quiz Resultaten</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center mb-6">
                <span className="text-3xl font-bold">{score}/{questions.length}</span>
              </div>
              
              <Progress 
                value={Math.round((score / questions.length) * 100)} 
                className="h-4 w-full max-w-md mb-4" 
              />
              
              <p className="text-center mb-8 text-lg">
                Je hebt {score} van de {questions.length} vragen correct beantwoord.
              </p>
              
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    resetQuiz();
                    startParagraphQuiz(activeParagraphId!);
                  }}
                >
                  Probeer opnieuw
                </Button>
                <Button onClick={goToNextParagraph}>
                  Volgende paragraaf
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StructuredLearningPage;
