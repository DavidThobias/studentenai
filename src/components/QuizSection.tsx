
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight, Lightbulb, BookOpen } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const questions = [
  {
    id: 1,
    question: "Wat is de primaire functie van mitochondriën in een cel?",
    options: [
      "Eiwitsynthese",
      "Energieproductie",
      "Celdeling",
      "Afvalverwerking"
    ],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "Welke van de volgende is GEEN onderdeel van het centrale dogma in de moleculaire biologie?",
    options: [
      "DNA",
      "RNA",
      "Eiwitten",
      "Lipiden"
    ],
    correctAnswer: 3
  },
  {
    id: 3,
    question: "Het proces van het afbreken van glucose om energie vrij te maken wordt genoemd:",
    options: [
      "Fotosynthese",
      "Glycolyse",
      "Transcriptie",
      "Translatie"
    ],
    correctAnswer: 1
  }
];

export default function QuizSection() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const handleOptionSelect = (optionIndex: number) => {
    if (selectedOption !== null) return; // Prevent changing answer after selection
    
    setSelectedOption(optionIndex);
    const correct = optionIndex === questions[currentQuestion].correctAnswer;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      setQuizComplete(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setScore(0);
    setQuizComplete(false);
  };

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="quiz" className="py-20 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="heading-lg text-foreground mb-4">
            Leer direct uit je boeken
          </h2>
          <p className="subheading max-w-3xl mx-auto">
            Ervaar hoe StudyJoy je studieboeken transformeert in interactieve quizzen die je helpen de stof beter te onthouden.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="glass-card p-6 hover:shadow-md transition-shadow duration-300">
            <div className="h-12 w-12 rounded-xl bg-study-50 flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-study-600" />
            </div>
            <h3 className="heading-md mb-2">Upload je boek</h3>
            <p className="text-muted-foreground mb-4">Upload je PDF of ander studiemateriaal naar ons platform.</p>
            <button className="btn-secondary w-full">Upload Bestand</button>
          </div>
          
          <div className="glass-card p-6 hover:shadow-md transition-shadow duration-300">
            <div className="h-12 w-12 rounded-xl bg-study-50 flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-study-600" />
            </div>
            <h3 className="heading-md mb-2">AI Generatie</h3>
            <p className="text-muted-foreground mb-4">Onze AI analyseert je boek en genereert leerzame quizvragen.</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-study-600 h-2 rounded-full" style={{ width: `75%` }}></div>
            </div>
          </div>
          
          <div className="glass-card p-6 hover:shadow-md transition-shadow duration-300">
            <div className="h-12 w-12 rounded-xl bg-study-50 flex items-center justify-center mb-4">
              <LightbulbIcon className="h-6 w-6 text-study-600" />
            </div>
            <h3 className="heading-md mb-2">Actief Leren</h3>
            <p className="text-muted-foreground mb-4">Beantwoord vragen en verbeter je begrip van de stof.</p>
            <button className="btn-primary w-full">Begin met Leren</button>
          </div>
        </div>

        <div className="glass-card p-8 max-w-3xl mx-auto">
          <div className="mb-6 flex items-center">
            <BookOpen className="h-5 w-5 text-study-600 mr-2" />
            <h3 className="text-lg font-medium">Biologie: Celstructuren</h3>
          </div>

          {!quizComplete ? (
            <motion.div
              key={currentQuestion}
              initial="hidden"
              animate="visible"
              variants={variants}
            >
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Vraag {currentQuestion + 1} van {questions.length}
                  </span>
                  <span className="text-sm font-medium text-study-600">
                    Score: {score}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-study-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-6">
                {questions[currentQuestion].question}
              </h3>

              <div className="space-y-3 mb-8">
                {questions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    className={`w-full text-left p-4 rounded-lg border border-gray-200 transition-all duration-200 ease-in-out ${
                      selectedOption === index
                        ? selectedOption === questions[currentQuestion].correctAnswer
                          ? "bg-green-50 border-green-500"
                          : "bg-red-50 border-red-500"
                        : "hover:border-study-300 hover:bg-study-50"
                    }`}
                    onClick={() => handleOptionSelect(index)}
                    disabled={selectedOption !== null}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {selectedOption === index && (
                        selectedOption === questions[currentQuestion].correctAnswer ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedOption !== null && (
                <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-start">
                    <Lightbulb className="h-5 w-5 text-study-600 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {isCorrect ? "Correct!" : "Niet helemaal juist."}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isCorrect 
                          ? "Goed gedaan! De mitochondriën zijn inderdaad de energiefabriek van de cel, verantwoordelijk voor het produceren van energie via cellulaire respiratie."
                          : `Het juiste antwoord is "${questions[currentQuestion].options[questions[currentQuestion].correctAnswer]}". Mitochondriën zijn verantwoordelijk voor het produceren van energie via cellulaire respiratie.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  className="btn-primary"
                  onClick={handleNextQuestion}
                  disabled={selectedOption === null}
                >
                  {currentQuestion < questions.length - 1 ? "Volgende Vraag" : "Resultaten Bekijken"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={variants}
              className="text-center py-8"
            >
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-study-100 mb-4">
                  <span className="text-3xl font-bold text-study-600">{score}/{questions.length}</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Quiz Voltooid!</h3>
                <p className="text-muted-foreground">
                  {score === questions.length 
                    ? "Perfecte score! Je hebt dit materiaal onder de knie."
                    : score >= questions.length / 2
                    ? "Goed werk! Blijf oefenen om verder te verbeteren."
                    : "Blijf studeren! Je wordt beter met oefening."
                  }
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="btn-primary" onClick={resetQuiz}>
                  Opnieuw Proberen
                </button>
                <button className="btn-secondary">
                  Terug naar Mijn Boeken
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
