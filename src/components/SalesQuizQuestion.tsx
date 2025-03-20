
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Loader2, Brain } from "lucide-react";
import { toast } from "sonner";

interface QuestionData {
  vraag: string;
  opties: string[];
  correct: string;
}

const SalesQuizQuestion = () => {
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const generateQuestion = async () => {
    try {
      setLoading(true);
      setQuestion(null);
      setSelectedAnswer(null);
      setIsCorrect(null);
      
      const { data, error } = await supabase.functions.invoke('generate-sales-question');
      
      if (error) {
        console.error('Error generating question:', error);
        toast.error('Er is een fout opgetreden bij het genereren van de vraag');
        return;
      }
      
      if (data && data.success && data.question) {
        setQuestion(data.question);
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
    <div className="w-full max-w-3xl mx-auto my-8">
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
