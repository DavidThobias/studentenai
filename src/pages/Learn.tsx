
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Book, FileText, List, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LearnPage = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const learningOptions = [
    {
      id: 1,
      title: "Boeken",
      description: "Bestudeer hoofdstukken uit onze boeken en test je kennis met AI-gegenereerde quizzen.",
      icon: <Book className="h-8 w-8" />,
      action: () => navigate('/books'),
      color: "bg-blue-50 text-blue-600"
    },
    {
      id: 2,
      title: "Gestructureerd leren",
      description: "Volg een gestructureerd leerpad door boeken, compleet met vooruitgangsregistratie.",
      icon: <List className="h-8 w-8" />,
      action: () => navigate('/books'),
      color: "bg-green-50 text-green-600"
    },
    {
      id: 3,
      title: "Quiz generator",
      description: "Genereer automatisch quizzen gebaseerd op het hoofdstuk van je keuze.",
      icon: <FileText className="h-8 w-8" />,
      action: () => navigate('/books'),
      color: "bg-study-50 text-study-600"
    },
    {
      id: 4,
      title: "Samenvattingen",
      description: "Laat AI een samenvatting maken van de hoofdstukken en paragrafen.",
      icon: <BookOpen className="h-8 w-8" />,
      action: () => navigate('/books'),
      color: "bg-purple-50 text-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="heading-xl text-foreground mb-4">Leeropties</h1>
          <p className="subheading max-w-3xl">
            Kies hoe je wilt leren. AI helpt je bij het studeren, samenvattingen maken, 
            en quizzen genereren op basis van je studiemateriaal.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {learningOptions.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onMouseEnter={() => setHoveredCard(option.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <Card className="h-full transition-shadow duration-300 hover:shadow-md overflow-hidden relative">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${option.color} flex items-center justify-center mb-3`}>
                    {option.icon}
                  </div>
                  <CardTitle>{option.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {option.description}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full justify-between" 
                    onClick={option.action}
                    variant="outline"
                  >
                    <span>Selecteer boek</span>
                    <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${hoveredCard === option.id ? 'translate-x-1' : ''}`} />
                  </Button>
                </CardFooter>
                {hoveredCard === option.id && (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-t from-background/5 to-transparent z-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LearnPage;
