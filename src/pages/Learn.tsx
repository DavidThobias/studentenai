
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Book, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FileUploadCard from '@/components/FileUploadCard';
import UploadSuccessCard from '@/components/UploadSuccessCard';
import QuizContainer from '@/components/quiz/QuizContainer';

const LearnPage = () => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<{ id: string, name: string } | null>(null);

  const handleFileUploaded = (documentId: string, fileName: string) => {
    setUploadedFile({ id: documentId, name: fileName });
    toast.success(`Bestand "${fileName}" is geüpload en verwerkt.`);
  };

  const handleContinueToQuizGenerator = (documentId: string) => {
    toast.success("Samenvatting is geüpload! We bereiden je leermateriaal voor.");
    setTimeout(() => navigate(`/quiz-generator?documentId=${documentId}`), 1500);
  };

  const handleChooseExisting = () => {
    toast.success("Je gaat nu een van onze samenvattingen kiezen.");
    navigate("/books");
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="heading-xl text-foreground mb-4">Begin met leren</h1>
          <p className="subheading max-w-2xl mx-auto">
            Kies hoe je wilt beginnen: upload je eigen samenvatting of kies een van onze voorbereidde materialen.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Option */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {uploadedFile ? (
              <UploadSuccessCard 
                fileName={uploadedFile.name}
                documentId={uploadedFile.id}
                onContinue={handleContinueToQuizGenerator}
              />
            ) : (
              <FileUploadCard onFileUploaded={handleFileUploaded} />
            )}
          </motion.div>

          {/* Choose Existing Option */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-study-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Book className="h-8 w-8 text-study-600" />
                </div>
                <CardTitle className="text-2xl">Kies een van onze samenvattingen</CardTitle>
                <CardDescription>
                  Selecteer uit onze uitgebreide bibliotheek van kant-en-klare samenvattingen en studiematerialen.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center flex-1">
                <div className="text-center space-y-6 py-8">
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="aspect-[3/4] bg-study-50 rounded-lg flex items-center justify-center p-4 border border-study-100">
                        <Book className="h-12 w-12 text-study-300" />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We hebben een grote selectie aan studiemateriaal voor verschillende onderwerpen.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="secondary" onClick={handleChooseExisting}>
                  Ontdek onze samenvattingen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LearnPage;
