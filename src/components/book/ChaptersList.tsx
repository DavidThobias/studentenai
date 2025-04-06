
import { BookOpen, Brain, FileText, BookText, ChevronRight, ArrowRight, Target } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ChapterData {
  id: number;
  chapter_title?: string;
  chapter_number: number;
  book_id: number;
  objectives?: string;
}

interface ChaptersListProps {
  chapters: ChapterData[];
  onChapterSelect: (chapterId: number) => void;
  onStartQuiz?: (chapterId: number) => void;
  selectedChapterId?: number | null;
}

const ChaptersList = ({ chapters, onStartQuiz, onChapterSelect, selectedChapterId }: ChaptersListProps) => {
  const navigate = useNavigate();
  const { id: bookId } = useParams<{ id: string }>();
  const [expandedChapterIds, setExpandedChapterIds] = useState<number[]>([]);
  
  // Animation variants for staggered children
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };
  
  const handleViewSummary = (chapterId: number) => {
    if (bookId) {
      const params = new URLSearchParams();
      params.append('chapter', chapterId.toString());
      
      navigate(`/books/${bookId}/summary?${params.toString()}`);
    }
  };

  const toggleObjectives = (chapterId: number) => {
    setExpandedChapterIds(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId) 
        : [...prev, chapterId]
    );
  };

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-semibold mb-8">Hoofdstukken</h2>
      
      {chapters.length > 0 ? (
        <motion.div 
          className="grid grid-cols-1 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {chapters.map((chapter) => (
            <motion.div key={chapter.id} variants={item}>
              <Card 
                className={`transition-all hover:shadow-md overflow-hidden ${
                  selectedChapterId === chapter.id 
                    ? 'border-study-500 ring-1 ring-study-500 shadow-md' 
                    : 'hover:border-study-200'
                }`}
              >
                <div className="grid md:grid-cols-4 items-stretch">
                  <div className={`hidden md:flex items-center justify-center ${
                    selectedChapterId === chapter.id ? 'bg-study-500 text-white' : 'bg-study-50'
                  }`}>
                    <div className="p-6 flex flex-col items-center justify-center">
                      <BookText className="h-10 w-10 mb-2" />
                      <span className="text-xl font-bold">{chapter.chapter_number}</span>
                    </div>
                  </div>
                  
                  <div className="md:col-span-3">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">
                          <span className="md:hidden mr-2">
                            Hoofdstuk {chapter.chapter_number}:
                          </span> 
                          {chapter.chapter_title || `Hoofdstuk ${chapter.chapter_number}`}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Leer over de belangrijkste concepten in dit hoofdstuk en test je kennis.
                      </p>
                      
                      {chapter.objectives && (
                        <Collapsible 
                          open={expandedChapterIds.includes(chapter.id)} 
                          onOpenChange={() => toggleObjectives(chapter.id)}
                          className="border rounded-md p-2 bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Target className="h-4 w-4 text-study-500" />
                              <span className="font-medium text-sm">Leerdoelen</span>
                            </div>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-1 h-auto">
                                <ChevronRight className={`h-4 w-4 transition-transform ${
                                  expandedChapterIds.includes(chapter.id) ? 'rotate-90' : ''
                                }`} />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent className="pt-2">
                            <div className="text-sm whitespace-pre-line pl-6">
                              {chapter.objectives}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </CardContent>
                    
                    <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto flex items-center gap-2"
                        onClick={() => handleViewSummary(chapter.id)}
                      >
                        <FileText className="h-4 w-4" />
                        Bekijk samenvatting
                      </Button>
                    
                      {onStartQuiz && (
                        <Button 
                          onClick={() => onStartQuiz(chapter.id)} 
                          className="w-full sm:w-auto bg-study-600 hover:bg-study-700 text-white"
                        >
                          <Brain className="mr-2 h-4 w-4" />
                          Start quiz
                        </Button>
                      )}
                      
                      <Button 
                        variant={selectedChapterId === chapter.id ? "secondary" : "outline"}
                        className="w-full sm:w-auto justify-between"
                        onClick={() => onChapterSelect(chapter.id)}
                      >
                        {selectedChapterId === chapter.id ? 'Geselecteerd' : 'Bekijk details'}
                        {selectedChapterId === chapter.id ? (
                          <ChevronRight className="h-4 w-4 ml-2" />
                        ) : (
                          <ArrowRight className="h-4 w-4 ml-2" />
                        )}
                      </Button>
                    </CardFooter>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-muted-foreground">Nog geen hoofdstukken beschikbaar voor dit boek.</p>
        </div>
      )}
    </div>
  );
};

export default ChaptersList;
