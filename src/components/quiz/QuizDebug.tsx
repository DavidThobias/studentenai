
import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Bug, Terminal, Code, Braces, Database, Clock } from "lucide-react";

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
    batchTerms?: string[];
  };
  bookId: number | null;
  chapterId: number | null;
  paragraphId: number | null;
  isStructuredLearning: boolean;
  questionsCount: number;
  currentQuestionIndex: number;
  isGenerating: boolean;
  paragraphsCount: number;
  batchProgress?: {
    currentBatch: number;
    totalBatches: number;
    processedTerms: number;
    totalTerms: number;
    startTime?: number;
  };
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
  paragraphsCount,
  batchProgress
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

  // Calculate elapsed time if we have batch progress with start time
  const getElapsedTime = () => {
    if (!batchProgress?.startTime) return null;
    
    const elapsedMs = Date.now() - batchProgress.startTime;
    const seconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    
    return `${minutes}m ${seconds % 60}s`;
  };

  // Estimate remaining time based on current progress
  const getEstimatedRemainingTime = () => {
    if (!batchProgress?.startTime || batchProgress.processedTerms === 0) return null;
    
    const elapsedMs = Date.now() - batchProgress.startTime;
    const msPerTerm = elapsedMs / batchProgress.processedTerms;
    const remainingTerms = batchProgress.totalTerms - batchProgress.processedTerms;
    const estimatedRemainingMs = msPerTerm * remainingTerms;
    
    const seconds = Math.floor(estimatedRemainingMs / 1000);
    const minutes = Math.floor(seconds / 60);
    
    return `~${minutes}m ${seconds % 60}s`;
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
          
          {/* Batch Progress Information */}
          {batchProgress && (
            <div className="mb-4 border rounded-md p-3 bg-amber-50">
              <h4 className="font-semibold flex items-center text-amber-700">
                <Database className="mr-1 h-3 w-3" /> 
                Batch Processing Information
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                <div className="bg-amber-100 p-2 rounded-md text-amber-800">
                  <span className="font-semibold">Current Batch:</span> {batchProgress.currentBatch + 1}/{batchProgress.totalBatches}
                </div>
                <div className="bg-amber-100 p-2 rounded-md text-amber-800">
                  <span className="font-semibold">Terms Processed:</span> {batchProgress.processedTerms}/{batchProgress.totalTerms}
                </div>
                {batchProgress.startTime && (
                  <div className="bg-amber-100 p-2 rounded-md text-amber-800 flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    <span className="font-semibold">Elapsed:</span> {getElapsedTime()}
                  </div>
                )}
                {batchProgress.startTime && batchProgress.processedTerms > 0 && (
                  <div className="bg-amber-100 p-2 rounded-md text-amber-800">
                    <span className="font-semibold">Est. Remaining:</span> {getEstimatedRemainingTime()}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Extracted Terms */}
          {debugData.extractedTerms && debugData.extractedTerms.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-1 flex items-center">
                <Code className="mr-1 h-3 w-3" /> 
                All Terms ({debugData.extractedTerms.length})
              </h4>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-white border rounded">
                {debugData.extractedTerms.map((term, index) => (
                  <Badge key={index} variant="outline" className="text-xs">{term}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Current Batch Terms */}
          {debugData.batchTerms && debugData.batchTerms.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-1 flex items-center">
                <Code className="mr-1 h-3 w-3" /> 
                Current Batch Terms ({debugData.batchTerms.length})
              </h4>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-white border border-amber-200 rounded bg-amber-50">
                {debugData.batchTerms.map((term, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-amber-100 border-amber-300">{term}</Badge>
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
