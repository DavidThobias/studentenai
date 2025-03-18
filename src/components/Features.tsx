
import { BookOpen, Brain, CheckCircle, LightbulbIcon, GraduationCap, Clock } from "lucide-react";

const features = [
  {
    icon: <BookOpen className="h-6 w-6 text-study-600" />,
    title: "Interactive Textbooks",
    description: "Upload your study materials and transform them into interactive learning experiences."
  },
  {
    icon: <Brain className="h-6 w-6 text-study-600" />,
    title: "AI-Generated Questions",
    description: "Our AI generates customized questions based on your specific study material."
  },
  {
    icon: <CheckCircle className="h-6 w-6 text-study-600" />,
    title: "Progress Tracking",
    description: "Monitor your learning progress and identify areas that need more attention."
  },
  {
    icon: <LightbulbIcon className="h-6 w-6 text-study-600" />,
    title: "Spaced Repetition",
    description: "Review information at optimal intervals to maximize long-term retention."
  },
  {
    icon: <GraduationCap className="h-6 w-6 text-study-600" />,
    title: "Personalized Learning",
    description: "Adapts to your learning style and pace for a tailored educational experience."
  },
  {
    icon: <Clock className="h-6 w-6 text-study-600" />,
    title: "Study Timer",
    description: "Built-in pomodoro timer to help you maintain focus and productivity."
  }
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="heading-lg text-foreground mb-4">
            Features designed for effective learning
          </h2>
          <p className="subheading">
            StudyJoy combines proven learning techniques with modern technology to help you learn more effectively.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 ease-in-out"
            >
              <div className="h-12 w-12 rounded-xl bg-study-50 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="heading-md mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
