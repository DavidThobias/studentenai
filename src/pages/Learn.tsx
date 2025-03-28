import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploadCard from '@/components/FileUploadCard';
import UploadSuccessCard from '@/components/UploadSuccessCard';
import QuizResultsAccordion from '@/components/QuizResultsAccordion';
import UserDashboard from '@/components/UserDashboard';
import PdfExtractor from '@/components/PdfExtractor';

const Learn = () => {
  const navigate = useNavigate();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const handleFileUploaded = (newDocumentId: string, newFileName: string) => {
    setDocumentId(newDocumentId);
    setFileName(newFileName);
  };
  
  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Leren</h1>
          <p className="text-muted-foreground">
            Upload je studiemateriaal, genereer quizzen en verbeter je resultaten
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <UserDashboard />
            
            <Tabs defaultValue="upload" className="w-full">
              <TabsList>
                <TabsTrigger value="upload">
                  <FileText className="h-4 w-4 mr-2" />
                  Studiemateriaal upload
                </TabsTrigger>
                <TabsTrigger value="results">
                  <Book className="h-4 w-4 mr-2" />
                  Mijn resultaten
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-6">
                {documentId ? (
                  <UploadSuccessCard
                    documentId={documentId}
                    fileName={fileName || ''}
                    onReset={() => {
                      setDocumentId(null);
                      setFileName(null);
                    }}
                    onGenerateQuiz={() => navigate(`/quiz-generator?documentId=${documentId}`)}
                  />
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <FileUploadCard onFileUploaded={handleFileUploaded} />
                    <PdfExtractor />
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="results" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Book className="h-5 w-5 text-primary mr-2" />
                      Mijn quiz resultaten
                    </CardTitle>
                    <CardDescription>
                      Bekijk je voortgang en behaalde resultaten per hoofdstuk en paragraaf
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <QuizResultsAccordion />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="md:col-span-1">
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Learn;
