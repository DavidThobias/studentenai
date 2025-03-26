
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Book, Loader2, AlertCircle, FileText, Settings, List, FileQuestion } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import QuizContainer from '@/components/quiz/QuizContainer';

interface DocumentSection {
  id: string;
  document_id: string;
  title: string;
  content: string;
  section_number: string;
}

interface DocumentData {
  id: string;
  file_name: string;
  file_type: string;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
  sections: DocumentSection[];
}

const QuizGeneratorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('documentId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<DocumentData | null>(null);
  
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [quizType, setQuizType] = useState<'quiz' | 'flashcards'>('quiz');
  const [includeExplanations, setIncludeExplanations] = useState(true);
  
  useEffect(() => {
    if (!documentId) {
      setError('Geen document ID gevonden. Ga terug en probeer opnieuw.');
      setIsLoading(false);
      return;
    }
    
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        
        // Fetch document data
        const { data: docData, error: docError } = await supabase
          .from('user_documents')
          .select('*')
          .eq('id', documentId)
          .single();
        
        if (docError) throw new Error(docError.message);
        if (!docData) throw new Error('Document niet gevonden');
        
        // Fetch sections
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('document_sections')
          .select('*')
          .eq('document_id', documentId)
          .order('section_number', { ascending: true });
        
        if (sectionsError) throw new Error(sectionsError.message);
        
        // Combine data
        setDocument({
          ...docData,
          sections: sectionsData || []
        });
        
        // Auto-select first section if available
        if (sectionsData && sectionsData.length > 0) {
          setSelectedSections([sectionsData[0].id]);
        }
        
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err instanceof Error ? err.message : 'Fout bij ophalen van document');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocument();
  }, [documentId]);
  
  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
  };
  
  const handleSelectAllSections = () => {
    if (document?.sections) {
      setSelectedSections(document.sections.map(section => section.id));
    }
  };
  
  const handleClearSections = () => {
    setSelectedSections([]);
  };
  
  const handleGenerateQuiz = () => {
    if (selectedSections.length === 0) {
      toast.error('Selecteer ten minste één hoofdstuk of sectie.');
      return;
    }
    
    const params = new URLSearchParams();
    params.append('documentId', documentId || '');
    selectedSections.forEach(sectionId => {
      params.append('sections', sectionId);
    });
    params.append('count', questionCount.toString());
    params.append('type', quizType);
    params.append('explanations', includeExplanations.toString());
    
    toast.success('Quiz wordt voorbereid...');
    navigate(`/quiz?${params.toString()}`);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <h2 className="text-xl font-semibold">Document wordt geladen...</h2>
            <p className="text-muted-foreground">Even geduld terwijl we je document laden.</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !document) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <h2 className="text-xl font-semibold">Er is een fout opgetreden</h2>
            <p className="text-muted-foreground">{error || 'Document kon niet worden geladen'}</p>
            <Button onClick={() => navigate('/learn')}>Terug naar Leren</Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Quiz Generator</h1>
          <p className="text-muted-foreground">
            Maak gepersonaliseerde quizzen op basis van je geüploade samenvatting.
          </p>
        </div>
        
        <QuizContainer>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Document Info */}
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">Bestandsnaam</h3>
                      <p className="text-sm text-muted-foreground">{document.file_name}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Type</h3>
                      <p className="text-sm text-muted-foreground">{document.file_type}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Geüpload op</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(document.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">Status</h3>
                      <div className="flex items-center gap-2">
                        {document.processed ? (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            Verwerkt
                          </span>
                        ) : (
                          <span className="text-sm text-amber-600 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Wordt verwerkt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Quiz Instellingen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="font-medium">Aantal vragen</h3>
                      <Slider 
                        value={[questionCount]} 
                        min={1} 
                        max={20} 
                        step={1}
                        onValueChange={(values) => setQuestionCount(values[0])}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1</span>
                        <span>{questionCount}</span>
                        <span>20</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Quiz Type</h3>
                      <RadioGroup value={quizType} onValueChange={(value) => setQuizType(value as 'quiz' | 'flashcards')}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="quiz" id="quiz" />
                          <Label htmlFor="quiz">Multiple Choice Quiz</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="flashcards" id="flashcards" />
                          <Label htmlFor="flashcards">Flashcards</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="explanations">Uitleg bij antwoorden</Label>
                        <Switch 
                          id="explanations" 
                          checked={includeExplanations}
                          onCheckedChange={setIncludeExplanations}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Toon uitleg bij de juiste antwoorden
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2 space-y-6">
              {/* Sections Selection */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <List className="h-5 w-5 text-primary" />
                      Hoofdstukken en Secties
                    </CardTitle>
                    <CardDescription>
                      Selecteer de hoofdstukken en secties waarover je vragen wilt genereren
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAllSections}>
                      Selecteer alles
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearSections}>
                      Wis selectie
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {document.sections.length === 0 ? (
                      <div className="text-center py-8">
                        <Book className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Geen hoofdstukken of secties gevonden in dit document.</p>
                      </div>
                    ) : (
                      document.sections.map(section => (
                        <div key={section.id} className="border rounded-md p-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              <input
                                type="checkbox"
                                id={`section-${section.id}`}
                                checked={selectedSections.includes(section.id)}
                                onChange={() => handleSectionToggle(section.id)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </div>
                            <div className="flex-1">
                              <label
                                htmlFor={`section-${section.id}`}
                                className="font-medium cursor-pointer block"
                              >
                                {section.section_number ? `${section.section_number}. ` : ''}{section.title}
                              </label>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {section.content.substring(0, 150)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => navigate('/learn')}>
                  Annuleren
                </Button>
                <Button onClick={handleGenerateQuiz} disabled={selectedSections.length === 0}>
                  <FileQuestion className="mr-2 h-4 w-4" />
                  Genereer Quiz
                </Button>
              </div>
            </div>
          </div>
        </QuizContainer>
      </div>
    </div>
  );
};

export default QuizGeneratorPage;
