
import { ListChecks, FileText, Loader2, DatabaseIcon, RefreshCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

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
  const [directDbCount, setDirectDbCount] = useState<number | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  
  // Log whenever paragraphs or loading state changes
  useEffect(() => {
    console.log('ParagraphsList: paragraphs array updated:', paragraphs);
    console.log('ParagraphsList: loadingParagraphs:', loadingParagraphs);
  }, [paragraphs, loadingParagraphs]);

  const checkDatabaseDirectly = async () => {
    if (!selectedChapterId) return;
    
    try {
      setIsCheckingDb(true);
      console.log('Checking database directly for paragraphs with chapter_id =', selectedChapterId);
      
      // Get total count first
      const { count: totalCount } = await supabase
        .from('Paragrafen')
        .select('*', { count: 'exact', head: true });
        
      console.log('Total paragraphs in database:', totalCount);
      
      // Try direct SQL query as a more reliable method
      const { data, error, status, statusText } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', selectedChapterId);
        
      console.log('Direct database check results:', {
        data,
        error,
        status,
        statusText,
        count: data?.length || 0
      });
      
      if (data) {
        setDirectDbCount(data.length);
      }
    } catch (err) {
      console.error('Error checking database directly:', err);
    } finally {
      setIsCheckingDb(false);
    }
  };

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
                <p className="text-muted-foreground whitespace-pre-line">
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
                <li>Tabel naam: Paragrafen (correct)</li>
                <li>Query: SELECT * FROM "Paragrafen" WHERE chapter_id = {selectedChapterId}</li>
                <li>Type van selectedChapterId: {typeof selectedChapterId}</li>
                <li>Timestamp: {new Date().toISOString()}</li>
                <li>Direct DB check result: {directDbCount !== null ? `${directDbCount} paragrafen gevonden` : 'Niet gecontroleerd'}</li>
              </ul>
              
              <div className="mt-3">
                <Button 
                  onClick={checkDatabaseDirectly} 
                  variant="outline" 
                  size="sm"
                  disabled={isCheckingDb || !selectedChapterId}
                >
                  <RefreshCcw className={`mr-2 h-4 w-4 ${isCheckingDb ? 'animate-spin' : ''}`} />
                  {isCheckingDb ? 'Database controleren...' : 'Database direct controleren'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default ParagraphsList;
