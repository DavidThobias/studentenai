
import { CheckCircle } from "lucide-react";
import { ParagraphData } from "@/hooks/useChaptersAndParagraphs";
import { ParagraphProgress } from "@/hooks/useChaptersAndParagraphs";

interface QuizSidebarProps {
  paragraphs: ParagraphData[];
  progressData: ParagraphProgress[];
  selectedParagraphId: number | null;
  onSelectParagraph: (paragraphId: number) => void;
}

const QuizSidebar = ({
  paragraphs,
  progressData,
  selectedParagraphId,
  onSelectParagraph
}: QuizSidebarProps) => {
  return (
    <div className="lg:w-64 w-full shrink-0">
      <div className="sticky top-28 border rounded-lg overflow-hidden">
        <div className="bg-muted p-3 font-medium">
          Paragrafen
        </div>
        <div className="p-1">
          {paragraphs.map((p) => {
            const progress = progressData.find(pr => pr.id === p.id);
            return (
              <div 
                key={p.id}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                  selectedParagraphId === p.id ? 'bg-muted font-medium' : ''
                }`}
                onClick={() => {
                  if (selectedParagraphId !== p.id) {
                    onSelectParagraph(p.id);
                  }
                }}
              >
                <span className="truncate">
                  {p.paragraph_number}. {p.content?.substring(0, 30)}{p.content && p.content.length > 30 ? '...' : ''}
                </span>
                {progress?.completed && (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 ml-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuizSidebar;
