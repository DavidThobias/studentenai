
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Play
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useBookDetail } from '@/hooks/useBookDetail';
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import ParagraphViewer from '@/components/ParagraphViewer';

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
  
  // Get book details including paragraphs
  const { 
    book, 
    chapters, 
    paragraphs, 
    loading, 
    loadingParagraphs, 
    error, 
    fetchParagraphs,
    selectedChapterId
  } = useBookDetail(id);

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

  // Calculate overall chapter progress
  const calculateChapterProgress = () => {
    if (progressData.length === 0) return 0;
    const completedCount = progressData.filter(p => p.completed).length;
    return Math.round((completedCount / progressData.length) * 100);
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
      
      // Generate questions specific to this paragraph
      if (!book?.id || !selectedChapterId) {
        toast.error('Book or chapter information missing');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-sales-question', {
        body: { 
          bookId: book.id,
          chapterId: selectedChapterId,
          paragraphId: paragraphId,
          debug: false
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
      } else {
        toast.error('Invalid response received from question generator');
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
  
  // Handle going back to book detail
  const handleBackToBook = () => {
    navigate(`/books/${id}`);
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{book?.book_title || 'Boek'} - Gestructureerd Leren</h1>
          <Button variant="outline" onClick={handleBackToBook}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar boek
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
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
        
        {/* Study Mode - Show paragraph content before quiz */}
        {isStudyMode && activeParagraphId && (
          <div className="mb-8">
            <ParagraphViewer 
              content={currentParagraphContent}
              paragraphNumber={currentParagraphNumber}
            />
            
            <div className="flex justify-end">
              <Button 
                onClick={() => startParagraphQuiz(activeParagraphId)}
                className="bg-study-600 hover:bg-study-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Quiz
              </Button>
            </div>
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
                          {isActive && (isStudyMode || questions.length > 0) ? (
                            <Button variant="outline" onClick={resetQuiz}>
                              Annuleren
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => startParagraphStudy(paragraph.id)}
                              disabled={isGenerating}
                              className={progress?.completed ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              {isGenerating && activeParagraphId === paragraph.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Laden...
                                </>
                              ) : progress?.completed ? (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Opnieuw bekijken
                                </>
                              ) : (
                                <>
                                  <BookOpen className="mr-2 h-4 w-4" />
                                  Start leren
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Geen paragrafen gevonden voor dit hoofdstuk.
              </p>
            </div>
          )}
        </div>
        
        {/* Active paragraph quiz */}
        {activeParagraphId && questions.length > 0 && !isQuizComplete && !isStudyMode && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Quiz - Paragraaf {progressData.find(p => p.id === activeParagraphId)?.paragraphNumber || '?'}</span>
                <Badge variant="outline">
                  Vraag {currentQuestionIndex + 1} van {questions.length}
                </Badge>
              </CardTitle>
              <Progress 
                value={(currentQuestionIndex / questions.length) * 100} 
                className="h-2 mt-2" 
              />
            </CardHeader>
            <CardContent>
              {/* Quiz question */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">{questions[currentQuestionIndex].question}</h3>
                <div className="space-y-3">
                  {questions[currentQuestionIndex].options.map((option, index) => (
                    <div
                      key={index}
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
                      <div className="flex-shrink-0">
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                            selectedAnswer === index
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
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
              </div>
              
              {/* Explanation when answer is submitted */}
              {isAnswerSubmitted && (
                <Alert className={selectedAnswer === questions[currentQuestionIndex].correctAnswer ? 
                    'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}>
                  <AlertDescription>
                    <h4 className="font-semibold mb-1">Uitleg:</h4>
                    <p>{questions[currentQuestionIndex].explanation}</p>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setIsStudyMode(true)}
              >
                Bekijk inhoud opnieuw
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
        
        {/* Quiz results */}
        {isQuizComplete && activeParagraphId && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quiz Resultaten</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold">{score}/{questions.length}</span>
              </div>
              
              <Progress 
                value={Math.round((score / questions.length) * 100)} 
                className="h-4 w-full max-w-xs mb-2" 
              />
              
              <p className="text-center mb-6">
                {Math.round((score / questions.length) * 100) >= 70 
                  ? 'Gefeliciteerd! Je hebt deze paragraaf met succes afgerond.'
                  : 'Je moet minimaal 70% van de vragen goed beantwoorden om door te gaan.'}
              </p>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => startParagraphStudy(activeParagraphId)}
                >
                  Bekijk inhoud opnieuw
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => startParagraphQuiz(activeParagraphId)}
                >
                  Probeer opnieuw
                </Button>
                
                {Math.round((score / questions.length) * 100) >= 70 && (
                  <Button onClick={goToNextParagraph}>
                    Volgende paragraaf
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StructuredLearningPage;
