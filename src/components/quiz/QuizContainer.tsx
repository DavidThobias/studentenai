
import { ReactNode } from 'react';
import { cn } from "@/lib/utils";

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
        {children}
      </div>
    </div>
  );
};

export default QuizContainer;
