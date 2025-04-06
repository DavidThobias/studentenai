
import { ReactNode } from 'react';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

interface QuizContainerProps {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
  objectives?: string | null;
}

const QuizContainer = ({ children, sidebar, className, objectives }: QuizContainerProps) => {
  return (
    <div className={cn("flex flex-col lg:flex-row gap-6", className)}>
      {sidebar}
      <div className="flex-1 bg-card p-6 rounded-lg shadow-sm border">
        {objectives && (
          <div className="mb-6 p-4 bg-muted/50 rounded border">
            <h3 className="text-sm font-medium mb-2">Leerdoelen:</h3>
            <div className="text-sm prose prose-sm max-w-none">
              <ReactMarkdown>{objectives}</ReactMarkdown>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default QuizContainer;
