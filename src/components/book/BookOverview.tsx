
import { BookOpen, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BookData {
  id: number;
  Titel?: string;
  Auteur?: string;
}

interface BookOverviewProps {
  book: BookData | null;
}

const BookOverview = ({ book }: BookOverviewProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
      {/* Book Cover */}
      <div className="md:col-span-1">
        <div className="aspect-[3/4] bg-study-50 rounded-lg shadow-md flex items-center justify-center overflow-hidden border border-study-100">
          <BookOpen className="h-24 w-24 text-study-300" />
        </div>
      </div>

      {/* Book Info */}
      <div className="md:col-span-2 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Over dit boek</h2>
          <p className="text-muted-foreground mb-4">
            Dit is een samenvatting van het boek "{book?.Titel}". Gebruik deze samenvatting om te studeren.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => toast.info('Functionaliteit wordt binnenkort toegevoegd')} 
            className="flex-1"
          >
            <FileText className="mr-2 h-5 w-5" />
            Bekijk samenvatting
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookOverview;
