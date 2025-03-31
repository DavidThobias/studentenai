
import { ArrowRight, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="min-h-[80vh] flex items-center hero-gradient relative overflow-hidden pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-study-100 text-study-800 mb-4">
                <BookOpen className="mr-1 h-4 w-4" />
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
                Start met leren
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="relative animate-fade-in hidden lg:block">
            <div className="aspect-square w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
              <div className="rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-study-50 to-study-100 h-full flex items-center justify-center">
                <img 
                  src="/basisboek-sales-cover.jpg" 
                  alt="Studieboek" 
                  className="object-cover h-full w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
