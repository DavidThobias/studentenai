
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTextEnhancer } from '@/hooks/useTextEnhancer';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Book, ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import Layout from '@/components/Layout';
import ReactMarkdown from 'react-markdown';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SummaryPage = () => {
  const { id: bookId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterId = searchParams.get('chapter');
  const paragraphId = searchParams.get('paragraph');
  const navigate = useNavigate();
  
  const { 
    enhancedContent, 
    isLoading, 
    error, 
    enhanceText, 
    getNextParagraphId, 
    getPreviousParagraphId,
    getCurrentParagraphNumber
  } = useTextEnhancer();
  
  const [scrollProgress, setScrollProgress] = useState(0);
  
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
  
  const handleNextParagraph = () => {
    const nextId = getNextParagraphId();
    if (nextId && chapterId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('paragraph', nextId.toString());
      setSearchParams(newParams);
    }
  };
  
  const handlePreviousParagraph = () => {
    const prevId = getPreviousParagraphId();
    if (prevId && chapterId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('paragraph', prevId.toString());
      setSearchParams(newParams);
    }
  };
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(progress);
  };

  const paragraphNumber = getCurrentParagraphNumber();

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Top navigation */}
          <div className="mb-6">
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/books">Boeken</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/books/${bookId}`}>Boek</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{enhancedContent?.chapterTitle || "Hoofdstuk"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handleBack}
              >
                <ChevronLeft className="h-4 w-4" /> 
                Terug naar boek
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Ververs
                </Button>
                
                {paragraphId && (
                  <Button 
                    variant="ghost" 
                    onClick={handlePreviousParagraph}
                    disabled={!getPreviousParagraphId() || isLoading}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Vorige paragraaf
                  </Button>
                )}
                
                {paragraphId && (
                  <Button 
                    variant="ghost"
                    onClick={handleNextParagraph}
                    disabled={!getNextParagraphId() || isLoading}
                    className="flex items-center gap-2"
                  >
                    Volgende paragraaf
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-1 bg-gray-100 mb-6 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
          
          {/* Title and metadata */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {isLoading ? (
                  <Skeleton className="h-9 w-3/4" />
                ) : (
                  enhancedContent?.bookTitle || "Boek"
                )}
              </h1>
              
              {paragraphNumber && (
                <Badge variant="outline" className="text-sm">
                  Paragraaf {paragraphNumber}
                </Badge>
              )}
            </div>
            
            <h2 className="text-xl text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-6 w-1/2" />
              ) : (
                enhancedContent?.chapterTitle || "Hoofdstuk"
              )}
            </h2>
          </div>
          
          {/* Error alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Fout</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <ScrollArea 
                className="h-[calc(100vh-320px)] pr-4" 
                onScrollCapture={handleScroll}
              >
                <div className="prose prose-blue max-w-none">
                  <ReactMarkdown>
                    {enhancedContent?.enhancedContent || ""}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            )}
          </div>
          
          {/* Bottom navigation for mobile */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-3 flex justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handlePreviousParagraph}
              disabled={!getPreviousParagraphId() || isLoading}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBack}
            >
              <Book className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNextParagraph}
              disabled={!getNextParagraphId() || isLoading}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SummaryPage;
