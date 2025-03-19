
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, Search, ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BookData {
  id: number;
  Titel?: string;
  Auteur?: string;
}

const BooksPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch books from Supabase
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('Boeken')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        setBooks(data || []);
      } catch (error) {
        console.error('Error fetching books:', error);
        toast.error('Er is een fout opgetreden bij het ophalen van de boeken.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const categories = [
    { id: 'all', name: 'Alle categorieën' },
    { id: 'biology', name: 'Biologie' },
    { id: 'history', name: 'Geschiedenis' },
    { id: 'physics', name: 'Natuurkunde' },
    { id: 'math', name: 'Wiskunde' },
    { id: 'literature', name: 'Literatuur' },
    { id: 'sales', name: 'Verkoop' },
  ];

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter books based on search query and category
  const filteredBooks = books.filter(book => {
    const matchesSearch = !searchQuery || 
      (book.Titel?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       book.Auteur?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all';
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link to="/learn" className="inline-flex items-center text-study-600 hover:text-study-700 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar leeropties
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="heading-xl text-foreground mb-4">Kies een boek</h1>
          <p className="subheading max-w-3xl">
            Blader door onze collectie van studiemateriaal en kies het boek dat je wilt gebruiken.
          </p>
        </motion.div>

        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op titel of auteur..."
              className="pl-10"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            // Loading state
            Array.from({ length: 4 }).map((_, index) => (
              <div 
                key={`loading-${index}`} 
                className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 h-[300px] animate-pulse"
              >
                <div className="aspect-[3/4] bg-gray-100"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : filteredBooks.length > 0 ? (
            // Display actual books
            filteredBooks.map((book) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <Link to={`/books/${book.id}`} className="block">
                  <div className="aspect-[3/4] bg-study-50 flex items-center justify-center relative overflow-hidden">
                    <BookOpen className="h-20 w-20 text-study-200" />
                    {/* Placeholder for future book cover images */}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-foreground truncate">{book.Titel || 'Onbekende titel'}</h3>
                    <p className="text-sm text-muted-foreground">{book.Auteur || 'Onbekende auteur'}</p>
                    <div className="flex items-center mt-2">
                      <div className="text-xs bg-study-100 text-study-700 px-2 py-1 rounded">
                        {categories[categories.length - 1].name}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            // No books found
            <div className="col-span-full text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">Geen boeken gevonden die aan de zoekcriteria voldoen.</p>
            </div>
          )}
        </div>

        {!loading && books.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">Er zijn momenteel geen boeken beschikbaar.</p>
            <Button onClick={() => toast.info("Meer boeken zullen binnenkort worden toegevoegd.")}>
              Bekijk meer boeken
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksPage;
