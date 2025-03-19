
import { Skeleton } from "@/components/ui/skeleton";

const LoadingBookDetail = () => {
  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto flex flex-col space-y-8 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded"></div>
        <div className="h-12 w-3/4 bg-gray-200 rounded mb-4"></div>
        <div className="h-6 w-1/2 bg-gray-200 rounded mb-8"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-60 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingBookDetail;
