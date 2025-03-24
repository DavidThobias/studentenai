
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTextEnhancer } from '@/hooks/useTextEnhancer';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Book, Brain, RefreshCw } from "lucide-react";
import Layout from '@/components/Layout';
import ReactMarkdown from 'react-markdown';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SummaryPage = () => {
  const { id: bookId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const chapterId = searchParams.get('chapter');
  const paragraphId = searchParams.get('paragraph');
  const navigate = useNavigate();
  
  const { enhancedContent, isLoading, error, enhanceText } = useTextEnhancer();
  const [activeTab, setActiveTab] = useState<string>("enhanced");
  
  useEffect(() => {
    if (chapterId) {
      const fetchEnhancedContent = async () => {
        await enhanceText(
          Number(chapterId),
          paragraphId ? Number(paragraphId) : undefined
        );
      };
      
      fetchEnhancedContent();
    }
  }, [chapterId, paragraphId]);
  
  const handleBack = () => {
    navigate(`/books/${bookId}`);
  };
  
  const handleRefresh = async () => {
    if (chapterId) {
      await enhanceText(
        Number(chapterId),
        paragraphId ? Number(paragraphId) : undefined
      );
    }
  };

  return (
    <Layout>
      <div className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleBack}
            >
              <ChevronLeft className="h-4 w-4" /> 
              Terug naar boek
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Ververs
            </Button>
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {isLoading ? (
                <Skeleton className="h-9 w-3/4" />
              ) : (
                enhancedContent?.bookTitle || "Boek"
              )}
            </h1>
            <h2 className="text-xl text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-6 w-1/2" />
              ) : (
                <>
                  {enhancedContent?.chapterTitle || "Hoofdstuk"} 
                  {paragraphId && " - Paragraaf " + paragraphId}
                </>
              )}
            </h2>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Fout</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs 
            defaultValue="enhanced" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="enhanced" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Verbeterde leesbaarheid
              </TabsTrigger>
              <TabsTrigger value="original" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                Originele tekst
              </TabsTrigger>
            </TabsList>
            
            <Separator className="mb-6" />
            
            <TabsContent value="enhanced" className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <div className="prose prose-study max-w-none">
                  <ReactMarkdown>
                    {enhancedContent?.enhancedContent || ""}
                  </ReactMarkdown>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="original" className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <div className="whitespace-pre-line">
                  {enhancedContent?.originalContent || ""}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default SummaryPage;
