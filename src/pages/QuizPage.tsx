import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw, 
  Loader2, 
  AlertCircle, 
  Bug, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  BookOpen,
  ChevronRight,
  BookCheck
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface ParagraphProgress {
  id: number;
  paragraphNumber: number;
  chapterId: number;
  completed: boolean;
  score?: number;
  totalQuestions?: number;
  lastAttemptDate?: Date;
}

interface ParagraphData {
  id: number;
  paragraph_number?: number;
  content?: string;
  chapter_number: number;
}

interface ChapterData {
  id: number;
  chapter_number: number;
  chapter_title?: string;
}

const QuizPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [questions, setQuestions] = useState<Array<QuizQuestion>>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [paragraphId, setParagraphId] = useState<number | null>(null);
  const [quizTitle, setQuizTitle] = useState<string>("Quiz");
  
  const [isStructuredLearning, setIsStructuredLearning] = useState(false);
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([]);
  const [progressData, setProgressData] = useState<ParagraphProgress[]>([]);
  const [currentParagraphContent, setCurrentParagraphContent] = useState<string>('');
  const [showParagraphContent, setShowParagraphContent] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [isFetchingParagraphs, setIsFetchingParagraphs] = useState(false);
  
  const [showDebug, setShowDebug] = useState(false);
  const [debugAccordion, setDebugAccordion] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>({
    prompt: null,
    response: null,
    apiResponse: null
  });
  const [stateLog, setStateLog] = useState<string[]>([]);
  
  // Added state for available chapters
  const [availableChapters, setAvailableChapters] = useState<ChapterData[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  
  useEffect(() => {
    const bookIdParam = searchParams.get('bookId');
    const chapterIdParam = searchParams.get('chapterId');
    const paragraphIdParam = searchParams.get('paragraphId');
    const structuredParam = searchParams.get('structured');
    
    addLog(`URL parameters: bookId=${bookIdParam}, chapterId=${chapterIdParam}, paragraphId=${paragraphIdParam}, structured=${structuredParam}`);
    
    setIsStructuredLearning(structuredParam === 'true');
    
    if (bookIdParam) {
      const numericBookId = parseInt(bookIdParam);
      setBookId(numericBookId);
      addLog(`Setting bookId from URL: ${numericBookId}`);
      
      // Fetch available chapters for this book
      fetchChaptersForBook(numericBookId);
    } else {
      const savedBookId = localStorage.getItem('quizBookId');
      if (savedBookId) {
        const numericBookId = parseInt(savedBookId);
        setBookId(numericBookId);
        addLog(`Setting bookId from localStorage fallback: ${numericBookId}`);
        
        // Fetch available chapters for this book
        fetchChaptersForBook(numericBookId);
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
    
    if (paragraphIdParam) {
      setQuizTitle(`Quiz over paragraaf ${paragraphIdParam}`);
    } else if (chapterIdParam) {
      setQuizTitle(`Quiz over hoofdstuk ${chapterIdParam}`);
    } else if (bookIdParam) {
      setQuizTitle("Quiz over het boek");
    } else {
      setQuizTitle("Quiz over Sales");
    }
    
    if (structuredParam === 'true' && chapterIdParam && bookIdParam) {
      fetchAllParagraphsForChapter(parseInt(chapterIdParam));
    } else {
      loadSavedQuizState(bookIdParam, chapterIdParam, paragraphIdParam);
    }
  }, [searchParams]);
  
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
  
  const addLog = (message: string) => {
    console.log(`[QUIZ DEBUG] ${message}`);
    setStateLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const loadSavedQuizState = (bookIdParam: string | null, chapterIdParam: string | null, paragraphIdParam: string | null) => {
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
    
    const hasValidContext = bookIdParam || (savedQuiz && JSON.parse(savedQuiz).bookId);
    const hasQuestions = savedQuiz && JSON.parse(savedQuiz).questions && JSON.parse(savedQuiz).questions.length > 0;
    
    if (hasValidContext && !hasQuestions) {
      addLog('Auto-starting quiz generation with context');
      generateQuiz();
    } else if (!hasValidContext) {
      addLog('Missing required context (bookId) for auto-generation');
      setQuizError('Geen boek geselecteerd. Ga terug naar een boek en start de quiz daar.');
    }
  };

  // New function to fetch chapters for a book
  const fetchChaptersForBook = async (bookId: number) => {
    try {
      setIsLoadingChapters(true);
      addLog(`Fetching chapters for book ${bookId}`);
      
      const { data, error } = await supabase
        .from('books')
        .select('id, chapter_number, chapter_title')
        .eq('book_id', bookId)
        .order('chapter_number', { ascending: true })
        .distinct('chapter_number');
      
      if (error) {
        console.error('Error fetching chapters:', error);
        addLog(`Error fetching chapters: ${error.message}`);
        return;
      }
      
      if (data && data.length > 0) {
        // Process the chapters to make sure we have unique chapter numbers
        const uniqueChapters = data.filter((chapter, index, self) => 
          index === self.findIndex(c => c.chapter_number === chapter.chapter_number)
        );
        
        setAvailableChapters(uniqueChapters);
        addLog(`Fetched ${uniqueChapters.length} chapters for book ${bookId}`);
      } else {
        addLog(`No chapters found for book ${bookId}`);
      }
    } catch (err) {
      console.error('Error in fetchChaptersForBook:', err);
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoadingChapters(false);
    }
  };
  
  const fetchAllParagraphsForChapter = async (chapterId: number) => {
    try {
      setIsFetchingParagraphs(true);
      addLog(`Fetching all paragraphs for chapter ${chapterId}`);
      
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('chapter_number', chapterId)
        .order('paragraph_number', { ascending: true });
      
      if (error) {
        console.error('Error fetching paragraphs:', error);
        addLog(`Error fetching paragraphs: ${error.message}`);
        toast.error(`Fout bij ophalen paragrafen: ${error.message}`);
        return;
      }
      
      const paragraphsData = data || [];
      setParagraphs(paragraphsData);
      addLog(`Fetched ${paragraphsData.length} paragraphs for chapter ${chapterId}`);
      
      const initialProgressData = paragraphsData.map(p => ({
        id: p.id,
        paragraphNumber: p.paragraph_number || 0,
        chapterId: p.chapter_number,
        completed: false,
      }));
      
      setProgressData(initialProgressData);
      
      if (paragraphsData.length > 0) {
        if (paragraphId) {
          const selectedParagraph = paragraphsData.find(p => p.id === paragraphId);
          if (selectedParagraph) {
            setCurrentParagraphContent(selectedParagraph.content || 'No content available');
          }
        } else {
          setParagraphId(paragraphsData[0].id);
          setCurrentParagraphContent(paragraphsData[0].content || 'No content available');
          setQuizTitle(`Quiz over paragraaf ${paragraphsData[0].paragraph_number || 1}`);
        }
        
        if (isStructuredLearning) {
          const targetParagraphId = paragraphId || paragraphsData[0].id;
          generateQuizForParagraph(targetParagraphId);
        }
      } else {
        addLog('No paragraphs found for this chapter');
        toast.warning('Geen paragrafen gevonden voor dit hoofdstuk');
      }
    } catch (err) {
      console.error('Error in fetchAllParagraphsForChapter:', err);
      addLog(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsFetchingParagraphs(false);
    }
  };
  
  const handleBackToBook = () => {
    if (bookId) {
      navigate(`/books/${bookId}`);
    } else {
      navigate('/books');
    }
  };
  
  const handleBackToHome = () => {
    navigate('/');
  };
  
  const generateQuizForParagraph = async (paragraphId: number) => {
    try {
      setIsGenerating(true);
      setQuizError(null);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
      setShowParagraphContent(false);
      
      setParagraphId(paragraphId);
      
      const paragraph = paragraphs.find(p => p.id === paragraphId);
      if (paragraph) {
        setCurrentParagraphContent(paragraph.content || 'No content available');
        setQuizTitle(`Quiz over paragraaf ${paragraph.paragraph_number || '?'}`);
      }
      
      addLog(`Generating quiz questions for paragraph ${paragraphId}`);
      
      if (!bookId || !chapterId) {
        setQuizError('Boek of hoofdstuk informatie ontbreekt');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-sales-question', {
        body: { 
          bookId: bookId,
          chapterId: chapterId,
          paragraphId: paragraphId,
          count: 5,
          debug: true 
        }
      });
      
      if (error) {
        console.error('Error generating quiz:', error);
        setQuizError(`Er is een fout opgetreden: ${error.message}`);
        return;
      }
      
      if (data && data.success && data.questions && Array.isArray(data.questions)) {
        const formattedQuestions: QuizQuestion[] = data.questions.map((q: any) => {
          let correctAnswerIndex;
          
          if (typeof q.correct === 'string' && q.correct.length === 1) {
            correctAnswerIndex = q.correct.charCodeAt(0) - 65;
          } else if (typeof q.correct === 'number') {
            correctAnswerIndex = q.correct;
          } else {
            correctAnswerIndex = 0;
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
        
        if (data.debug) {
          setDebugData({
            ...debugData,
            prompt: data.debug.prompt,
            response: data.debug.response,
            apiResponse: data
          });
          addLog('Debug data saved from API response');
        }
      } else {
        setQuizError('Geen vragen konden worden gegenereerd. Controleer of er content beschikbaar is voor deze paragraaf.');
        addLog(`Failed to generate questions: Invalid response format or no questions returned`);
      }
    } catch (err) {
      console.error('Error in generateQuizForParagraph:', err);
      setQuizError(`Er is een onverwachte fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Updated generateQuiz function to use questionCount parameter properly
  const generateQuiz = async (customQuestionCount?: number) => {
    // Use either the provided custom count or the state value, with default fallback to 5
    const count = customQuestionCount || questionCount || 5;
    
    if (!isStructuredLearning) {
      setIsGenerating(true);
      setQuizError(null);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
      
      addLog(`Generating ${count} quiz questions for context: bookId=${bookId}, chapterId=${chapterId}, paragraphId=${paragraphId}`);
      
      const payload: any = { 
        count: count, 
        debug: true 
      };
      
      if (bookId) payload.bookId = bookId;
      if (chapterId) payload.chapterId = chapterId;
      if (paragraphId) payload.paragraphId = paragraphId;
      
      addLog(`Sending payload to generate-sales-question: ${JSON.stringify(payload)}`);
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-sales-question', {
          body: payload
        });
        
        if (data) {
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
          const formattedQuestions: QuizQuestion[] = data.questions.map((q: any) => {
            let correctAnswerIndex;
            
            if (typeof q.correct === 'string' && q.correct.length === 1) {
              correctAnswerIndex = q.correct.charCodeAt(0) - 65;
            } else if (typeof q.correct === 'number') {
              correctAnswerIndex = q.correct;
            } else {
              correctAnswerIndex = 0;
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
      } finally {
        setIsGenerating(false);
      }
    } else if (paragraphId) {
      generateQuizForParagraph(paragraphId);
    } else if (paragraphs.length > 0) {
      generateQuizForParagraph(paragraphs[0].id);
    } else {
      if (chapterId) {
        await fetchAllParagraphsForChapter(chapterId);
      } else {
        setQuizError('Geen hoofdstuk geselecteerd om quiz te genereren');
      }
    }
  };

  // New function to handle chapter selection
  const handleChapterSelect = (selectedChapterId: string) => {
    const numericChapterId = parseInt(selectedChapterId);
    setChapterId(numericChapterId);
    setQuizTitle(`Quiz over hoofdstuk ${numericChapterId}`);
    addLog(`Selected chapter: ${numericChapterId}`);
    
    // Reset paragraph-specific state
    setParagraphId(null);
    setParagraphs([]);
    setProgressData([]);
    
    if (isStructuredLearning) {
      fetchAllParagraphsForChapter(numericChapterId);
    } else {
      // Clear current quiz for non-structured learning
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
    }
  };

  const goToNextParagraph = () => {
    if (paragraphs.length === 0) return;
    
    const currentIndex = paragraphs.findIndex(p => p.id === paragraphId);
    if (currentIndex >= 0 && currentIndex < paragraphs.length - 1) {
      const nextParagraph = paragraphs[currentIndex + 1];
      
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
      setShowParagraphContent(false);
      
      generateQuizForParagraph(nextParagraph.id);
    } else {
      toast.info('Je bent bij de laatste paragraaf');
    }
  };

  const toggleParagraphContent = () => {
    setShowParagraphContent(!showParagraphContent);
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
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    setIsQuizComplete(true);
    
    if (isStructuredLearning && paragraphId) {
      const percentage = Math.round((score / questions.length) * 100);
      const passingScore = 70;
      
      setProgressData(prevData => 
        prevData.map(p => {
          if (p.id === paragraphId) {
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
    }
  };

  const handleToggleExplanation = () => {
    addLog(`${showExplanation ? 'Hiding' : 'Showing'} explanation`);
    setShowExplanation(!showExplanation);
  };

  const restartQuiz = () => {
    addLog('Restarting quiz');
    if (isStructuredLearning && paragraphId) {
      generateQuizForParagraph(paragraphId);
    } else {
      generateQuiz();
    }
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

  const calculateChapterProgress = () => {
    if (progressData.length === 0) return 0;
    const completedCount = progressData.filter(p => p.completed).length;
    return Math.round((completedCount / progressData.length) * 100);
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

  // Updated empty state with chapter selector
  const renderEmptyContent = () => {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-6">
        {!bookId ? (
          <>
            <Alert variant="warning" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Voor het genereren van een quiz is een boek, hoofdstuk of paragraaf nodig.
                Ga naar een boekdetailpagina om een quiz te starten.
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={handleBackToHome} className="mt-4">
              Terug naar home
            </Button>
          </>
        ) : (
          <div className="space-y-6 w-full max-w-md">
            {bookId && !chapterId && availableChapters.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Selecteer een hoofdstuk</h3>
                <Select onValueChange={handleChapterSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kies een hoofdstuk" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChapters.map((chapter) => (
                      <SelectItem 
                        key={chapter.id} 
                        value={chapter.chapter_number.toString()}
                      >
                        Hoofdstuk {chapter.chapter_number}: {chapter.chapter_title || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Aantal vragen</h3>
              <Select 
                defaultValue={questionCount.toString()} 
                onValueChange={(value) => setQuestionCount(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aantal vragen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 vragen</SelectItem>
                  <SelectItem value="5">5 vragen</SelectItem>
                  <SelectItem value="10">10 vragen</SelectItem>
                  <SelectItem value="15">15 vragen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={() => generateQuiz()} 
              className="w-full"
              disabled={!bookId || (availableChapters.length > 0 && !chapterId)}
            >
              <BookCheck className="mr-2 h-4 w-4" />
              {bookId && !chapterId && 'Genereer quiz over het boek'}
              {chapterId && !paragraphId && `Genereer quiz over hoofdstuk ${chapterId}`}
              {paragraphId && `Genereer quiz over paragraaf ${paragraphId}`}
            </Button>
            
            {isLoadingChapters && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Hoofdstukken laden...</span>
              </div>
            )}
          </div>
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
          
          {isStructuredLearning && paragraphId && (
            <Button onClick={goToNextParagraph} className="flex-1 bg-green-600 hover:bg-green-700">
              Volgende paragraaf
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          
          {!isStructuredLearning && (
            <Button onClick={handleBackToBook} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar boek
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
          {isStructuredLearning && showParagraphContent && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md border">
              <h3 className="font-medium mb-2">Paragraaf inhoud:</h3>
              <p className="text-sm whitespace-pre-line">{currentParagraphContent}</p>
              <Button 
                variant="outline"
