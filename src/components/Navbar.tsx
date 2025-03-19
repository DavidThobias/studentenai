
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BookOpen, Menu, X, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out px-6 py-4",
        isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8 text-study-600" />
          <span className="font-bold text-xl text-foreground">StudyJoy</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-foreground hover:text-study-600 font-medium transition-colors">
            Home
          </Link>
          <Link to="#features" className="text-foreground hover:text-study-600 font-medium transition-colors">
            Functies
          </Link>
          <Link to="#quiz" className="text-foreground hover:text-study-600 font-medium transition-colors">
            Quiz Demo
          </Link>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{user.email?.split('@')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Mijn profiel</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-500">
                  <LogOut className="h-4 w-4 mr-2" /> Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" /> Inloggen
              </Link>
            </Button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-foreground hover:text-study-600 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md shadow-md p-4 animate-slide-in">
          <nav className="flex flex-col space-y-4">
            <Link 
              to="/" 
              className="text-foreground hover:text-study-600 font-medium transition-colors px-4 py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="#features" 
              className="text-foreground hover:text-study-600 font-medium transition-colors px-4 py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Functies
            </Link>
            <Link 
              to="#quiz" 
              className="text-foreground hover:text-study-600 font-medium transition-colors px-4 py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Quiz Demo
            </Link>
            
            {user ? (
              <>
                <Link 
                  to="/profile" 
                  className="text-foreground hover:text-study-600 font-medium transition-colors px-4 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-4 w-4 mr-2 inline" /> Mijn profiel
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="text-red-500 hover:text-red-600 font-medium transition-colors px-4 py-2 text-left w-full"
                >
                  <LogOut className="h-4 w-4 mr-2 inline" /> Uitloggen
                </button>
              </>
            ) : (
              <Link 
                to="/auth" 
                className="bg-study-600 text-white hover:bg-study-700 font-medium transition-colors px-4 py-2 rounded-md text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <LogIn className="h-4 w-4 mr-2 inline" /> Inloggen
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
