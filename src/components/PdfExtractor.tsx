
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, BookOpen, FileText, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PdfExtractor = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    chaptersCount?: number;
    error?: string;
  } | null>(null);

  const handleExtractPdf = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      
      // Call the edge function to extract and process the PDF
      const { data, error } = await supabase.functions.invoke('extract-pdf-content', {
        body: { 
          pdfPath: 'samenvattingen/Stuvia-1739284-samenvatting-basisboek-sales.pdf'
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setResult(data);
      
      if (data.success) {
        toast.success('PDF content extracted and saved successfully!');
      } else {
        toast.error('Error extracting PDF content');
      }
      
    } catch (error) {
      console.error('Error in PDF extraction:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
      toast.error('Failed to extract PDF content');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          PDF Content Extractor
        </CardTitle>
        <CardDescription>
          Extract content from the Basisboek Sales PDF and save it to the books database
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center p-3 bg-muted/50 rounded-md">
            <BookOpen className="h-5 w-5 text-primary mr-2" />
            <div>
              <p className="text-sm font-medium">Stuvia-1739284-samenvatting-basisboek-sales.pdf</p>
              <p className="text-xs text-muted-foreground">Will extract content and insert into 'books' table</p>
            </div>
          </div>
          
          {result && (
            <div className={`p-4 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              {result.success ? (
                <div className="text-green-700">
                  <p className="font-medium">{result.message}</p>
                  {result.chaptersCount && (
                    <p className="text-sm mt-1">Found {result.chaptersCount} chapters</p>
                  )}
                </div>
              ) : (
                <div className="flex text-red-700">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <p>{result.error || 'Failed to extract content'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleExtractPdf} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting content...
            </>
          ) : (
            'Extract and Save PDF Content'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PdfExtractor;
