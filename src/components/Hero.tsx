
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { BookOpen, Users, ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <section className="py-24 lg:py-32 bg-background flex items-center">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-6">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-foreground"
              >
                Leer sneller en effectiever met AI
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400"
              >
                Verbeter je studieresultaten met AI-gestuurde quizzen en samenvattingen gebaseerd op jouw studiemateriaal.
              </motion.p>
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col gap-4 min-[400px]:flex-row"
            >
              <Link to="/books">
                <Button size="lg" className="bg-study-600 hover:bg-study-700">
                  Begin nu
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/learn">
                <Button size="lg" variant="outline">
                  Meer informatie
                </Button>
              </Link>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center space-x-4 text-sm"
            >
              <div className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4 text-study-600" />
                <span>AI-gestuurde quizzen</span>
              </div>
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-study-600" />
                <span>Gratis registreren</span>
              </div>
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last bg-study-50 flex items-center justify-center"
          >
            <img 
              src="/lovable-uploads/49055015-6c80-492c-842e-e1b8b1f5e517.png" 
              alt="Student leert met AI-ondersteuning"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
