
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Loader2, Brain } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface QuestionData {
  vraag: string;
  opties: string[];
  correct: string;
}

interface DebugData {
  prompt?: string;
  response?: any;
}

interface SalesQuizQuestionProps {
  showDebug?: boolean;
  bookId?: number;
}

const SalesQuizQuestion = ({ showDebug = false, bookId }: SalesQuizQuestionProps) => {
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<DebugData>({});
  const [debugAccordion, setDebugAccordion] = useState<string | null>(null);

  const generateQuestion = async () => {
    try {
      setLoading(true);
      setQuestion(null);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setDebugData({});
      setDebugAccordion(null);
      
      console.log("Generating question with debug:", showDebug, "bookId:", bookId);
      
      // Include bookId if available
      const payload = bookId ? { bookId, debug: showDebug } : { debug: showDebug };
      
      console.log("Payload for generate-quiz:", payload);
      
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: payload
      });
      
      console.log("Response from generate-quiz:", data, error);
      
      if (error) {
        console.error('Error generating question:', error);
        toast.error('Er is een fout opgetreden bij het genereren van de vraag');
        return;
      }
      
      if (data && data.success && data.questions && data.questions.length > 0) {
        // Format the first question from the response
        const questionData = data.questions[0];
        const formattedQuestion: QuestionData = {
          vraag: questionData.question,
          opties: questionData.options.map((opt: string, index: number) => 
            `${String.fromCharCode(65 + index)}: ${opt}`
          ),
          correct: `${String.fromCharCode(65 + questionData.correctAnswer)}: ${questionData.options[questionData.correctAnswer]}`
        };
        
        setQuestion(formattedQuestion);
        
        // Save debug data if available
        if (showDebug && data.debug) {
          console.log("Debug data received:", data.debug);
          setDebugData({
            prompt: data.debug.prompt,
            response: data.debug.response
          });
          // Auto-open the prompt accordion
          setDebugAccordion("prompt");
        }
      } else {
        toast.error('Ongeldige response ontvangen van de server');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Er is een fout opgetreden bij het genereren van de vraag');
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = () => {
    if (!selectedAnswer || !question) return;
    
    // Extract the letter from the selected answer (A, B, C, or D)
    const selectedLetter = selectedAnswer.charAt(0);
    const correctLetter = question.correct.charAt(0);
    
    setIsCorrect(selectedLetter === correctLetter);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!question ? (
        <div className="text-center">
          <Button 
            onClick={generateQuestion} 
            disabled={loading}
            size="lg"
            className="bg-study-600 hover:bg-study-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vraag genereren...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-5 w-5" />
                Genereer een quizvraag over sales
              </>
            )}
          </Button>
        </div>
      ) : (
        <Card className="shadow-lg border-study-100">
          <CardHeader className="bg-study-50 border-b border-study-100">
            <CardTitle className="text-xl text-center">Quiz Vraag</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-lg font-medium mb-6">{question.vraag}</p>
            
            <RadioGroup
              value={selectedAnswer || undefined}
              onValueChange={setSelectedAnswer}
              className="space-y-3"
            >
              {question.opties.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-2 p-3 rounded-md border ${
                    selectedAnswer === option && isCorrect === null
                      ? 'border-study-300 bg-study-50'
                      : selectedAnswer === option && isCorrect === true
                      ? 'border-green-300 bg-green-50'
                      : selectedAnswer === option && isCorrect === false
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <label
                    htmlFor={`option-${index}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 w-full cursor-pointer"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </RadioGroup>

            {isCorrect !== null && (
              <Alert className={`mt-6 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <AlertTitle className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                  {isCorrect ? 'Correct!' : 'Helaas, dat is niet juist'}
                </AlertTitle>
                <AlertDescription className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                  {isCorrect 
                    ? 'Goed gedaan! Je hebt de juiste optie gekozen.'
                    : `Het juiste antwoord is: ${question.correct}`}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Debug section */}
            {showDebug && (debugData.prompt || debugData.response) && (
              <div className="mt-6 border border-gray-200 rounded-md overflow-hidden">
                <Accordion 
                  type="single" 
                  collapsible 
                  className="w-full"
                  value={debugAccordion || undefined}
                  onValueChange={(value) => setDebugAccordion(value)}
                >
                  <AccordionItem value="prompt">
                    <AccordionTrigger className="px-4 py-2 bg-gray-50 text-sm">
                      OpenAI Prompt
                    </AccordionTrigger>
                    <AccordionContent className="p-4 bg-gray-50 text-xs font-mono whitespace-pre-wrap">
                      {debugData.prompt || 'Geen prompt beschikbaar'}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="response">
                    <AccordionTrigger className="px-4 py-2 bg-gray-50 text-sm">
                      OpenAI Response
                    </AccordionTrigger>
                    <AccordionContent className="p-4 bg-gray-50 text-xs font-mono whitespace-pre-wrap">
                      {debugData.response ? 
                        JSON.stringify(debugData.response, null, 2) : 
                        'Geen response beschikbaar'}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={generateQuestion}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Laden...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Nieuwe vraag
                </>
              )}
            </Button>
            <Button 
              onClick={checkAnswer}
              disabled={!selectedAnswer || isCorrect !== null}
              className={!selectedAnswer ? 'opacity-50' : ''}
            >
              Controleer antwoord
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default SalesQuizQuestion;
