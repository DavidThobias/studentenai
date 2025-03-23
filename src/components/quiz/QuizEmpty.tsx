
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, BookCheck } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChapterData } from "@/hooks/useChaptersAndParagraphs";

interface QuizEmptyProps {
  bookId: number | null;
  chapterId: number | null;
  paragraphId: number | null;
  availableChapters: ChapterData[];
  isLoadingChapters: boolean;
  questionCount: number;
  onChapterSelect: (chapterId: string) => void;
  onQuestionCountChange: (count: number) => void;
  onGenerateQuiz: () => void;
  onBackToHome: () => void;
}

const QuizEmpty = ({
  bookId,
  chapterId,
  paragraphId,
  availableChapters,
  isLoadingChapters,
  questionCount,
  onChapterSelect,
  onQuestionCountChange,
  onGenerateQuiz,
  onBackToHome
}: QuizEmptyProps) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6">
      {!bookId ? (
        <>
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Voor het genereren van een quiz is een boek, hoofdstuk of paragraaf nodig.
              Ga naar een boekdetailpagina om een quiz te starten.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={onBackToHome} className="mt-4">
            Terug naar home
          </Button>
        </>
      ) : (
        <div className="space-y-6 w-full max-w-md">
          {bookId && !chapterId && availableChapters.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Selecteer een hoofdstuk</h3>
              <Select onValueChange={onChapterSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kies een hoofdstuk" />
                </SelectTrigger>
                <SelectContent>
                  {availableChapters.map((chapter) => (
                    <SelectItem 
                      key={chapter.id} 
                      value={chapter.chapter_number.toString()}
                    >
                      Hoofdstuk {chapter.chapter_number}: {chapter.chapter_title || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Aantal vragen</h3>
            <Select 
              defaultValue={questionCount.toString()} 
              onValueChange={(value) => onQuestionCountChange(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Aantal vragen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 vragen</SelectItem>
                <SelectItem value="5">5 vragen</SelectItem>
                <SelectItem value="10">10 vragen</SelectItem>
                <SelectItem value="15">15 vragen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={onGenerateQuiz} 
            className="w-full"
            disabled={!bookId || (availableChapters.length > 0 && !chapterId)}
          >
            <BookCheck className="mr-2 h-4 w-4" />
            {bookId && !chapterId && 'Genereer quiz over het boek'}
            {chapterId && !paragraphId && `Genereer quiz over hoofdstuk ${chapterId}`}
            {paragraphId && `Genereer quiz over paragraaf ${paragraphId}`}
          </Button>
          
          {isLoadingChapters && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Hoofdstukken laden...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizEmpty;
