import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Quiz from '@/components/Quiz';
import BookHeader from '@/components/book/BookHeader';
import BookOverview from '@/components/book/BookOverview';
import ChaptersList from '@/components/book/ChaptersList';
import ParagraphsList from '@/components/book/ParagraphsList';
import UpcomingFeatures from '@/components/book/UpcomingFeatures';
import LoadingBookDetail from '@/components/book/LoadingBookDetail';
import { useBookDetail } from '@/hooks/useBookDetail';
import { toast } from "sonner"; 
import { supabase } from "@/integrations/supabase/client";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | undefined>(undefined);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("Quiz");
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);

  const { 
    book, 
    chapters, 
    paragraphs, 
    loading, 
    loadingParagraphs, 
    error, 
    fetchParagraphs 
  } = useBookDetail(id);

  useEffect(() => {
    console.log("BookDetail state:", {
      quizOpen,
      quizQuestionsCount: quizQuestions.length,
      isGeneratingQuiz,
      quizError,
      quizTitle,
      quizSessionId
    });
  }, [quizOpen, quizQuestions, isGeneratingQuiz, quizError, quizTitle, quizSessionId]);

  useEffect(() => {
    if (isGeneratingQuiz || quizQuestions.length > 0 || quizError) {
      console.log('Setting quiz open to true due to', 
        isGeneratingQuiz ? 'generating quiz' : 
        quizQuestions.length > 0 ? 'questions available' : 
        'quiz error');
      setQuizOpen(true);
    }
  }, [isGeneratingQuiz, quizQuestions, quizError]);

  const handleStartQuiz = useCallback(async (chapterId?: number, paragraphId?: number) => {
    console.log(`Starting quiz for ${chapterId ? `chapter ${chapterId}` : 'whole book'}${paragraphId ? `, paragraph ${paragraphId}` : ''}`);
    
    setQuizError(null);
    
    const sessionId = `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    setQuizSessionId(sessionId);
    console.log(`Created new quiz session: ${sessionId}`);
    
    setQuizOpen(true);
    setIsGeneratingQuiz(true);
    
    setSelectedChapterId(chapterId?.toString());
    setSelectedParagraphId(paragraphId?.toString());
    
    if (paragraphId) {
      const paragraph = paragraphs.find(p => p.id === paragraphId);
      setQuizTitle(`Quiz over paragraaf ${paragraph?.["paragraaf nummer"] || ''}`);
    } else if (chapterId) {
      const chapter = chapters.find(c => c.id === chapterId);
      setQuizTitle(`Quiz over hoofdstuk ${chapter?.Hoofdstuknummer || ''}`);
    } else {
      setQuizTitle(`Quiz over ${book?.Titel || 'het boek'}`);
    }
    
    toast.info('Quiz wordt voorbereid...');
    
    try {
      console.log(`Calling generate-quiz function for book ${id}, chapter ${chapterId || 'all'}, paragraph ${paragraphId || 'all'}`);
      
      const { data: response, error: functionError } = await supabase.functions.invoke('generate-quiz', {
        body: {
          bookId: parseInt(id || '0'),
          chapterId: chapterId || null,
          paragraphId: paragraphId || null,
          numberOfQuestions: 3,
          forceNewQuestions: true,
          sessionId: sessionId
        },
      });
      
      console.log('Function response:', response);
      
      if (functionError) {
        console.error('Error invoking generate-quiz function:', functionError);
        setQuizError(`Er is een fout opgetreden bij het genereren van de quiz: ${functionError.message}`);
        toast.error('Fout bij het genereren van de quiz.');
        setIsGeneratingQuiz(false);
        return;
      }
      
      if (!response || !response.success) {
        console.error('Error from generate-quiz function:', response?.error || 'Unknown error');
        setQuizError(`Er is een fout opgetreden bij het genereren van de quiz: ${response?.error || 'Onbekende fout'}`);
        toast.error('Fout bij het genereren van de quiz.');
        setIsGeneratingQuiz(false);
        return;
      }
      
      if (response.questions && response.questions.length > 0) {
        console.log('Setting quiz questions:', response.questions.length, 'questions found');
        const formattedQuestions = response.questions.map((q: any) => ({
          question: q.question,
          options: Array.isArray(q.options) 
            ? q.options.map((opt: any) => String(opt))
            : [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }));
        
        console.log('Formatted questions:', formattedQuestions);
        
        setQuizQuestions(formattedQuestions);
        
        setTimeout(() => {
          setIsGeneratingQuiz(false);
        }, 500);
        
        toast.success('Quiz is gegenereerd!');
      } else {
        console.warn('No questions found in response:', response);
        setQuizError('Geen vragen konden worden gegenereerd. Probeer het opnieuw.');
        toast.error('Geen vragen konden worden gegenereerd.');
        setIsGeneratingQuiz(false);
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      setQuizError(`Er is een onverwachte fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
      toast.error('Er is een fout opgetreden bij het genereren van de quiz.');
      setIsGeneratingQuiz(false);
    }
  }, [id, book, chapters, paragraphs]);

  const handleChapterSelect = (chapterId: number) => {
    fetchParagraphs(chapterId);
  };

  const handleCloseQuiz = () => {
    console.log('Closing quiz');
    setQuizOpen(false);
    setIsGeneratingQuiz(false);
    setQuizError(null);
  };

  if (loading) {
    return <LoadingBookDetail />;
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <BookHeader title={book?.Titel} author={book?.Auteur} />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <BookOverview 
          book={book} 
          onStartQuiz={() => handleStartQuiz()} 
        />

        <ChaptersList 
          chapters={chapters} 
          onStartQuiz={handleStartQuiz} 
          onChapterSelect={handleChapterSelect} 
        />

        <ParagraphsList 
          paragraphs={paragraphs} 
          loadingParagraphs={loadingParagraphs} 
          onStartQuiz={handleStartQuiz} 
        />

        <UpcomingFeatures />
      </div>

      <Quiz 
        questions={quizQuestions}
        onClose={handleCloseQuiz}
        open={quizOpen}
        title={quizTitle}
        error={quizError}
        isGenerating={isGeneratingQuiz}
      />
    </div>
  );
};

export default BookDetail;
