
import { BookOpen, Brain, CheckCircle, LightbulbIcon, GraduationCap, Clock } from "lucide-react";

const features = [
  {
    icon: <BookOpen className="h-6 w-6 text-study-600" />,
    title: "Boekuploads",
    description: "Upload je studieboeken en transformeer ze in interactieve leermateriaal!."
  },
  {
    icon: <Brain className="h-6 w-6 text-study-600" />,
    title: "AI-Gegenereerde Vragen",
    description: "Onze AI genereert gepersonaliseerde vragen op basis van jouw specifieke studiemateriaal."
  },
  {
    icon: <CheckCircle className="h-6 w-6 text-study-600" />,
    title: "Voortgangsanalyse",
    description: "Monitor je leervoortgang en identificeer gebieden die meer aandacht nodig hebben."
  },
  {
    icon: <LightbulbIcon className="h-6 w-6 text-study-600" />,
    title: "Spaced Repetition",
    description: "Herhaal informatie op optimale intervallen om langetermijnretentie te maximaliseren."
  },
  {
    icon: <GraduationCap className="h-6 w-6 text-study-600" />,
    title: "Gepersonaliseerd Leren",
    description: "Past zich aan jouw leerstijl en tempo aan voor een op maat gemaakte studie-ervaring."
  },
  {
    icon: <Clock className="h-6 w-6 text-study-600" />,
    title: "Studietimer",
    description: "Ingebouwde pomodoro-timer om je te helpen gefocust en productief te blijven."
  }
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="heading-lg text-foreground mb-4">
            Functies voor effectief leren uit boeken
          </h2>
          <p className="subheading">
            StudyJoy combineert bewezen leertechnieken met moderne technologie om effectiever te leren uit jouw studiemateriaal.
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
