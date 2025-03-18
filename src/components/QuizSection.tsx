
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight, Lightbulb } from 'lucide-react';

const questions = [
  {
    id: 1,
    question: "What is the primary function of mitochondria in a cell?",
    options: [
      "Protein synthesis",
      "Energy production",
      "Cell division",
      "Waste removal"
    ],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "Which of the following is NOT a component of the central dogma of molecular biology?",
    options: [
      "DNA",
      "RNA",
      "Proteins",
      "Lipids"
    ],
    correctAnswer: 3
  },
  {
    id: 3,
    question: "The process of breaking down glucose to release energy is called:",
    options: [
      "Photosynthesis",
      "Glycolysis",
      "Transcription",
      "Translation"
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
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="heading-lg text-foreground mb-4">
            Try a sample quiz
          </h2>
          <p className="subheading">
            Experience how StudyJoy transforms learning with interactive quizzes.
          </p>
        </div>

        <div className="glass-card p-8">
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
                    Question {currentQuestion + 1} of {questions.length}
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
                        {isCorrect ? "Correct!" : "Not quite right."}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isCorrect 
                          ? "Great job! The mitochondria are indeed the powerhouse of the cell, responsible for producing energy through cellular respiration."
                          : `The correct answer is "${questions[currentQuestion].options[questions[currentQuestion].correctAnswer]}". Mitochondria are responsible for producing energy through cellular respiration.`
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
                  {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
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
                <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
                <p className="text-muted-foreground">
                  {score === questions.length 
                    ? "Perfect score! You've mastered this material."
                    : score >= questions.length / 2
                    ? "Good job! Keep practicing to improve further."
                    : "Keep studying! You'll get better with practice."
                  }
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="btn-primary" onClick={resetQuiz}>
                  Try Again
                </button>
                <button className="btn-secondary">
                  Explore More Quizzes
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
