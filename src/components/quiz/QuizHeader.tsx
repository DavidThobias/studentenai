
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface QuizHeaderProps {
  title: string;
  isStructuredLearning: boolean;
  progressData: any[];
  calculateChapterProgress: () => number;
}

const QuizHeader = ({ 
  title, 
  isStructuredLearning, 
  progressData, 
  calculateChapterProgress 
}: QuizHeaderProps) => {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-6">{title}</h1>
      
      {isStructuredLearning && progressData.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Voortgang hoofdstuk</h2>
            <Badge variant="outline" className="px-3 py-1">
              {calculateChapterProgress()}% compleet
            </Badge>
          </div>
          <Progress value={calculateChapterProgress()} className="h-3" />
        </div>
      )}
    </>
  );
};

export default QuizHeader;
