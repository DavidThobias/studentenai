
import { ReactNode } from 'react';

interface QuizContainerProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

const QuizContainer = ({ children, sidebar }: QuizContainerProps) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {sidebar}
      <div className="flex-1 bg-card p-6 rounded-lg shadow-sm border">
        {children}
      </div>
    </div>
  );
};

export default QuizContainer;
