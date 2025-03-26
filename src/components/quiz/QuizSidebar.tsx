
import { BookOpen, CheckCircle, ChevronRight } from "lucide-react";
import { ParagraphData, ParagraphProgress } from "@/hooks/useChaptersAndParagraphs";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <div className="lg:w-72 w-full shrink-0">
      <div className="sticky top-28 border rounded-lg overflow-hidden bg-card shadow-sm">
        <div className="bg-primary/10 p-4 font-medium flex items-center">
          <BookOpen className="h-5 w-5 mr-2" />
          <span>Paragrafen</span>
        </div>
        <ScrollArea className="h-[500px]">
          <div className="p-2">
            {paragraphs.map((p) => {
              const progress = progressData.find(pr => pr.id === p.id);
              
              // Format the paragraph title to be consistent: "Paragraaf X.Y"
              const paragraphTitle = `Paragraaf ${p.chapter_number}.${p.paragraph_number}`;
              
              return (
                <div 
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors mb-1
                    ${selectedParagraphId === p.id 
                      ? 'bg-primary/15 font-medium' 
                      : 'hover:bg-muted'
                    }
                    ${progress?.completed ? 'border-l-4 border-green-500' : ''}
                  `}
                  onClick={() => {
                    if (selectedParagraphId !== p.id) {
                      onSelectParagraph(p.id);
                    }
                  }}
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="font-medium min-w-[24px]">{p.paragraph_number}.</span>
                    <span className="truncate flex-1">
                      {paragraphTitle}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {progress?.completed && (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    {selectedParagraphId === p.id && (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default QuizSidebar;
