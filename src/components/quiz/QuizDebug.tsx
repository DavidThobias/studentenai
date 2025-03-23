
import { useState } from 'react';
import { Bug } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

interface QuizDebugProps {
  stateLog: string[];
  debugData: any;
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
  const [debugAccordion, setDebugAccordion] = useState<string | null>(null);

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-10">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setShowDebug(true)}
          className="rounded-full"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Accordion 
        type="single" 
        collapsible
        value={debugAccordion}
        onValueChange={setDebugAccordion}
        className="mt-10 border"
      >
        <AccordionItem value="debug-state">
          <AccordionTrigger className="px-4">Debug Status</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 text-xs space-y-2 bg-gray-50 font-mono">
            <div>bookId: {bookId}</div>
            <div>chapterId: {chapterId}</div>
            <div>paragraphId: {paragraphId}</div>
            <div>isStructuredLearning: {String(isStructuredLearning)}</div>
            <div>questions: {questionsCount}</div>
            <div>currentQuestionIndex: {currentQuestionIndex}</div>
            <div>isGenerating: {String(isGenerating)}</div>
            <div>paragraphs: {paragraphsCount}</div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="debug-log">
          <AccordionTrigger className="px-4">Debug Log</AccordionTrigger>
          <AccordionContent className="p-4 text-xs bg-gray-50 font-mono">
            <div className="h-40 overflow-y-auto space-y-1">
              {stateLog.map((log, i) => (
                <div key={i} className="text-xs">{log}</div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        {debugData.prompt && (
          <AccordionItem value="debug-prompt">
            <AccordionTrigger className="px-4">AI Prompt</AccordionTrigger>
            <AccordionContent className="p-4 text-xs bg-gray-50 font-mono whitespace-pre-line">
              {debugData.prompt}
            </AccordionContent>
          </AccordionItem>
        )}
        {debugData.response && (
          <AccordionItem value="debug-response">
            <AccordionTrigger className="px-4">AI Response</AccordionTrigger>
            <AccordionContent className="p-4 text-xs bg-gray-50 font-mono whitespace-pre-line">
              {debugData.response}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
      <div className="fixed bottom-4 right-4 z-10">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setShowDebug(false)}
          className="rounded-full"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
};

export default QuizDebug;
