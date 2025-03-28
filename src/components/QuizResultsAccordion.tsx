
import { useState, useEffect } from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/context/AuthContext';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

interface QuizResult {
  id: string;
  created_at: string;
  book_id: number;
  chapter_id: number | null;
  paragraph_id: number | null;
  score: number;
  total_questions: number;
  percentage: number;
}

interface ChapterResults {
  [chapterId: string]: {
    chapterId: number;
    paragraphs: {
      [paragraphId: string]: {
        paragraphId: number;
        results: QuizResult[];
        latestResult: QuizResult;
      }
    }
  }
}

const QuizResultsAccordion = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [chapterResults, setChapterResults] = useState<ChapterResults>({});
  const [openItems, setOpenItems] = useState<string[]>([]);
  
  useEffect(() => {
    if (user) {
      fetchQuizResults();
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  const formatChapterParagraph = (chapterId: number | null, paragraphId: number | null) => {
    if (chapterId && paragraphId) {
      return `${chapterId}.${paragraphId}`;
    }
    
    if (chapterId) {
      return `Hoofdstuk ${chapterId}`;
    }
    
    if (paragraphId) {
      return `Paragraaf ${paragraphId}`;
    }
    
    return 'Onbekend';
  };
  
  const fetchQuizResults = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // Process quiz results by chapter and paragraph
      const processedResults: ChapterResults = {};
      
      data.forEach((result: QuizResult) => {
        if (result.chapter_id) {
          const chapterKey = `chapter-${result.chapter_id}`;
          
          // Initialize chapter if it doesn't exist
          if (!processedResults[chapterKey]) {
            processedResults[chapterKey] = {
              chapterId: result.chapter_id,
              paragraphs: {}
            };
          }
          
          // Handle paragraph results
          if (result.paragraph_id) {
            const paragraphKey = `paragraph-${result.paragraph_id}`;
            
            if (!processedResults[chapterKey].paragraphs[paragraphKey]) {
              processedResults[chapterKey].paragraphs[paragraphKey] = {
                paragraphId: result.paragraph_id,
                results: [result],
                latestResult: result
              };
            } else {
              processedResults[chapterKey].paragraphs[paragraphKey].results.push(result);
              
              // We already sorted results by created_at desc, so the first one is the latest
              if (!processedResults[chapterKey].paragraphs[paragraphKey].latestResult) {
                processedResults[chapterKey].paragraphs[paragraphKey].latestResult = result;
              }
            }
          }
        }
      });
      
      setChapterResults(processedResults);
      
      // Open the first chapter by default if there are results
      const chapters = Object.keys(processedResults);
      if (chapters.length > 0) {
        setOpenItems([chapters[0]]);
      }
      
    } catch (error) {
      console.error('Error fetching quiz results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
        <span className="ml-2">Quiz resultaten laden...</span>
      </div>
    );
  }
  
  if (Object.keys(chapterResults).length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">Je hebt nog geen quiz resultaten</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <Accordion 
        type="multiple" 
        value={openItems} 
        onValueChange={setOpenItems}
        className="w-full"
      >
        {Object.entries(chapterResults).map(([chapterKey, chapterData]) => {
          // Calculate chapter overall percentage
          let chapterTotalScore = 0;
          let chapterTotalQuestions = 0;
          
          Object.values(chapterData.paragraphs).forEach(paragraph => {
            if (paragraph.latestResult) {
              chapterTotalScore += paragraph.latestResult.score;
              chapterTotalQuestions += paragraph.latestResult.total_questions;
            }
          });
          
          const chapterPercentage = chapterTotalQuestions > 0 
            ? Math.round((chapterTotalScore / chapterTotalQuestions) * 100) 
            : 0;
            
          return (
            <AccordionItem key={chapterKey} value={chapterKey}>
              <AccordionTrigger className="hover:bg-gray-50 px-4 py-2 rounded-lg">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <BookOpen className="mr-2 h-4 w-4 text-primary" />
                    <span>Hoofdstuk {chapterData.chapterId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {chapterPercentage}%
                    </span>
                    <Progress 
                      value={chapterPercentage} 
                      className="w-16 h-2"
                    />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2 pb-4">
                <div className="space-y-3">
                  {Object.entries(chapterData.paragraphs).map(([paragraphKey, paragraphData]) => {
                    const { latestResult } = paragraphData;
                    
                    return (
                      <Collapsible key={paragraphKey} className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50">
                          <div className="flex items-center">
                            <span className="font-medium">
                              {formatChapterParagraph(chapterData.chapterId, paragraphData.paragraphId)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              {latestResult.percentage}%
                            </span>
                            <Progress 
                              value={latestResult.percentage} 
                              className={`w-16 h-2 ${latestResult.percentage >= 70 ? 'bg-green-100' : ''}`}
                            />
                            {openItems.includes(paragraphKey) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="p-3 border-t">
                          <div className="space-y-2 text-sm">
                            <div className="font-medium">Laatste resultaten:</div>
                            {paragraphData.results.slice(0, 3).map((result, index) => (
                              <div 
                                key={result.id} 
                                className="flex justify-between items-center p-2 rounded bg-slate-50"
                              >
                                <span className="flex items-center">
                                  <Badge 
                                    variant={result.percentage >= 70 ? "secondary" : "outline"}
                                    className={result.percentage >= 70 ? "bg-green-100 text-green-800" : ""}
                                  >
                                    {result.score}/{result.total_questions}
                                  </Badge>
                                  {index === 0 && (
                                    <span className="ml-2 text-xs text-green-600">Meest recent</span>
                                  )}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {formatRelativeDate(result.created_at)}
                                </span>
                              </div>
                            ))}
                            {paragraphData.results.length > 3 && (
                              <div className="text-xs text-center text-muted-foreground pt-1">
                                +{paragraphData.results.length - 3} meer resultaten
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default QuizResultsAccordion;
