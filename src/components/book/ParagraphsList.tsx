
import { ListChecks, FileText, Loader2, DatabaseIcon, RefreshCcw, AlertTriangle } from 'lucide-react';
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
  const [edgeFunctionResult, setEdgeFunctionResult] = useState<any>(null);
  const [isTestingEdgeFunction, setIsTestingEdgeFunction] = useState(false);
  
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
      
      // Try multiple approaches
      // 1. Standard query with number
      const { data: numberData, error: numberError } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', selectedChapterId);
      
      // 2. With string conversion
      const { data: stringData, error: stringError } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', String(selectedChapterId));
      
      // 3. Get a few samples to inspect
      const { data: sampleData } = await supabase
        .from('Paragrafen')
        .select('*')
        .limit(5);
      
      console.log('Direct database check results:', {
        numberQuery: {
          data: numberData,
          error: numberError,
          count: numberData?.length || 0
        },
        stringQuery: {
          data: stringData,
          error: stringError,
          count: stringData?.length || 0
        },
        sampleData
      });
      
      // Set the most successful result
      if (numberData && numberData.length > 0) {
        setDirectDbCount(numberData.length);
      } else if (stringData && stringData.length > 0) {
        setDirectDbCount(stringData.length);
      } else {
        setDirectDbCount(0);
      }
    } catch (err) {
      console.error('Error checking database directly:', err);
      setDirectDbCount(null);
    } finally {
      setIsCheckingDb(false);
    }
  };
  
  const testEdgeFunction = async () => {
    if (!selectedChapterId) return;
    
    try {
      setIsTestingEdgeFunction(true);
      console.log('Testing edge function with chapter_id =', selectedChapterId);
      
      // Get current auth session to add token if available
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';
      
      console.log('Access token available for edge function test:', !!accessToken);
      
      // Test the edge function directly
      const response = await fetch('https://ncipejuazrewiizxtkcj.supabase.co/functions/v1/get-paragraphs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Only include Authorization header if we have a token
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        // Force to number to ensure consistency
        body: JSON.stringify({ chapterId: Number(selectedChapterId) }),
      });
      
      console.log('Edge function response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Edge function response:', result);
        setEdgeFunctionResult(result);
      } else {
        const errorText = await response.text();
        console.error('Edge function error:', response.status, errorText);
        setEdgeFunctionResult({
          success: false,
          error: `Status ${response.status}: ${errorText || 'Unknown error'}`,
          status: response.status
        });
      }
    } catch (err) {
      console.error('Error testing edge function:', err);
      setEdgeFunctionResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsTestingEdgeFunction(false);
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
          
          <Alert className="bg-blue-50 border-blue-200 mb-3">
            <DatabaseIcon className="h-4 w-4" />
            <AlertDescription className="ml-2">
              Debug informatie:
              <ul className="list-disc pl-5 mt-2">
                <li>Geselecteerde hoofdstuk ID: {selectedChapterId} (type: {typeof selectedChapterId})</li>
                <li>Huidige URL pad: {window.location.pathname}</li>
                <li>Paragrafen in array: {paragraphs.length}</li>
                <li>Tabel naam: Paragrafen (correct)</li>
                <li>Query: SELECT * FROM "Paragrafen" WHERE chapter_id = {selectedChapterId}</li>
                <li>Timestamp: {new Date().toISOString()}</li>
                <li>Direct DB check result: {directDbCount !== null ? `${directDbCount} paragrafen gevonden` : 'Niet gecontroleerd'}</li>
              </ul>
              
              <div className="mt-3 flex flex-wrap gap-2">
                <Button 
                  onClick={checkDatabaseDirectly} 
                  variant="outline" 
                  size="sm"
                  disabled={isCheckingDb || !selectedChapterId}
                >
                  <RefreshCcw className={`mr-2 h-4 w-4 ${isCheckingDb ? 'animate-spin' : ''}`} />
                  {isCheckingDb ? 'Database controleren...' : 'Database direct controleren'}
                </Button>
                
                <Button 
                  onClick={testEdgeFunction} 
                  variant="outline" 
                  size="sm"
                  disabled={isTestingEdgeFunction || !selectedChapterId}
                >
                  <RefreshCcw className={`mr-2 h-4 w-4 ${isTestingEdgeFunction ? 'animate-spin' : ''}`} />
                  {isTestingEdgeFunction ? 'Edge Function testen...' : 'Edge Function testen'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          {edgeFunctionResult && (
            <Alert className={edgeFunctionResult.success ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
              {edgeFunctionResult.success ? (
                <DatabaseIcon className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <AlertDescription className="ml-2">
                <p className="font-medium">Edge Function Test Resultaat:</p>
                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(edgeFunctionResult, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

export default ParagraphsList;
