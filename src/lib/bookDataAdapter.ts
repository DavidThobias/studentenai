
/**
 * This adapter provides translation functions to convert between
 * different database schema formats for book and paragraph data.
 */

interface BookRecord {
  id: number;
  chapter_number: number;
  paragraph_number: number;
  book_title: string;
  chapter_title: string;
  content: string;
  objectives?: string;
}

interface ParagraphData {
  id: number;
  "paragraaf nummer"?: number;
  content?: string;
  chapter_id: number;
  objectives?: string;
}

/**
 * Converts records from the 'books' table to match the ParagraphData interface
 * used by the existing components
 */
export function mapBooksDataToParagraphs(booksData: BookRecord[]): ParagraphData[] {
  return booksData.map((book, index) => ({
    id: book.id || index + 1000, // Use book id or generate a unique one
    "paragraaf nummer": book.paragraph_number,
    content: book.content,
    chapter_id: book.chapter_number,
    objectives: book.objectives
  }));
}

/**
 * Converts ParagraphData to books table format
 * This is useful when we need to add data to the books table
 */
export function mapParagraphsToBookData(
  paragraphs: ParagraphData[], 
  bookTitle: string, 
  chapterTitle: string
): BookRecord[] {
  return paragraphs.map(para => ({
    id: para.id,
    chapter_number: para.chapter_id,
    paragraph_number: para["paragraaf nummer"] || 0,
    book_title: bookTitle,
    chapter_title: chapterTitle,
    content: para.content || "",
    objectives: para.objectives
  }));
}
