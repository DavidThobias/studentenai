
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { Loader2 } from 'lucide-react';

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

  const { 
    book, 
    chapters, 
    paragraphs, 
    loading, 
    loadingParagraphs, 
    error, 
    fetchParagraphs 
  } = useBookDetail(id);

  const handleStartQuiz = async (chapterId?: number, paragraphId?: number) => {
    console.log(`Starting quiz for ${chapterId ? `chapter ${chapterId}` : 'whole book'}${paragraphId ? `, paragraph ${paragraphId}` : ''}`);
    setSelectedChapterId(chapterId?.toString());
    setSelectedParagraphId(paragraphId?.toString());
    setQuizQuestions([]);
    setQuizError(null);
    
    // Add a toast to give the user feedback
    toast.info('Quiz wordt voorbereid...');
    
    // Generate the quiz questions before opening the dialog
    try {
      setIsGeneratingQuiz(true);
      
      console.log(`Calling generate-quiz function for book ${id}, chapter ${chapterId || 'all'}, paragraph ${paragraphId || 'all'}`);
      
      const { data: response, error: functionError } = await supabase.functions.invoke('generate-quiz', {
        body: {
          bookId: parseInt(id || '0'),
          chapterId: chapterId || null,
          paragraphId: paragraphId || null,
          numberOfQuestions: 3,
          forceNewQuestions: true,
        },
      });
      
      console.log('Function response:', { response, functionError });
      
      if (functionError) {
        console.error('Error invoking generate-quiz function:', functionError);
        setQuizError(`Er is een fout opgetreden bij het genereren van de quiz: ${functionError.message}`);
        toast.error('Fout bij het genereren van de quiz.');
        return;
      }
      
      if (!response.success) {
        console.error('Error from generate-quiz function:', response.error);
        setQuizError(`Er is een fout opgetreden bij het genereren van de quiz: ${response.error}`);
        toast.error('Fout bij het genereren van de quiz.');
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
        toast.success('Quiz is gegenereerd!');
      } else {
        console.warn('No questions found in response:', response);
        setQuizError('Geen vragen konden worden gegenereerd. Probeer het opnieuw.');
        toast.error('Geen vragen konden worden gegenereerd.');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      setQuizError(`Er is een onverwachte fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
      toast.error('Er is een fout opgetreden bij het genereren van de quiz.');
    } finally {
      setIsGeneratingQuiz(false);
      // Open the dialog after quiz generation attempt is complete
      setQuizOpen(true);
    }
  };

  const handleChapterSelect = (chapterId: number) => {
    fetchParagraphs(chapterId);
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

      {/* Quiz Dialog */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedParagraphId 
                ? `Quiz over paragraaf ${paragraphs.find(p => p.id.toString() === selectedParagraphId)?.["paragraaf nummer"] || ''}`
                : selectedChapterId 
                  ? `Quiz over hoofdstuk ${chapters.find(c => c.id.toString() === selectedChapterId)?.Hoofdstuknummer || ''}`
                  : `Quiz over ${book?.Titel}`}
            </DialogTitle>
            <DialogDescription>
              Test je kennis met deze interactieve quiz over het hoofdstuk.
            </DialogDescription>
          </DialogHeader>
          
          {isGeneratingQuiz ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-center">Quiz wordt gegenereerd...</p>
            </div>
          ) : quizError ? (
            <Alert variant="destructive" className="my-4">
              <AlertDescription>{quizError}</AlertDescription>
            </Alert>
          ) : (
            <Quiz 
              questions={quizQuestions}
              onClose={() => setQuizOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookDetail;
