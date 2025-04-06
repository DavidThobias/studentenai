
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Award, List, CheckCircle, ExternalLink } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useBookDetail } from '@/hooks/useBookDetail';
import { toast } from "sonner";

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chapters");

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

  // Determine if this is the online marketing book (for special handling)
  const isOnlineMarketingBook = book?.book_title?.toLowerCase().includes('online marketing');

  // Handle chapter click to load its paragraphs
  const handleChapterClick = (chapterId: number) => {
    fetchParagraphs(chapterId);
  };

  // Navigate to structured learning
  const handleGoToStructuredLearning = () => {
    navigate(`/books/${id}/structured-learning`);
  };

  // Navigate to chapter quiz
  const handleGoToChapterQuiz = (chapterId: number) => {
    if (isOnlineMarketingBook) {
      navigate(`/books/${id}/quiz?chapterId=${chapterId}&isOnlineMarketing=true`);
    } else {
      // For normal books, we go to the regular quiz page with chapter selection
      navigate(`/quiz?bookId=${id}&chapterId=${chapterId}`);
    }
  };

  // Navigate to summary
  const handleGoToSummary = (chapterId: number) => {
    navigate(`/books/${id}/summary?chapterId=${chapterId}`);
  };

  // If loading, show loading indicator
  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  // If error or no book found, show error message
  if (error || !book) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Fout!</strong>
            <span className="block sm:inline"> {error || 'Boek niet gevonden.'}</span>
          </div>
          <Button className="mt-4" onClick={() => navigate('/books')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar boeken
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb navigation */}
        <div className="mb-8">
          <Link to="/books" className="inline-flex items-center text-study-600 hover:text-study-700 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar boeken
          </Link>
        </div>

        {/* Book information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 mb-10"
        >
          <div className="aspect-[3/4] bg-study-50 flex items-center justify-center relative overflow-hidden rounded-lg border border-gray-100">
            {book.book_title?.toLowerCase().includes('sales') ? (
              <img 
                src="https://ncipejuazrewiizxtkcj.supabase.co/storage/v1/object/public/afbeeldingen//shopping.webp" 
                alt={`${book.book_title} cover`} 
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="h-24 w-24 text-study-200" />
            )}
          </div>
          
          <div>
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-foreground mb-1">{book.book_title}</h1>
              <p className="text-muted-foreground">{book.author_name || 'Onbekende auteur'}</p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-study-50 text-study-600">
                {book.book_title?.toLowerCase().includes('sales') ? 'Verkoop' : 'Online marketing'}
              </Badge>
            </div>

            <div className="space-y-4 mb-8">
              <p>
                {book.book_title?.toLowerCase().includes('sales') 
                  ? 'Een praktische gids over verkooptechnieken en het opbouwen van sterke klantrelaties.'
                  : 'Een complete handleiding over online marketing strategieën, SEO, en digitale advertenties.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                className="bg-study-600 hover:bg-study-700" 
                onClick={handleGoToStructuredLearning}
              >
                <List className="mr-2 h-4 w-4" />
                Gestructureerd leren
              </Button>
              
              {isOnlineMarketingBook && chapters.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={() => handleGoToChapterQuiz(chapters[0].id)}
                >
                  <Award className="mr-2 h-4 w-4" />
                  Start Quiz
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <Separator className="my-8" />

        {/* Tabs for chapters/paragraphs navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="chapters">Hoofdstukken</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzen</TabsTrigger>
          </TabsList>

          <TabsContent value="chapters">
            <div className="grid grid-cols-1 gap-4">
              <Accordion type="single" collapsible className="w-full">
                {chapters.map((chapter) => (
                  <AccordionItem key={chapter.id} value={`chapter-${chapter.id}`}>
                    <AccordionTrigger onClick={() => handleChapterClick(chapter.id)} className="px-4 py-3 hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Hoofdstuk {chapter.chapter_number}</span>
                        <span className="text-muted-foreground">{chapter.chapter_title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3 pt-1">
                      {loadingParagraphs && selectedChapterId === chapter.id ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <>
                          {isOnlineMarketingBook ? (
                            // For Online Marketing book, just show chapter info
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">
                                Dit hoofdstuk bevat informatie over {chapter.chapter_title}.
                              </p>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleGoToChapterQuiz(chapter.id)}
                                >
                                  <Award className="mr-2 h-3.5 w-3.5" />
                                  Quiz maken
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleGoToSummary(chapter.id)}
                                >
                                  <BookOpen className="mr-2 h-3.5 w-3.5" />
                                  Samenvatting
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // For regular books, show paragraphs
                            <div className="space-y-3">
                              {paragraphs.length > 0 && selectedChapterId === chapter.id ? (
                                paragraphs.map((paragraph) => (
                                  <div key={paragraph.id} className="border rounded-lg p-3 hover:bg-muted/20">
                                    <p className="font-medium mb-2">Paragraaf {paragraph.paragraph_number}</p>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {paragraph.content?.substring(0, 100)}
                                      {paragraph.content && paragraph.content.length > 100 ? '...' : ''}
                                    </p>
                                    <div className="flex gap-2">
                                      <Link to={`/quiz?bookId=${id}&chapterId=${chapter.id}&paragraphId=${paragraph.id}&structured=true`}>
                                        <Button size="sm" variant="outline">
                                          <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                          Leren & quiz maken
                                        </Button>
                                      </Link>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground py-2">
                                  {paragraphs.length === 0 && selectedChapterId === chapter.id
                                    ? 'Geen paragrafen gevonden voor dit hoofdstuk.'
                                    : 'Klik om paragrafen te laden.'}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </TabsContent>
          
          <TabsContent value="quizzes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isOnlineMarketingBook ? (
                // Special quiz layout for Online Marketing book
                <Card>
                  <CardHeader>
                    <CardTitle>Quiz per hoofdstuk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Genereer een quiz over een specifiek hoofdstuk uit het boek.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <div className="grid grid-cols-1 gap-2 w-full">
                      {chapters.map((chapter) => (
                        <Button 
                          key={chapter.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleGoToChapterQuiz(chapter.id)}
                        >
                          <Award className="mr-2 h-4 w-4 text-study-600" />
                          Hoofdstuk {chapter.chapter_number}: {chapter.chapter_title}
                        </Button>
                      ))}
                    </div>
                  </CardFooter>
                </Card>
              ) : (
                // Standard quiz options for regular books
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Gestructureerd leren</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Volg een gestructureerd leerpad door het boek, met voortgangsregistratie en quizzen per paragraaf.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button onClick={handleGoToStructuredLearning} className="w-full bg-study-600 hover:bg-study-700">
                        <List className="mr-2 h-4 w-4" />
                        Start gestructureerd leren
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quiz generator</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Genereer een quiz over het hele boek of een specifiek hoofdstuk.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={() => navigate(`/quiz?bookId=${id}`)}
                        className="w-full"
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Start quiz generator
                      </Button>
                    </CardFooter>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BookDetail;
