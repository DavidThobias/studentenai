
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Bookmark } from 'lucide-react';

interface ParagraphViewerProps {
  content: string;
  title?: string;
  paragraphNumber?: number;
}

const ParagraphViewer: React.FC<ParagraphViewerProps> = ({ 
  content, 
  title, 
  paragraphNumber 
}) => {
  // Function to format the content with basic styling
  const formatContent = (text: string) => {
    if (!text) return '';

    // Replace consecutive newlines with paragraph breaks
    let formattedText = text.replace(/\n{2,}/g, '</p><p>');
    
    // Style headings (text in all caps followed by a colon or newline)
    formattedText = formattedText.replace(
      /([A-Z][A-Z\s]{2,}[A-Z])(:|\n)/g, 
      '<h3>$1</h3>'
    );
    
    // Style lists (lines starting with - or * or numbers)
    formattedText = formattedText.replace(
      /^(\s*[-*]\s+|\s*\d+\.\s+)(.+)$/gm, 
      '<li>$2</li>'
    );
    formattedText = formattedText.replace(/<li>/g, '</p><ul><li>');
    formattedText = formattedText.replace(/<\/li>(?!\s*<li>)/g, '</li></ul><p>');
    
    // Style bold text (text between ** or __ pairs)
    formattedText = formattedText.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
    
    // Style italic text (text between * or _ pairs)
    formattedText = formattedText.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
    
    // Wrap in paragraph tags if not already done
    if (!formattedText.startsWith('<p>')) {
      formattedText = '<p>' + formattedText;
    }
    if (!formattedText.endsWith('</p>')) {
      formattedText += '</p>';
    }
    
    return formattedText;
  };

  return (
    <Card className="mb-6 shadow-md border-study-100 overflow-hidden">
      <div className="bg-study-50 p-4 border-b border-study-100 flex items-center justify-between">
        <div className="flex items-center">
          <BookOpen className="text-study-700 mr-2 h-5 w-5" />
          <h2 className="text-xl font-semibold">
            {title || `Paragraaf ${paragraphNumber || ''}`}
          </h2>
        </div>
        <Bookmark className="text-study-600 h-5 w-5" />
      </div>
      <CardContent className="p-6">
        <div 
          className="prose-blue"
          dangerouslySetInnerHTML={{ __html: formatContent(content) }}
        />
      </CardContent>
    </Card>
  );
};

export default ParagraphViewer;
