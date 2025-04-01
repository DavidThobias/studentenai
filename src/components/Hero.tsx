
import { ArrowRight, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="min-h-[80vh] flex items-center hero-gradient relative overflow-hidden pt-28 pb-20 px-6 bg-gradient-to-br from-study-50 to-blue-50">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-4">
              <motion.div 
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-study-100 text-study-800 mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <BookOpen className="mr-1 h-4 w-4" />
                <span>Leer actief met AI</span>
              </motion.div>
              
              <motion.h1 
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.7 }}
              >
                Maak studeren <br />
                <span className="text-study-600">effectiever</span>
              </motion.h1>
              
              <motion.p 
                className="text-lg text-gray-700 max-w-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.7 }}
              >
                Upload je studieboeken en ga direct aan de slag met AI-gegenereerde quizzen.
              </motion.p>
            </div>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Link 
                to="/learn" 
                className="btn-primary group inline-flex items-center justify-center py-3 px-6 text-lg font-medium rounded-lg bg-study-600 text-white hover:bg-study-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Begin nu
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="aspect-square w-full max-w-md mx-auto lg:mx-0 lg:ml-auto relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-study-200 rounded-3xl -rotate-6 transform shadow-lg"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-study-100 to-blue-100 rounded-3xl rotate-3 transform shadow-lg"></div>
              <div className="rounded-2xl overflow-hidden shadow-2xl relative z-10 bg-white h-full flex items-center justify-center">
                <img 
                  src="/basisboek-sales-cover.jpg" 
                  alt="Studieboek" 
                  className="object-cover h-full w-full"
                />
              </div>
              
              <motion.div 
                className="absolute -bottom-10 -right-10 w-28 h-28 bg-study-50 rounded-full flex items-center justify-center shadow-lg z-20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, duration: 0.5, type: "spring" }}
              >
                <div className="text-center">
                  <span className="block text-2xl font-bold text-study-600">100%</span>
                  <span className="text-xs text-gray-600">Effectief</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
