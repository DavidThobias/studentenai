
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Book, Search, ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const BooksPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // This would typically come from an API
  const categories = [
    { id: 'all', name: 'Alle categorieën' },
    { id: 'biology', name: 'Biologie' },
    { id: 'history', name: 'Geschiedenis' },
    { id: 'physics', name: 'Natuurkunde' },
    { id: 'math', name: 'Wiskunde' },
    { id: 'literature', name: 'Literatuur' },
  ];

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleBookSelection = () => {
    toast.info("Deze functie is nog in ontwikkeling.");
  };

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
          {Array.from({ length: 8 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              onClick={handleBookSelection}
            >
              <div className="aspect-[3/4] bg-study-50 flex items-center justify-center relative overflow-hidden">
                <BookOpen className="h-20 w-20 text-study-200" />
                {/* Placeholder for future book cover images */}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-foreground truncate">Placeholder Boektitel</h3>
                <p className="text-sm text-muted-foreground">Auteur Naam</p>
                <div className="flex items-center mt-2">
                  <div className="text-xs bg-study-100 text-study-700 px-2 py-1 rounded">
                    {categories[Math.floor(Math.random() * (categories.length - 1)) + 1].name}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">Er zijn momenteel nog geen echte boeken beschikbaar.</p>
          <Button onClick={() => toast.info("Meer boeken zullen binnenkort worden toegevoegd.")}>
            Bekijk meer boeken
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BooksPage;
