
import { useState } from 'react';
import { ChevronRight, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Chapter {
  id: number;
  chapter_title?: string;
  chapter_number: number;
}

interface ChaptersListProps {
  chapters: Chapter[];
  onChapterSelect: (chapterId: number) => void;
  selectedChapterId: number | null;
}

const ChaptersList = ({ chapters, onChapterSelect, selectedChapterId }: ChaptersListProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!chapters || chapters.length === 0) {
    return (
      <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-center text-muted-foreground">Geen hoofdstukken beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-gray-200 rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex items-center justify-between p-4 text-left">
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              <span className="font-medium">Hoofdstukken ({chapters.length})</span>
            </div>
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-gray-200">
          <div className="divide-y divide-gray-200">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => onChapterSelect(chapter.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  selectedChapterId === chapter.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center">
                  <span className="font-medium mr-2">H{chapter.chapter_number}:</span>
                  <span>{chapter.chapter_title || `Hoofdstuk ${chapter.chapter_number}`}</span>
                </div>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ChaptersList;
