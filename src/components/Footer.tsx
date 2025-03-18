
import { Link } from 'react-router-dom';
import { BookOpen, Github, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-study-600" />
              <span className="font-bold text-lg text-foreground">StudyJoy</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Transform your study experience with interactive learning tools that help you retain information better.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Product</h4>
            <ul className="space-y-2">
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Features</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Pricing</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Security</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Roadmap</Link></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Resources</h4>
            <ul className="space-y-2">
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Blog</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Help Center</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Tutorials</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Community</Link></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Company</h4>
            <ul className="space-y-2">
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">About</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Careers</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Contact</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-study-600 transition-colors">Partners</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} StudyJoy. All rights reserved.
          </p>
          
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="#" className="text-muted-foreground hover:text-study-600 transition-colors">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
            <Link to="#" className="text-muted-foreground hover:text-study-600 transition-colors">
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link to="#" className="text-muted-foreground hover:text-study-600 transition-colors">
              <Instagram className="h-5 w-5" />
              <span className="sr-only">Instagram</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
