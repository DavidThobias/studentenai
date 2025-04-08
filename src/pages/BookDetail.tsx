
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Award, CheckCircle } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useBookDetail } from '@/hooks/useBookDetail';
import { toast } from "sonner";

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  // Handle chapter click to load its paragraphs
  const handleChapterClick = (chapterId: number) => {
    fetchParagraphs(chapterId, book?.book_title);
  };

  // Navigate to chapter quiz
  const handleGoToChapterQuiz = (chapterId: number) => {
    navigate(`/books/${id}/quiz?chapterId=${chapterId}&isOnlineMarketing=true`);
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
            <img 
              src="https://ncipejuazrewiizxtkcj.supabase.co/storage/v1/object/public/afbeeldingen//shopping.webp" 
              alt={`${book.book_title} cover`} 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div>
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-foreground mb-1">{book.book_title}</h1>
              <p className="text-muted-foreground">{book.author_name || 'Onbekende auteur'}</p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-study-50 text-study-600">
                Online marketing
              </Badge>
            </div>

            <div className="space-y-4 mb-8">
              <p>
                Een complete handleiding over online marketing strategieën, SEO, en digitale advertenties.
              </p>
            </div>
          </div>
        </motion.div>

        <Separator className="my-8" />

        {/* Chapters section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-6">Hoofdstukken</h2>
          
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
                      <div className="space-y-3">
                        <div className="border rounded-lg p-4 bg-muted/10">
                          <h3 className="font-medium mb-2">Hoofdstukinhoud</h3>
                          <div className="max-h-[300px] overflow-y-auto text-sm text-muted-foreground">
                            {paragraphs.length > 0 && selectedChapterId === chapter.id ? (
                              <div className="prose prose-sm max-w-none">
                                {paragraphs.map((para, idx) => (
                                  <div key={para.id} className="mb-4">
                                    {para.content && <p>{para.content}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p>Klik op het hoofdstuk om de inhoud te laden.</p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button 
                            onClick={() => handleGoToChapterQuiz(chapter.id)}
                          >
                            <Award className="mr-2 h-4 w-4" />
                            Start Quiz
                          </Button>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
