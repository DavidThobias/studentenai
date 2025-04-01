
import { motion } from "framer-motion";
import { BookOpen, Brain, CheckCircle, LightbulbIcon, GraduationCap } from "lucide-react";

const features = [
  {
    icon: <BookOpen className="h-6 w-6 text-study-600" />,
    title: "Upload Boeken",
    description: "Transformeer je studieboeken naar interactief leermateriaal."
  },
  {
    icon: <Brain className="h-6 w-6 text-study-600" />,
    title: "AI-Quizzen",
    description: "Gepersonaliseerde vragen voor actief leren."
  },
  {
    icon: <CheckCircle className="h-6 w-6 text-study-600" />,
    title: "Voortgang",
    description: "Volg je ontwikkeling en studieresultaten."
  },
  {
    icon: <LightbulbIcon className="h-6 w-6 text-study-600" />,
    title: "Beter Onthouden",
    description: "Optimale herhaling voor langetermijnretentie."
  },
  {
    icon: <GraduationCap className="h-6 w-6 text-study-600" />,
    title: "Op Maat",
    description: "Past zich aan jouw leerstijl en tempo aan."
  }
];

export default function Features() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <section id="features" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl font-bold mb-4 text-foreground">
            Effectiever studeren
          </h2>
          <p className="text-lg text-muted-foreground">
            Combineer bewezen leertechnieken met moderne technologie
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              className="p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 ease-in-out h-full flex flex-col"
              variants={itemVariants}
            >
              <div className="h-12 w-12 rounded-xl bg-study-50 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
