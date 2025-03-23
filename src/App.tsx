
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Learn from "./pages/Learn";
import Books from "./pages/Books";
import BookDetail from "./pages/BookDetail";
import QuizPage from "./pages/QuizPage";

const queryClient = new QueryClient();

if (window.location.pathname.startsWith('/api/')) {
  const originalFetch = window.fetch;
  window.fetch = async (url, options) => {
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const functionName = url.split('/api/')[1].split('?')[0];
      return originalFetch(`https://ncipejuazrewiizxtkcj.supabase.co/functions/v1/${functionName}`, options);
    }
    return originalFetch(url, options);
  };
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/books" element={<Books />} />
              <Route path="/books/:id" element={<BookDetail />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
