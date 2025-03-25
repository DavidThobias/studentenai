import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuiz } from '@/hooks/useQuiz';
import { useChaptersAndParagraphs } from '@/hooks/useChaptersAndParagraphs';

import QuizLoading from '@/components/quiz/QuizLoading';
import QuizError from '@/components/quiz/QuizError';
import QuizEmpty from '@/components/quiz/QuizEmpty';
import QuizQuestion from '@/components/quiz/QuizQuestion';
import QuizResults from '@/components/quiz/QuizResults';
import QuizSidebar from '@/components/quiz/QuizSidebar';
import QuizDebug from '@/components/quiz/QuizDebug';
import QuizHeader from '@/components/quiz/QuizHeader';
import QuizStudyMode from '@/components/quiz/QuizStudyMode';
import QuizParagraphSelector from '@/components/quiz/QuizParagraphSelector';
import QuizContainer from '@/components/quiz/QuizContainer';

const QuizPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [stateLog, setStateLog] = useState<string[]>([]);
  const addLog = (message: string) => {
    console.log(`[QUIZ DEBUG] ${message}`);
    setStateLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const bookIdParam = searchParams.get('bookId');
  const chapterIdParam = searchParams.get('chapterId');
  const paragraphIdParam = searchParams.get('paragraphId');
  const structuredParam = searchParams.get('structured');
  
  const [quizTitle, setQuizTitle] = useState<string>("Quiz");
  const [isStructuredLearning, setIsStructuredLearning] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [hasSelectedChapter, setHasSelectedChapter] = useState(false);
  
  const [showingParagraphContent, setShowingParagraphContent] = useState(false);
  const [selectedParagraphForStudy, setSelectedParagraphForStudy] = useState<number | null>(null);

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

  useEffect(() => {
    addLog(`URL parameters: bookId=${bookIdParam}, chapterId=${chapterIdParam}, paragraphId=${paragraphIdParam}, structured=${structuredParam}`);
    
    const structuredMode = structuredParam === 'true';
    setIsStructuredLearning(structuredMode);
    
    if (bookIdParam) {
      const numericBookId = parseInt(bookIdParam);
      setBookId(numericBookId);
      addLog(`Setting bookId from URL: ${numericBookId}`);
      
      fetchChaptersForBook(numericBookId);
    } else {
      const savedBookId = localStorage.getItem('quizBookId');
      if (savedBookId) {
        const numericBookId = parseInt(savedBookId);
        setBookId(numericBookId);
        addLog(`Setting bookId from localStorage fallback: ${numericBookId}`);
        
        fetchChaptersForBook(numericBookId);
      } else {
        addLog('No bookId found in URL or localStorage');
      }
    }
    
    if (paragraphIdParam) {
      setQuizTitle(`Quiz over paragraaf ${paragraphIdParam}`);
    } else if (chapterIdParam) {
      setQuizTitle(`Quiz over hoofdstuk ${chapterIdParam}`);
      setHasSelectedChapter(true);
    } else if (bookIdParam) {
      setQuizTitle("Quiz over het boek");
    } else {
      setQuizTitle("Quiz over Sales");
    }
    
    if (structuredMode) {
      if (chapterIdParam) {
        setHasSelectedChapter(true);
        fetchAllParagraphsForChapter(parseInt(chapterIdParam));
        
        if (paragraphIdParam) {
          const numericParagraphId = parseInt(paragraphIdParam);
          setParagraphId(numericParagraphId);
          generateQuizForParagraph(numericParagraphId);
        }
      } else if (bookIdParam) {
        addLog('Structured learning mode without chapter - showing chapter selection');
        setHasSelectedChapter(false);
      }
    } else {
      const { hasValidContext, hasQuestions } = loadSavedQuizState(bookIdParam, chapterIdParam, paragraphIdParam);
      
      if (hasValidContext && !hasQuestions && !structuredMode) {
        addLog('Auto-starting quiz generation with context');
        generateQuiz();
      }
    }
  }, [searchParams]);

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
    setHasSelectedChapter(true);
    setQuizTitle(`Quiz over hoofdstuk ${numericChapterId}`);
    addLog(`Selected chapter: ${numericChapterId}`);
    
    setParagraphId(null);
    
    if (isStructuredLearning) {
      fetchAllParagraphsForChapter(numericChapterId);
    }
  };

  const handleQuestionCountChange = (count: number) => {
    setQuestionCount(count);
  };

  const handleGenerateQuiz = () => {
    if (isStructuredLearning && hasSelectedChapter) {
      addLog('In structured learning mode, showing paragraphs without auto-generating quiz');
    } else {
      generateQuiz(questionCount);
    }
  };

  const handleSelectParagraph = (paragraphId: number) => {
    if (!paragraphId) return;
    
    setSelectedParagraphForStudy(paragraphId);
    setShowingParagraphContent(true);
    setCurrentParagraph(paragraphId);
    
    const selectedParagraph = paragraphs.find(p => p.id === paragraphId);
    setQuizTitle(`Paragraaf ${selectedParagraph?.paragraph_number || '?'}`);
  };

  const handleStartQuiz = () => {
    if (selectedParagraphForStudy) {
      const selectedParagraph = paragraphs.find(p => p.id === selectedParagraphForStudy);
      setQuizTitle(`Quiz over paragraaf ${selectedParagraph?.paragraph_number || '?'}`);
      
      generateQuizForParagraph(selectedParagraphForStudy);
      
      setShowingParagraphContent(false);
    }
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
  }, [isQuizComplete]);

  const getSelectedParagraphContent = () => {
    if (!selectedParagraphForStudy) return null;
    
    const paragraph = paragraphs.find(p => p.id === selectedParagraphForStudy);
    return paragraph?.content || null;
  };

  const getSelectedParagraphNumber = () => {
    if (!selectedParagraphForStudy) return null;
    
    const paragraph = paragraphs.find(p => p.id === selectedParagraphForStudy);
    return paragraph?.paragraph_number || null;
  };

  const renderSidebar = () => {
    if (isStructuredLearning && hasSelectedChapter && paragraphs.length > 0) {
      return (
        <QuizSidebar 
          paragraphs={paragraphs} 
          progressData={progressData}
          selectedParagraphId={showingParagraphContent ? selectedParagraphForStudy : paragraphId}
          onSelectParagraph={handleSelectParagraph}
        />
      );
    }
    return null;
  };

  const renderMainContent = () => {
    if (isStructuredLearning && hasSelectedChapter && showingParagraphContent && selectedParagraphForStudy) {
      return (
        <QuizStudyMode 
          paragraphContent={getSelectedParagraphContent()}
          paragraphNumber={getSelectedParagraphNumber()}
          onStartQuiz={handleStartQuiz}
        />
      );
    }
    
    if (isStructuredLearning && hasSelectedChapter && !showingParagraphContent && !paragraphId && paragraphs.length > 0 && !isGenerating) {
      return (
        <QuizParagraphSelector 
          paragraphs={paragraphs}
          onSelectFirstParagraph={() => handleSelectParagraph(paragraphs[0].id)}
        />
      );
    }
    
    if (!showingParagraphContent) {
      if (isGenerating) {
        return <QuizLoading />;
      }
      
      if (quizError) {
        return (
          <QuizError 
            error={quizError} 
            onBackToBook={handleBackToBook} 
            onRetry={handleGenerateQuiz} 
          />
        );
      }
      
      if (!isGenerating && !quizError && questions.length === 0 && 
         !(isStructuredLearning && hasSelectedChapter && paragraphs.length > 0 && !paragraphId)) {
        return (
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
            isStructuredLearning={isStructuredLearning}
          />
        );
      }
      
      if (!isGenerating && !quizError && questions.length > 0 && !isQuizComplete) {
        return questions[currentQuestionIndex] ? (
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
        ) : null;
      }
      
      if (!isGenerating && !quizError && questions.length > 0 && isQuizComplete) {
        return (
          <QuizResults
            score={score}
            totalQuestions={questions.length}
            isStructuredLearning={isStructuredLearning}
            hasNextParagraph={paragraphId ? !!getNextParagraphId(paragraphId) : false}
            onRestart={restartQuiz}
            onNextParagraph={handleGoToNextParagraph}
            onBackToBook={handleBackToBook}
          />
        );
      }
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <QuizHeader 
          title={quizTitle}
          isStructuredLearning={isStructuredLearning}
          progressData={progressData}
          calculateChapterProgress={calculateChapterProgress}
        />
        
        <QuizContainer sidebar={renderSidebar()}>
          {renderMainContent()}
        </QuizContainer>
        
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
