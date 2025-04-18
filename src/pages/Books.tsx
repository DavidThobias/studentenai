
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, Search, ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BookData {
  id: number;
  book_title: string;
  author_name?: string;
}

const BooksPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch books from Supabase
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('books')
          .select('id, book_title, author_name')
          .eq('book_title', 'Basisboek Online Marketing'); // Only fetch the Online Marketing book
        
        if (error) {
          throw error;
        }
        
        // Transform to deduplicated books by title
        const uniqueBooks: BookData[] = [];
        const bookTitles = new Set();
        
        data?.forEach(book => {
          if (!bookTitles.has(book.book_title)) {
            bookTitles.add(book.book_title);
            uniqueBooks.push({
              id: book.id,
              book_title: book.book_title,
              author_name: book.author_name
            });
          }
        });
        
        setBooks(uniqueBooks);
      } catch (error) {
        console.error('Error fetching books:', error);
        toast.error('Er is een fout opgetreden bij het ophalen van de boeken.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = !searchQuery || 
      (book.book_title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       book.author_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-study-600 hover:text-study-700 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar startpagina
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
            // Loading state
            Array.from({ length: 1 }).map((_, index) => (
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
                    <img 
                      src="https://ncipejuazrewiizxtkcj.supabase.co/storage/v1/object/public/afbeeldingen//shopping.webp" 
                      alt={`${book.book_title} cover`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-foreground truncate">{book.book_title || 'Onbekende titel'}</h3>
                    <p className="text-sm text-muted-foreground">{book.author_name || 'Onbekende auteur'}</p>
                    <div className="flex items-center mt-2">
                      <div className="text-xs bg-study-100 text-study-700 px-2 py-1 rounded">
                        Online marketing
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
      </div>
    </div>
  );
};

export default BooksPage;
