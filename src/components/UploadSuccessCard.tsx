
import { CheckCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UploadSuccessCardProps {
  fileName: string;
  documentId: string;
  onContinue: (documentId: string) => void;
}

const UploadSuccessCard = ({ fileName, documentId, onContinue }: UploadSuccessCardProps) => {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl">Upload geslaagd!</CardTitle>
        <CardDescription>
          Je samenvatting is geüpload en wordt verwerkt.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="bg-green-50 p-4 rounded-md">
          <p className="font-medium text-green-700">"{fileName}"</p>
          <p className="text-sm text-green-600 mt-2">
            De inhoud is geanalyseerd en hoofdstukken zijn geïdentificeerd. Je kunt nu verder gaan
            om gepersonaliseerde quizzen te genereren op basis van de inhoud.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={() => onContinue(documentId)}>
          Ga verder naar quiz generator
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UploadSuccessCard;
