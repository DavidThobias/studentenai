
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";
import { BatchProgress } from '@/hooks/useBookQuizGenerator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface QuizDebugProps {
  stateLog?: string[];
  debugData?: any;
  bookId: number | null;
  chapterId: number | null;
  paragraphId: number | null;
  isStructuredLearning?: boolean;
  questionsCount?: number;
  currentQuestionIndex?: number;
  isGenerating?: boolean;
  paragraphsCount?: number;
  batchProgress?: BatchProgress;
  openAIPrompt?: string;
  openAIResponse?: any;
}

const QuizDebug = ({
  stateLog = [],
  debugData = {},
  bookId,
  chapterId,
  paragraphId,
  isStructuredLearning = false,
  questionsCount = 0,
  currentQuestionIndex = 0,
  isGenerating = false,
  paragraphsCount = 0,
  batchProgress,
  openAIPrompt,
  openAIResponse
}: QuizDebugProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiDataOpen, setApiDataOpen] = useState<string | null>(null);
  
  // Removed debugMode check to make this component visible to all users
  
  return (
    <Card className="mt-8 border-dashed border-gray-300 bg-gray-50/50">
      <CardHeader className="py-2">
        <CardTitle className="flex items-center text-sm text-muted-foreground cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <Bug className="w-4 h-4 mr-2" />
          <span>Quiz Informatie</span>
          {isOpen ? (
            <ChevronUp className="ml-auto h-4 w-4" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4" />
          )}
        </CardTitle>
      </CardHeader>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="text-xs">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-gray-100 p-2 rounded">
                <p><strong>Book ID:</strong> {bookId}</p>
                <p><strong>Chapter ID:</strong> {chapterId}</p>
                <p><strong>Paragraph ID:</strong> {paragraphId}</p>
                <p><strong>Questions:</strong> {questionsCount}</p>
                <p><strong>Current Index:</strong> {currentQuestionIndex}</p>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                <p><strong>Is Generating:</strong> {String(isGenerating)}</p>
                <p><strong>Paragraphs:</strong> {paragraphsCount}</p>
                <p><strong>Structured Learning:</strong> {String(isStructuredLearning)}</p>
                {batchProgress && (
                  <>
                    <p><strong>Batch:</strong> {batchProgress.currentBatch + 1}/{batchProgress.totalBatches}</p>
                    <p><strong>Objectives:</strong> {batchProgress.processedObjectives}/{batchProgress.totalObjectives}</p>
                  </>
                )}
              </div>
            </div>
            
            {(openAIPrompt || openAIResponse) && (
              <div className="mb-4">
                <Accordion 
                  type="single" 
                  collapsible 
                  className="w-full"
                  value={apiDataOpen || undefined}
                  onValueChange={(value) => setApiDataOpen(value)}
                >
                  {openAIPrompt && (
                    <AccordionItem value="prompt">
                      <AccordionTrigger className="text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-t">
                        OpenAI Prompt
                      </AccordionTrigger>
                      <AccordionContent className="bg-gray-800 text-gray-100 p-2 rounded-b overflow-auto max-h-60">
                        <pre className="text-xs whitespace-pre-wrap">{openAIPrompt}</pre>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {openAIResponse && (
                    <AccordionItem value="response">
                      <AccordionTrigger className="text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-t mt-2">
                        OpenAI Reactie
                      </AccordionTrigger>
                      <AccordionContent className="bg-gray-800 text-gray-100 p-2 rounded-b overflow-auto max-h-60">
                        <pre className="text-xs whitespace-pre-wrap">{typeof openAIResponse === 'string' ? openAIResponse : JSON.stringify(openAIResponse, null, 2)}</pre>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default QuizDebug;
