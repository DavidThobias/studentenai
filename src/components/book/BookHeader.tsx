
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface BookHeaderProps {
  title: string | undefined;
  author: string | undefined;
}

const BookHeader = ({ title, author }: BookHeaderProps) => {
  return (
    <>
      <div className="mb-8">
        <Link to="/books" className="inline-flex items-center text-study-600 hover:text-study-700 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar boeken
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <h1 className="heading-xl text-foreground mb-4">{title || 'Boek details'}</h1>
        <p className="subheading max-w-3xl">
          Door {author}
        </p>
      </motion.div>
    </>
  );
};

export default BookHeader;
