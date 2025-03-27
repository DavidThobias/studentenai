
import { BookOpen, CheckCircle, ChevronRight } from "lucide-react";
import { ParagraphData, ParagraphProgress } from "@/hooks/useChaptersAndParagraphs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

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
  const [refreshTrigger, setRefreshTrigger] = useState<number>(Date.now());
  
  // Add a dependency on progressData to ensure we refresh when it changes
  useEffect(() => {
    if (user && paragraphs.length > 0) {
      fetchParagraphCompletionStatus();
    }
  }, [user, paragraphs, progressData, refreshTrigger]); // Added refreshTrigger as a dependency
  
  // Subscribe to real-time updates on paragraph_progress table
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('quiz-sidebar-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'paragraph_progress',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime update in paragraph_progress:', payload);
          // Force refresh of completion data
          setRefreshTrigger(Date.now());
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  const fetchParagraphCompletionStatus = async () => {
    if (!user) return;
    
    try {
      const paragraphIds = paragraphs.map(p => p.id);
      
      if (paragraphIds.length === 0) {
        console.log('No paragraphs to fetch completion status for');
        return;
      }
      
      console.log('Fetching completion status for paragraphs:', paragraphIds);
      
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

  // Manual refresh function
  const refreshCompletionStatus = () => {
    setRefreshTrigger(Date.now());
  };

  return (
    <div className="lg:w-72 w-full shrink-0">
      <div className="sticky top-28 border rounded-lg overflow-hidden bg-card shadow-sm">
        <div className="bg-primary/10 p-4 font-medium flex items-center justify-between">
          <span className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            <span>Paragrafen</span>
          </span>
          <button 
            onClick={refreshCompletionStatus} 
            className="text-xs text-primary hover:text-primary/80 transition-colors"
            aria-label="Refresh completion status"
          >
            Vernieuwen
          </button>
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
