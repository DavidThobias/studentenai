
import { ListChecks, FileText, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ParagraphData {
  id: number;
  "paragraaf nummer"?: number;
  content?: string;
  chapter_id: number;
}

interface ParagraphsListProps {
  paragraphs: ParagraphData[];
  loadingParagraphs: boolean;
  onStartQuiz?: (chapterId?: number, paragraphId?: number) => void;
}

const ParagraphsList = ({ paragraphs, loadingParagraphs, onStartQuiz }: ParagraphsListProps) => {
  return (
    <div className="mb-12">
      <h2 className="text-2xl font-semibold mb-6">Paragrafen</h2>
      
      {loadingParagraphs ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Paragrafen laden...</p>
        </div>
      ) : paragraphs.length > 0 ? (
        <div className="space-y-4">
          {paragraphs.map((paragraph) => (
            <Card key={paragraph.id} className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Paragraaf {paragraph["paragraaf nummer"]}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-3">
                  {paragraph.content ? 
                    (paragraph.content.length > 150 ? 
                      `${paragraph.content.substring(0, 150)}...` : 
                      paragraph.content) : 
                    'Geen inhoud beschikbaar'}
                </p>
              </CardContent>
              <CardFooter className="flex flex-row gap-2">
                {onStartQuiz && (
                  <Button 
                    onClick={() => onStartQuiz(paragraph.chapter_id, paragraph.id)}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <ListChecks className="mr-2 h-4 w-4" />
                    Quiz over paragraaf
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-muted-foreground">Selecteer een hoofdstuk om paragrafen te bekijken.</p>
        </div>
      )}
    </div>
  );
};

export default ParagraphsList;
