
import { ArrowRight, BookOpen, Brain, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="pt-28 pb-20 px-6 hero-gradient relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-study-100 text-study-800 mb-4">
                <Lightbulb className="mr-1 h-4 w-4" />
                <span>Leer actief met AI</span>
              </div>
              <h1 className="heading-xl text-foreground">
                Begin direct met <br />
                <span className="text-study-600">jouw studieboeken</span>
              </h1>
              <p className="subheading max-w-lg mt-4">
                Upload je studieboeken en krijg direct toegang tot AI-gegenereerde quizzen om het materiaal actief te leren.
              </p>
            </div>

            <div className="flex flex-col gap-4 max-w-md">
              <Link 
                to="/learn" 
                className="btn-primary group inline-flex items-center justify-center py-4 px-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Upload je eigen samenvatting
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              
              <Link 
                to="/books" 
                className="btn-secondary inline-flex items-center justify-center py-4 px-6 text-lg font-medium shadow-md hover:shadow-lg transition-all duration-300"
              >
                Koop onze leermethodes
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-study-300 to-study-600 ring-2 ring-white"
                  />
                ))}
              </div>
              <div>
                <span className="text-foreground font-medium">1,000+</span> studenten leren al actief
              </div>
            </div>
          </div>

          <div className="relative animate-fade-in">
            <div className="aspect-square w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
              <div className="rounded-2xl overflow-hidden shadow-2xl bg-white">
                <div className="w-full h-full bg-gradient-to-br from-study-100 to-study-50 flex items-center justify-center p-8">
                  <div className="w-full max-w-sm glass-card p-8">
                    <div className="w-12 h-12 rounded-xl bg-study-600 text-white flex items-center justify-center mb-4">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Celbiologie - Hoofdstuk 4</h3>
                    <div className="h-2 bg-gray-200 rounded-full mb-4">
                      <div className="h-2 bg-study-600 rounded-full w-3/4"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 rounded-full bg-study-600"></div>
                        <div className="h-3 bg-gray-200 rounded-full flex-1"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 rounded-full bg-study-600"></div>
                        <div className="h-3 bg-gray-200 rounded-full flex-1"></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                        <div className="h-3 bg-gray-200 rounded-full flex-1"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
