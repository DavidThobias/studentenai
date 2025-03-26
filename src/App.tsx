
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Learn from "./pages/Learn";
import Books from "./pages/Books";
import BookDetail from "./pages/BookDetail";
import QuizPage from "./pages/QuizPage";
import QuizGeneratorPage from "./pages/QuizGeneratorPage";
import SummaryPage from "./pages/SummaryPage";
import Auth from "./pages/Auth";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

// Proxy API requests to Supabase edge functions
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
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/books" element={
                  <ProtectedRoute>
                    <Layout>
                      <Books />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/books/:id" element={
                  <ProtectedRoute>
                    <BookDetail />
                  </ProtectedRoute>
                } />
                <Route path="/books/:id/summary" element={
                  <ProtectedRoute>
                    <SummaryPage />
                  </ProtectedRoute>
                } />
                <Route path="/learn" element={
                  <ProtectedRoute>
                    <Layout>
                      <Learn />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/quiz-generator" element={
                  <ProtectedRoute>
                    <Layout>
                      <QuizGeneratorPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/quiz" element={
                  <ProtectedRoute>
                    <Layout>
                      <QuizPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
