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
import { BookOpen, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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

interface ParagraphInfo {
  chapter_number: number;
  paragraph_number: number;
}

interface ChapterResults {
  [chapterId: string]: {
    chapterId: number;
    paragraphs: {
      [paragraphId: string]: {
        paragraphId: number;
        paragraphNumber: number;
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
  const [paragraphInfo, setParagraphInfo] = useState<{[key: string]: ParagraphInfo}>({});
  
  useEffect(() => {
    if (user) {
      fetchQuizResults();
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  const formatChapterParagraph = (chapterId: number | null, paragraphId: number | null, paragraphNumber?: number) => {
    if (chapterId && paragraphId && paragraphNumber !== undefined) {
      return `${chapterId}.${paragraphNumber}`;
    }
    
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
      
      const { data: paragraphsData, error: paragraphsError } = await supabase
        .from('books')
        .select('id, chapter_number, paragraph_number')
        .order('chapter_number, paragraph_number', { ascending: true });
      
      if (paragraphsError) {
        throw paragraphsError;
      }
      
      const paragraphMapping: {[key: string]: ParagraphInfo} = {};
      if (paragraphsData) {
        paragraphsData.forEach(p => {
          paragraphMapping[p.id] = {
            chapter_number: p.chapter_number,
            paragraph_number: p.paragraph_number
          };
        });
      }
      
      setParagraphInfo(paragraphMapping);
      
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
      
      const processedResults: ChapterResults = {};
      
      data.forEach((result: QuizResult) => {
        if (result.chapter_id) {
          const chapterKey = `chapter-${result.chapter_id}`;
          
          if (!processedResults[chapterKey]) {
            processedResults[chapterKey] = {
              chapterId: result.chapter_id,
              paragraphs: {}
            };
          }
          
          if (result.paragraph_id) {
            const paragraphKey = `paragraph-${result.paragraph_id}`;
            
            let paragraphNumber = 0;
            if (paragraphMapping[result.paragraph_id]) {
              paragraphNumber = paragraphMapping[result.paragraph_id].paragraph_number;
            }
            
            if (!processedResults[chapterKey].paragraphs[paragraphKey]) {
              processedResults[chapterKey].paragraphs[paragraphKey] = {
                paragraphId: result.paragraph_id,
                paragraphNumber: paragraphNumber,
                results: [result],
                latestResult: result
              };
            } else {
              processedResults[chapterKey].paragraphs[paragraphKey].results.push(result);
              
              if (!processedResults[chapterKey].paragraphs[paragraphKey].latestResult) {
                processedResults[chapterKey].paragraphs[paragraphKey].latestResult = result;
              }
            }
          }
        }
      });
      
      setChapterResults(processedResults);
      
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
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
        <span className="ml-3 text-primary font-medium">Quiz resultaten laden...</span>
      </div>
    );
  }
  
  if (Object.keys(chapterResults).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Award className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-muted-foreground text-center">Je hebt nog geen quiz resultaten</p>
        <p className="text-sm text-muted-foreground mt-1">Maak een quiz om je voortgang te zien</p>
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
          
          const getScoreColor = (percentage: number) => {
            if (percentage >= 90) return "bg-green-500";
            if (percentage >= 70) return "bg-green-400";
            if (percentage >= 50) return "bg-yellow-400";
            return "bg-orange-400";
          };
            
          return (
            <AccordionItem key={chapterKey} value={chapterKey}>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AccordionTrigger className="hover:bg-gray-50 px-4 py-3 rounded-lg">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <BookOpen className="mr-3 h-5 w-5 text-primary" />
                      <span className="font-medium">Hoofdstuk {chapterData.chapterId}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">
                        {chapterPercentage}%
                      </span>
                      <Progress 
                        value={chapterPercentage} 
                        className="w-20 h-2 rounded-full overflow-hidden"
                        indicatorClassName={getScoreColor(chapterPercentage)}
                      />
                    </div>
                  </div>
                </AccordionTrigger>
              </motion.div>
              <AccordionContent className="px-4 pt-2 pb-4">
                <div className="space-y-3">
                  {Object.entries(chapterData.paragraphs)
                    .sort(([, a], [, b]) => a.paragraphNumber - b.paragraphNumber)
                    .map(([paragraphKey, paragraphData]) => {
                    const { latestResult } = paragraphData;
                    
                    return (
                      <Collapsible key={paragraphKey} className="border rounded-lg overflow-hidden shadow-sm">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center">
                            <span className="font-medium">
                              {formatChapterParagraph(chapterData.chapterId, paragraphData.paragraphId, paragraphData.paragraphNumber)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              {latestResult.percentage}%
                            </span>
                            <Progress 
                              value={latestResult.percentage} 
                              className="w-16 h-2 rounded-full overflow-hidden"
                              indicatorClassName={getScoreColor(latestResult.percentage)}
                            />
                            {openItems.includes(paragraphKey) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="p-3 border-t bg-slate-50">
                          <div className="space-y-2 text-sm">
                            <div className="font-medium pb-1">Laatste resultaten:</div>
                            {paragraphData.results.slice(0, 3).map((result, index) => (
                              <motion.div 
                                key={result.id} 
                                className="flex justify-between items-center p-2 rounded bg-white shadow-sm"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.1 }}
                              >
                                <span className="flex items-center">
                                  <Badge 
                                    variant={result.percentage >= 70 ? "secondary" : "outline"}
                                    className={result.percentage >= 70 ? "bg-green-100 text-green-800 border border-green-200" : ""}
                                  >
                                    {result.score}/{result.total_questions}
                                  </Badge>
                                  {index === 0 && (
                                    <span className="ml-2 text-xs text-green-600 font-medium">Meest recent</span>
                                  )}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {formatRelativeDate(result.created_at)}
                                </span>
                              </motion.div>
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
