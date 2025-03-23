
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuiz } from '@/hooks/useQuiz';
import { useChaptersAndParagraphs } from '@/hooks/useChaptersAndParagraphs';
import QuizLoading from '@/components/quiz/QuizLoading';
import QuizError from '@/components/quiz/QuizError';
import QuizEmpty from '@/components/quiz/QuizEmpty';
import QuizQuestion from '@/components/quiz/QuizQuestion';
import QuizResults from '@/components/quiz/QuizResults';
import QuizSidebar from '@/components/quiz/QuizSidebar';
import QuizDebug from '@/components/quiz/QuizDebug';

const QuizPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Logger state and function
  const [stateLog, setStateLog] = useState<string[]>([]);
  const addLog = (message: string) => {
    console.log(`[QUIZ DEBUG] ${message}`);
    setStateLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Extract URL parameters
  const bookIdParam = searchParams.get('bookId');
  const chapterIdParam = searchParams.get('chapterId');
  const paragraphIdParam = searchParams.get('paragraphId');
  const structuredParam = searchParams.get('structured');
  
  // State for quiz configuration
  const [quizTitle, setQuizTitle] = useState<string>("Quiz");
  const [isStructuredLearning, setIsStructuredLearning] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Initialize hooks
  const {
    questions,
    quizError,
    isGenerating,
    currentQuestionIndex,
    selectedAnswer,
    isAnswerSubmitted,
    score,
    isQuizComplete,
    showExplanation,
    bookId,
    chapterId,
    paragraphId,
    debugData,
    setBookId,
    setChapterId,
    setParagraphId,
    loadSavedQuizState,
    generateQuiz,
    generateQuizForParagraph,
    handleAnswerSelect,
    handleSubmitAnswer,
    handleNextQuestion,
    restartQuiz,
    toggleExplanation
  } = useQuiz(
    bookIdParam ? parseInt(bookIdParam) : null,
    chapterIdParam ? parseInt(chapterIdParam) : null,
    paragraphIdParam ? parseInt(paragraphIdParam) : null,
    addLog
  );

  const {
    availableChapters,
    paragraphs,
    progressData,
    currentParagraphContent,
    showParagraphContent,
    isLoadingChapters,
    isFetchingParagraphs,
    fetchChaptersForBook,
    fetchAllParagraphsForChapter,
    setParagraphCompleted,
    calculateChapterProgress,
    toggleParagraphContent,
    getNextParagraphId,
    setCurrentParagraph
  } = useChaptersAndParagraphs(
    bookId,
    chapterId,
    addLog
  );

  // Setup effect for initial state based on URL parameters
  useEffect(() => {
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
    
    // Set quiz title based on parameters
    if (paragraphIdParam) {
      setQuizTitle(`Quiz over paragraaf ${paragraphIdParam}`);
    } else if (chapterIdParam) {
      setQuizTitle(`Quiz over hoofdstuk ${chapterIdParam}`);
    } else if (bookIdParam) {
      setQuizTitle("Quiz over het boek");
    } else {
      setQuizTitle("Quiz over Sales");
    }
    
    if (structuredParam === 'true' && chapterIdParam) {
      fetchAllParagraphsForChapter(parseInt(chapterIdParam));
    } else {
      const { hasValidContext, hasQuestions } = loadSavedQuizState(bookIdParam, chapterIdParam, paragraphIdParam);
      
      if (hasValidContext && !hasQuestions) {
        addLog('Auto-starting quiz generation with context');
        generateQuiz();
      }
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handler functions
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

  const handleChapterSelect = (selectedChapterId: string) => {
    const numericChapterId = parseInt(selectedChapterId);
    setChapterId(numericChapterId);
    setQuizTitle(`Quiz over hoofdstuk ${numericChapterId}`);
    addLog(`Selected chapter: ${numericChapterId}`);
    
    // Reset paragraph-specific state
    setParagraphId(null);
    
    if (isStructuredLearning) {
      fetchAllParagraphsForChapter(numericChapterId);
    }
  };

  const handleQuestionCountChange = (count: number) => {
    setQuestionCount(count);
  };

  const handleGenerateQuiz = () => {
    generateQuiz(questionCount);
  };

  const handleSelectParagraph = (paragraphId: number) => {
    if (!paragraphId) return;
    
    setCurrentParagraph(paragraphId);
    setQuizTitle(`Quiz over paragraaf ${paragraphs.find(p => p.id === paragraphId)?.paragraph_number || '?'}`);
    generateQuizForParagraph(paragraphId);
  };

  const handleCompleteQuiz = () => {
    if (isStructuredLearning && paragraphId) {
      setParagraphCompleted(paragraphId, score, questions.length);
    }
  };

  const handleGoToNextParagraph = () => {
    if (!paragraphId) return;
    
    const nextParagraphId = getNextParagraphId(paragraphId);
    if (nextParagraphId) {
      handleSelectParagraph(nextParagraphId);
    }
  };

  useEffect(() => {
    if (isQuizComplete) {
      handleCompleteQuiz();
    }
  }, [isQuizComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render functions
  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">{quizTitle}</h1>
        
        {isStructuredLearning && progressData.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">Voortgang hoofdstuk</h2>
              <Badge variant="outline">{calculateChapterProgress()}%</Badge>
            </div>
            <Progress value={calculateChapterProgress()} className="h-2" />
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row gap-6">
          {isStructuredLearning && paragraphs.length > 0 && (
            <QuizSidebar 
              paragraphs={paragraphs} 
              progressData={progressData}
              selectedParagraphId={paragraphId}
              onSelectParagraph={handleSelectParagraph}
            />
          )}
          
          <div className="flex-1">
            {isGenerating && <QuizLoading />}
            
            {quizError && (
              <QuizError 
                error={quizError} 
                onBackToBook={handleBackToBook} 
                onRetry={handleGenerateQuiz} 
              />
            )}
            
            {!isGenerating && !quizError && questions.length === 0 && (
              <QuizEmpty 
                bookId={bookId}
                chapterId={chapterId}
                paragraphId={paragraphId}
                availableChapters={availableChapters}
                isLoadingChapters={isLoadingChapters}
                questionCount={questionCount}
                onChapterSelect={handleChapterSelect}
                onQuestionCountChange={handleQuestionCountChange}
                onGenerateQuiz={handleGenerateQuiz}
                onBackToHome={handleBackToHome}
              />
            )}
            
            {!isGenerating && !quizError && questions.length > 0 && !isQuizComplete && (
              questions[currentQuestionIndex] && (
                <QuizQuestion
                  question={questions[currentQuestionIndex]}
                  currentQuestionIndex={currentQuestionIndex}
                  questionsTotal={questions.length}
                  selectedAnswer={selectedAnswer}
                  isAnswerSubmitted={isAnswerSubmitted}
                  score={score}
                  showExplanation={showExplanation}
                  showParagraphContent={showParagraphContent}
                  currentParagraphContent={currentParagraphContent}
                  structuredLearning={isStructuredLearning}
                  onAnswerSelect={handleAnswerSelect}
                  onSubmitAnswer={handleSubmitAnswer}
                  onNextQuestion={handleNextQuestion}
                  onToggleExplanation={toggleExplanation}
                  onToggleParagraphContent={toggleParagraphContent}
                />
              )
            )}
            
            {!isGenerating && !quizError && questions.length > 0 && isQuizComplete && (
              <QuizResults
                score={score}
                totalQuestions={questions.length}
                isStructuredLearning={isStructuredLearning}
                hasNextParagraph={paragraphId ? !!getNextParagraphId(paragraphId) : false}
                onRestart={restartQuiz}
                onNextParagraph={handleGoToNextParagraph}
                onBackToBook={handleBackToBook}
              />
            )}
          </div>
        </div>
        
        <QuizDebug
          stateLog={stateLog}
          debugData={debugData}
          bookId={bookId}
          chapterId={chapterId}
          paragraphId={paragraphId}
          isStructuredLearning={isStructuredLearning}
          questionsCount={questions.length}
          currentQuestionIndex={currentQuestionIndex}
          isGenerating={isGenerating}
          paragraphsCount={paragraphs.length}
        />
      </div>
    </div>
  );
};

export default QuizPage;
