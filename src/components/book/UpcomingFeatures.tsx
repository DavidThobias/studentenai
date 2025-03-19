
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const UpcomingFeatures = () => {
  return (
    <div className="bg-study-50 rounded-lg p-6 border border-study-100">
      <h3 className="text-xl font-medium mb-2">Binnenkort beschikbaar</h3>
      <p className="text-muted-foreground mb-4">
        We werken aan nieuwe functionaliteiten om je leerervaring te verbeteren, waaronder interactieve quizzen, voortgangsregistratie en meer.
      </p>
      <Button variant="outline" onClick={() => toast.info('Hou deze pagina in de gaten voor updates!')}>
        Meer informatie
      </Button>
    </div>
  );
};

export default UpcomingFeatures;
