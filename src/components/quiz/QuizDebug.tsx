
import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Bug, Terminal, Code, Braces } from "lucide-react";

interface QuizDebugProps {
  stateLog: string[];
  debugData: {
    prompt?: string;
    response?: any;
    apiResponse?: any;
    tokenEstimates?: {
      promptTokens?: number;
      requestedMaxTokens?: number;
    };
    extractedTerms?: string[];
  };
  bookId: number | null;
  chapterId: number | null;
  paragraphId: number | null;
  isStructuredLearning: boolean;
  questionsCount: number;
  currentQuestionIndex: number;
  isGenerating: boolean;
  paragraphsCount: number;
}

const QuizDebug = ({
  stateLog,
  debugData,
  bookId,
  chapterId,
  paragraphId,
  isStructuredLearning,
  questionsCount,
  currentQuestionIndex,
  isGenerating,
  paragraphsCount
}: QuizDebugProps) => {
  const [showDebug, setShowDebug] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  // Check for query param to enable debug
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.get('debug') === 'true';

  if (!debugMode) {
    return null;
  }

  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  return (
    <div className="mt-8 border-t pt-4">
      <div className="flex justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDebug}
          className="text-xs"
        >
          {showDebug ? (
            <>
              <EyeOff className="mr-2 h-3 w-3" />
              Verberg debug info
            </>
          ) : (
            <>
              <Bug className="mr-2 h-3 w-3" />
              Toon debug info
            </>
          )}
        </Button>
      </div>

      {showDebug && (
        <div className="border rounded-md p-4 bg-gray-50 text-xs">
          <h3 className="font-bold mb-2 flex items-center">
            <Terminal className="mr-2 h-4 w-4" /> 
            Quiz Debug Panel
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-gray-100 p-2 rounded-md">
              <span className="font-semibold">BookID:</span> {bookId || 'none'}
            </div>
            <div className="bg-gray-100 p-2 rounded-md">
              <span className="font-semibold">ChapterID:</span> {chapterId || 'none'}
            </div>
            <div className="bg-gray-100 p-2 rounded-md">
              <span className="font-semibold">ParagraphID:</span> {paragraphId || 'none'}
            </div>
            <div className="bg-gray-100 p-2 rounded-md">
              <span className="font-semibold">Mode:</span> {isStructuredLearning ? 'Structured' : 'Free'}
            </div>
            <div className="bg-gray-100 p-2 rounded-md">
              <span className="font-semibold">Questions:</span> {questionsCount}
            </div>
            <div className="bg-gray-100 p-2 rounded-md">
              <span className="font-semibold">Current:</span> {currentQuestionIndex}
            </div>
            <div className="bg-gray-100 p-2 rounded-md">
              <span className="font-semibold">Generating:</span> {isGenerating ? 'Yes' : 'No'}
            </div>
            <div className="bg-gray-100 p-2 rounded-md">
              <span className="font-semibold">Paragraphs:</span> {paragraphsCount}
            </div>
          </div>
          
          {/* Extracted Terms */}
          {debugData.extractedTerms && debugData.extractedTerms.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-1 flex items-center">
                <Code className="mr-1 h-3 w-3" /> 
                Extracted Terms ({debugData.extractedTerms.length})
              </h4>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-white border rounded">
                {debugData.extractedTerms.map((term, index) => (
                  <Badge key={index} variant="outline" className="text-xs">{term}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Token Estimation */}
          {debugData.tokenEstimates && (
            <div className="mb-4">
              <h4 className="font-semibold mb-1 flex items-center">
                <Braces className="mr-1 h-3 w-3" /> 
                Token Estimates
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 border rounded text-xs">
                  <span className="font-semibold">Prompt Tokens:</span> {debugData.tokenEstimates.promptTokens || 'N/A'}
                </div>
                <div className="bg-white p-2 border rounded text-xs">
                  <span className="font-semibold">Max Tokens:</span> {debugData.tokenEstimates.requestedMaxTokens || 'N/A'}
                </div>
              </div>
            </div>
          )}

          <Accordion 
            type="single" 
            collapsible 
            value={activeAccordion || undefined}
            onValueChange={(value) => setActiveAccordion(value)}
          >
            <AccordionItem value="state-log">
              <AccordionTrigger className="text-xs py-2">State Log</AccordionTrigger>
              <AccordionContent>
                <div className="h-40 overflow-y-auto bg-gray-100 p-2 rounded border">
                  {stateLog.slice().reverse().map((log, index) => (
                    <div key={index} className="border-b border-gray-200 py-1 text-xs font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {debugData.prompt && (
              <AccordionItem value="prompt">
                <AccordionTrigger className="text-xs py-2">OpenAI Prompt</AccordionTrigger>
                <AccordionContent>
                  <div className="h-40 overflow-y-auto bg-gray-100 p-2 rounded border font-mono text-xs whitespace-pre-wrap">
                    {debugData.prompt}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            
            {debugData.response && (
              <AccordionItem value="response">
                <AccordionTrigger className="text-xs py-2">OpenAI Response</AccordionTrigger>
                <AccordionContent>
                  <div className="h-40 overflow-y-auto bg-gray-100 p-2 rounded border font-mono text-xs">
                    {JSON.stringify(debugData.response, null, 2)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            
            {debugData.apiResponse && (
              <AccordionItem value="api-response">
                <AccordionTrigger className="text-xs py-2">Full API Response</AccordionTrigger>
                <AccordionContent>
                  <div className="h-40 overflow-y-auto bg-gray-100 p-2 rounded border font-mono text-xs">
                    {JSON.stringify(debugData.apiResponse, null, 2)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      )}
    </div>
  );
};

export default QuizDebug;
