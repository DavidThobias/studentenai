
import { ChevronRight, Brain, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ChapterData {
  id: number;
  Titel?: string;
  Hoofdstuknummer?: string;
  Boek_id: number;
}

interface ChaptersListProps {
  chapters: ChapterData[];
  onChapterSelect: (chapterId: number) => void;
  onStartQuiz?: (chapterId?: number, paragraphId?: number) => void;
}

const ChaptersList = ({ chapters, onStartQuiz, onChapterSelect }: ChaptersListProps) => {
  return (
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
                {onStartQuiz && (
                  <Button 
                    onClick={() => onStartQuiz(chapter.id)} 
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    Start quiz
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full sm:w-auto justify-between"
                  onClick={() => onChapterSelect(chapter.id)}
                >
                  Bekijk paragrafen
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
  );
};

export default ChaptersList;
