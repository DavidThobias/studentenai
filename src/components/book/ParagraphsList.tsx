
import { ListChecks, FileText, Loader2, DatabaseIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  selectedChapterId?: number | null;
}

const ParagraphsList = ({ paragraphs, loadingParagraphs, onStartQuiz, selectedChapterId }: ParagraphsListProps) => {
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
                <CardTitle className="text-lg">
                  Paragraaf {paragraph["paragraaf nummer"] || "ID: " + paragraph.id}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {paragraph.content ? 
                    paragraph.content : 
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
        <div className="space-y-4">
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Geen paragrafen gevonden voor dit hoofdstuk. 
              Het kan zijn dat er nog geen paragrafen zijn toegevoegd.
            </p>
          </div>
          
          <Alert className="bg-blue-50 border-blue-200">
            <DatabaseIcon className="h-4 w-4" />
            <AlertDescription className="ml-2">
              Debug informatie:
              <ul className="list-disc pl-5 mt-2">
                <li>Geselecteerde hoofdstuk ID: {selectedChapterId}</li>
                <li>Huidige URL pad: {window.location.pathname}</li>
                <li>Paragrafen in array: {paragraphs.length}</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default ParagraphsList;
