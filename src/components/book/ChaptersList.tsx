
import { BookOpen, Brain, FileText, BookText, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';

interface ChapterData {
  id: number;
  chapter_title?: string;
  chapter_number: number;
  book_id: number;
}

interface ChaptersListProps {
  chapters: ChapterData[];
  onChapterSelect: (chapterId: number) => void;
  onStartQuiz?: (chapterId: number) => void;
  selectedChapterId?: number | null;
}

const ChaptersList = ({ chapters, onStartQuiz, onChapterSelect, selectedChapterId }: ChaptersListProps) => {
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
                      <p className="text-muted-foreground">
                        Leer over de belangrijkste concepten in dit hoofdstuk en test je kennis.
                      </p>
                    </CardContent>
                    
                    <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
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
