
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a consistent localStorage key for quiz states
 */
export function createQuizStateKey(bookId: number | null, chapterId: number | null, paragraphId: number | null): string {
  return `quizState_${bookId || 'none'}_${chapterId || 'none'}_${paragraphId || 'none'}`;
}

/**
 * Creates a consistent localStorage key for quiz results
 */
export function createQuizResultKey(bookId: number | null, chapterId: number | null, paragraphId: number | null): string {
  return `quizResult_${bookId || 'none'}_${chapterId || 'none'}_${paragraphId || 'none'}`;
}

/**
 * Format a date for display, with human-readable relative dates for recent dates
 */
export function formatRelativeDate(dateString: string): string {
  if (!dateString) return 'Datum onbekend';
  
  try {
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateString) && isNaN(Date.parse(dateString))) {
      return 'Ongeldige datum';
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Ongeldige datum';
    }
    
    // Reset time part for accurate day comparison
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(now.getTime() - compareDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Vandaag';
    } else if (diffDays === 1) {
      return 'Gisteren';
    } else if (diffDays < 7) {
      return `${diffDays} dagen geleden`;
    } else {
      return new Intl.DateTimeFormat('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    }
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Datum fout';
  }
}
