
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArrowLeft, Book, CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useBookDetail } from '@/hooks/useBookDetail';
import useBookQuizGenerator from '@/hooks/useBookQuizGenerator';
import QuizContainer from '@/components/quiz/QuizContainer';
import ReactMarkdown from 'react-markdown';

const BookQuizPage = () => {
  const { id: bookId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const chapterIdParam = searchParams.get('chapterId');
  const isOnlineMarketingParam = searchParams.get('isOnlineMarketing');
  
  const numericBookId = bookId ? parseInt(bookId) : null;
  const numericChapterId = chapterIdParam ? parseInt(chapterIdParam) : null;
  const isOnlineMarketing = isOnlineMarketingParam === 'true';
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [startedFirstQuestion, setStartedFirstQuestion] = useState(false);

  // Get book details
  const {
    book,
    chapters,
    loading: bookLoading,
    error: bookError
  } = useBookDetail(bookId);

  // Custom logging function for debugging
  const addLog = (message: string) => {
    console.log(`[BOOK-QUIZ] ${message}`);
  };

  // Initialize book-specific quiz generator
  const {
    questions,
    isGenerating,
    quizError,
    objectives,
    hasMoreBatches,
    startQuizGeneration,
    triggerNextBatch
  } = useBookQuizGenerator({
    bookId: numericBookId,
    chapterId: numericChapterId,
    paragraphId: null,
    isOnlineMarketing,
    addLog
  });

  // Start quiz generation when parameters are available
  useEffect(() => {
    if (numericBookId && numericChapterId) {
      startQuizGeneration(5);
    }
  }, [numericBookId, numericChapterId]);

  // Handle selecting an answer
  const handleAnswerSelect = (index: number) => {
    if (!isAnswerSubmitted) {
      setSelectedAnswer(index);
      
      // If this is the first question and user hasn't started answering yet,
      // trigger loading the next batch of questions
      if (currentQuestionIndex === 0 && !startedFirstQuestion) {
        setStartedFirstQuestion(true);
        triggerNextBatch();
      }
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
      setIsQuizComplete(true);
    }
  };

  // Restart the quiz
  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
    setStartedFirstQuestion(false);
    startQuizGeneration(5);
  };

  // Go back to book detail
  const handleBackToBook = () => {
    navigate(`/books/${bookId}`);
  };

  // Handle chapter selection
  const handleSelectChapter = (chapterId: number) => {
    navigate(`/books/${bookId}/quiz?chapterId=${chapterId}&isOnlineMarketing=${isOnlineMarketing}`);
  };

  // Get selected chapter title
  const getSelectedChapterTitle = () => {
    if (!numericChapterId) return 'Kies een hoofdstuk';
    const chapter = chapters.find(ch => ch.chapter_number === numericChapterId);
    return chapter ? `Hoofdstuk ${numericChapterId}: ${chapter.chapter_title}` : `Hoofdstuk ${numericChapterId}`;
  };

  // Loading state
  if (bookLoading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  // Book not found
  if (bookError || !book) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{bookError || 'Boek niet gevonden'}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/books')}>Terug naar boeken</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleBackToBook}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar {book.book_title}
            </Button>
            <h1 className="text-2xl font-bold">{getSelectedChapterTitle()}</h1>
          </div>
        </div>

        {/* Chapter selection if no chapter is selected */}
        {!numericChapterId && chapters.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Kies een hoofdstuk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chapters.map((chapter) => (
                  <Button
                    key={chapter.id}
                    variant="outline"
                    className="h-auto py-6 flex items-start justify-start text-left"
                    onClick={() => handleSelectChapter(chapter.chapter_number)}
                  >
                    <Book className="h-5 w-5 mr-2 flex-shrink-0" />
                    <div>
                      <span className="block font-medium">Hoofdstuk {chapter.chapter_number}</span>
                      <span className="block text-sm text-muted-foreground mt-1">{chapter.chapter_title}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz content */}
        {numericChapterId && (
          <QuizContainer objectives={objectives}>
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
                <p className="text-xl font-medium mb-2">Quiz wordt gegenereerd</p>
                <p className="text-muted-foreground">Een moment geduld alstublieft...</p>
              </div>
            ) : quizError ? (
              <div className="text-center py-12">
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{quizError}</AlertDescription>
                </Alert>
                <Button onClick={() => startQuizGeneration(5)}>Opnieuw proberen</Button>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-6">Geen vragen beschikbaar voor dit hoofdstuk.</p>
                <Button onClick={() => handleBackToBook()}>Terug naar boek</Button>
              </div>
            ) : isQuizComplete ? (
              // Quiz results
              <Card className="border-none shadow-none mb-8">
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
                    <Button variant="outline" onClick={handleRestartQuiz}>
                      Opnieuw proberen
                    </Button>
                    <Button onClick={handleBackToBook}>
                      Terug naar boek
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Question display
              <Card className="border-none shadow-none">
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
                    <ReactMarkdown>{questions[currentQuestionIndex]?.question}</ReactMarkdown>
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
                          <ReactMarkdown>{option}</ReactMarkdown>
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
                        <ReactMarkdown>{questions[currentQuestionIndex].explanation}</ReactMarkdown>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
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
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </>
                      ) : (
                        'Voltooien'
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )}
          </QuizContainer>
        )}
      </div>
    </div>
  );
};

export default BookQuizPage;
