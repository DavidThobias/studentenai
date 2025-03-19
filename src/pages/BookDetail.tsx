
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, ChevronRight, FileText, Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Quiz from '@/components/Quiz';

interface BookData {
  id: number;
  Titel?: string;
  Auteur?: string;
}

interface ChapterData {
  id: number;
  Titel?: string;
  Hoofdstuknummer?: string;
  Boek_id: number;
}

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        if (!id) return;

        // Fetch book details
        const { data: bookData, error: bookError } = await supabase
          .from('Boeken')
          .select('*')
          .eq('id', parseInt(id)) // Convert string to number
          .maybeSingle();

        if (bookError) throw bookError;
        if (!bookData) {
          toast.error('Boek niet gevonden');
          navigate('/books');
          return;
        }

        setBook(bookData);

        // Fetch chapters for this book
        const { data: chapterData, error: chapterError } = await supabase
          .from('Chapters')
          .select('*')
          .eq('Boek_id', parseInt(id)) // Convert string to number
          .order('Hoofdstuknummer', { ascending: true });

        if (chapterError) throw chapterError;
        setChapters(chapterData || []);
      } catch (error) {
        console.error('Error fetching book details:', error);
        toast.error('Er is een fout opgetreden bij het ophalen van de boekgegevens');
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [id, navigate]);

  const handleStartQuiz = (chapterId?: number) => {
    setSelectedChapterId(chapterId?.toString());
    setQuizOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto flex flex-col space-y-8 animate-pulse">
          <div className="h-8 w-40 bg-gray-200 rounded"></div>
          <div className="h-12 w-3/4 bg-gray-200 rounded mb-4"></div>
          <div className="h-6 w-1/2 bg-gray-200 rounded mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-60 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/books" className="inline-flex items-center text-study-600 hover:text-study-700 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar boeken
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="heading-xl text-foreground mb-4">{book?.Titel || 'Boek details'}</h1>
          <p className="subheading max-w-3xl">
            {book?.Auteur && `Door ${book.Auteur}`}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Book Cover */}
          <div className="md:col-span-1">
            <div className="aspect-[3/4] bg-study-50 rounded-lg shadow-md flex items-center justify-center overflow-hidden border border-study-100">
              <BookOpen className="h-24 w-24 text-study-300" />
            </div>
          </div>

          {/* Book Info */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Over dit boek</h2>
              <p className="text-muted-foreground mb-4">
                Dit is een samenvatting van het boek "{book?.Titel}". Gebruik deze samenvatting om te studeren en je kennis te testen.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={() => handleStartQuiz()} className="flex-1">
                <Brain className="mr-2 h-5 w-5" />
                Start quiz over hele boek
              </Button>
              <Button size="lg" variant="outline" onClick={() => toast.info('Functionaliteit wordt binnenkort toegevoegd')} className="flex-1">
                <FileText className="mr-2 h-5 w-5" />
                Bekijk samenvatting
              </Button>
            </div>
          </div>
        </div>

        {/* Chapters Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Hoofdstukken</h2>
          
          {chapters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chapters.map((chapter) => (
                <Card key={chapter.id} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl">{chapter.Hoofdstuknummer}. {chapter.Titel}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Leer over de belangrijkste concepten in dit hoofdstuk en test je kennis.
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={() => handleStartQuiz(chapter.id)} 
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Brain className="mr-2 h-4 w-4" />
                      Start quiz
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full sm:w-auto justify-between"
                      onClick={() => toast.info('Hoofdstuk inhoud wordt binnenkort toegevoegd')}
                    >
                      Bekijk hoofdstuk
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">Nog geen hoofdstukken beschikbaar voor dit boek.</p>
            </div>
          )}
        </div>

        {/* Coming Soon Section */}
        <div className="bg-study-50 rounded-lg p-6 border border-study-100">
          <h3 className="text-xl font-medium mb-2">Binnenkort beschikbaar</h3>
          <p className="text-muted-foreground mb-4">
            We werken aan nieuwe functionaliteiten om je leerervaring te verbeteren, waaronder interactieve quizzen, voortgangsregistratie en meer.
          </p>
          <Button variant="outline" onClick={() => toast.info('Hou deze pagina in de gaten voor updates!')}>
            Meer informatie
          </Button>
        </div>
      </div>

      {/* Quiz Dialog */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedChapterId 
                ? `Quiz over hoofdstuk ${chapters.find(c => c.id.toString() === selectedChapterId)?.Hoofdstuknummer || ''}`
                : `Quiz over ${book?.Titel}`}
            </DialogTitle>
          </DialogHeader>
          {quizOpen && (
            <Quiz 
              bookId={id || ''} 
              chapterId={selectedChapterId} 
              onClose={() => setQuizOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookDetail;
