
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Book, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const LearnPage = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelect(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    // Check if it's a PDF or text document
    if (selectedFile.type === 'application/pdf' || 
        selectedFile.type === 'text/plain' ||
        selectedFile.type.includes('document')) {
      setFile(selectedFile);
      toast.success(`Bestand "${selectedFile.name}" is geselecteerd.`);
    } else {
      toast.error("Alleen PDF of tekstdocumenten zijn toegestaan.");
    }
  };

  const handleUpload = () => {
    if (file) {
      toast.success("Samenvatting is geüpload! We bereiden je leermateriaal voor.");
      setTimeout(() => navigate("/quiz-generator"), 1500);
    } else {
      toast.error("Selecteer eerst een bestand om te uploaden.");
    }
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
            <Card className="h-full">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-study-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-study-600" />
                </div>
                <CardTitle className="text-2xl">Upload je samenvatting</CardTitle>
                <CardDescription>
                  Upload je eigen studiemateriaal of samenvatting om een gepersonaliseerde leerervaring te krijgen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? "border-study-600 bg-study-50" : "border-gray-300 hover:border-study-400"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-study-100 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-study-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sleep een PDF of tekstdocument hierheen, of
                    </p>
                    <label className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer">
                      Kies een bestand
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.txt,.doc,.docx"
                        onChange={handleFileChange}
                      />
                    </label>
                    {file && (
                      <p className="text-sm text-study-600 font-medium mt-2">
                        Geselecteerd: {file.name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleUpload}>
                  Upload en maak quizzen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
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
