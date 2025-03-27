
import { BookOpen, CheckCircle, ChevronRight } from "lucide-react";
import { ParagraphData, ParagraphProgress } from "@/hooks/useChaptersAndParagraphs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
  const [completedParagraphs, setCompletedParagraphs] = useState<{[key: number]: boolean}>({});
  
  // Add a dependency on progressData to ensure we refresh when it changes
  useEffect(() => {
    if (user && paragraphs.length > 0) {
      fetchParagraphCompletionStatus();
    }
  }, [user, paragraphs, progressData]); // Added progressData as a dependency
  
  const fetchParagraphCompletionStatus = async () => {
    if (!user) return;
    
    try {
      const paragraphIds = paragraphs.map(p => p.id);
      
      // Fetch completion status from paragraph_progress table
      const { data, error } = await supabase
        .from('paragraph_progress')
        .select('paragraph_id, completed')
        .eq('user_id', user.id)
        .in('paragraph_id', paragraphIds);
        
      if (error) {
        console.error('Error fetching paragraph completion status:', error);
        return;
      }
      
      // Create a map of paragraph ID to completion status
      const completionMap: {[key: number]: boolean} = {};
      data?.forEach(item => {
        completionMap[item.paragraph_id] = item.completed;
      });
      
      console.log('Completion status updated from DB:', completionMap);
      setCompletedParagraphs(completionMap);
    } catch (error) {
      console.error('Error in fetchParagraphCompletionStatus:', error);
    }
  };
  
  // Check if a paragraph is completed either from the progressData prop or from the database
  const isParagraphCompleted = (paragraphId: number) => {
    // First check the completedParagraphs state from the database
    if (completedParagraphs[paragraphId]) {
      return true;
    }
    
    // Then check the progressData prop
    return progressData.some(p => p.id === paragraphId && p.completed);
  };

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
              const isCompleted = isParagraphCompleted(p.id);
              
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
                    ${isCompleted ? 'border-l-4 border-green-500' : ''}
                  `}
                  onClick={() => {
                    if (selectedParagraphId !== p.id) {
                      onSelectParagraph(p.id);
                    }
                  }}
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="font-medium min-w-[24px]">{p.paragraph_number || '?'}.</span>
                    <span className="truncate flex-1">
                      {paragraphTitle}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isCompleted && (
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
