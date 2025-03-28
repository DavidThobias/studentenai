
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

// Set PDF.js worker path
pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get Supabase credentials from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting PDF extraction process');
    
    // Create Supabase client with admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get PDF URL from request or use default
    const { pdfPath } = await req.json().catch(() => ({ 
      pdfPath: 'samenvattingen/Stuvia-1739284-samenvatting-basisboek-sales.pdf' 
    }));
    
    console.log(`Processing PDF at path: ${pdfPath}`);

    // Download the PDF file from storage
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('summaries')
      .download(pdfPath);
    
    if (fileError || !fileData) {
      console.error('Error downloading file:', fileError);
      return new Response(
        JSON.stringify({ error: `Error downloading file: ${fileError?.message || 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('File downloaded successfully, processing PDF content');
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Load the PDF using PDF.js
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    // Extract text from each page
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
      
      if (i % 5 === 0 || i === pdf.numPages) {
        console.log(`Processed ${i}/${pdf.numPages} pages`);
      }
    }
    
    console.log('Text extraction complete, processing content structure');
    
    // Process the extracted text to identify chapters and paragraphs
    const bookTitle = "Basisboek Sales";
    const authorName = "Steenhuis, Rein";
    const chapters = processContentIntoChapters(fullText);
    
    console.log(`Identified ${chapters.length} chapters`);
    
    // Insert data into the books table
    let insertedCount = 0;
    for (const chapter of chapters) {
      for (const paragraph of chapter.paragraphs) {
        const { error: insertError } = await supabase
          .from('books')
          .insert({
            book_title: bookTitle,
            author_name: authorName,
            chapter_number: chapter.chapterNumber,
            chapter_title: chapter.title,
            paragraph_number: paragraph.paragraphNumber,
            content: paragraph.content
          });
        
        if (insertError) {
          console.error(`Error inserting chapter ${chapter.chapterNumber}, paragraph ${paragraph.paragraphNumber}:`, insertError);
        } else {
          insertedCount++;
        }
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} paragraphs into the books table`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Content extracted and inserted successfully. ${insertedCount} paragraphs added.`,
        chaptersCount: chapters.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to process raw text into chapters and paragraphs
function processContentIntoChapters(text: string) {
  const chapters: Array<{
    chapterNumber: number;
    title: string;
    paragraphs: Array<{
      paragraphNumber: number;
      content: string;
    }>;
  }> = [];
  
  // Split by lines and clean up
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  let currentChapter: {
    chapterNumber: number;
    title: string;
    paragraphs: Array<{
      paragraphNumber: number;
      content: string;
    }>;
  } | null = null;
  
  let currentParagraph: {
    paragraphNumber: number;
    content: string;
  } | null = null;
  
  for (const line of lines) {
    // Check for chapter pattern - typically starts with "Hoofdstuk X" or "Chapter X"
    const chapterMatch = line.match(/^(?:Hoofdstuk|Chapter)\s+(\d+)[:\s]+(.*)/i);
    
    if (chapterMatch) {
      // If we found a new chapter, save previous chapter if exists
      if (currentChapter && currentParagraph) {
        currentChapter.paragraphs.push({ ...currentParagraph });
        currentParagraph = null;
      }
      
      // Create new chapter
      currentChapter = {
        chapterNumber: parseInt(chapterMatch[1]),
        title: chapterMatch[2] || `Hoofdstuk ${chapterMatch[1]}`,
        paragraphs: []
      };
      
      chapters.push(currentChapter);
      continue;
    }
    
    // Check for paragraph pattern - typically starts with number or number.number
    const paragraphMatch = line.match(/^(\d+(?:\.\d+)?)[:\s]+(.+)/);
    
    if (paragraphMatch && currentChapter) {
      // If we found a new paragraph, save previous paragraph if exists
      if (currentParagraph) {
        currentChapter.paragraphs.push({ ...currentParagraph });
      }
      
      // Create new paragraph
      currentParagraph = {
        paragraphNumber: parseFloat(paragraphMatch[1]),
        content: paragraphMatch[2]
      };
      continue;
    }
    
    // If line doesn't match chapter or paragraph pattern, add it to current paragraph
    if (currentParagraph && line) {
      currentParagraph.content += " " + line;
    }
  }
  
  // Add final paragraph if exists
  if (currentChapter && currentParagraph) {
    currentChapter.paragraphs.push({ ...currentParagraph });
  }
  
  // Use simple fallback if no chapters were detected
  if (chapters.length === 0) {
    console.log('No standard chapter format detected, using simple fallback structure');
    
    // Create a default chapter
    const defaultChapter = {
      chapterNumber: 1,
      title: "Hoofdstuk 1",
      paragraphs: []
    };
    
    // Split content into paragraphs based on line breaks or other patterns
    const paragraphs = text.split(/\n\n+/);
    
    defaultChapter.paragraphs = paragraphs.map((content, index) => ({
      paragraphNumber: index + 1,
      content: content.trim()
    }));
    
    chapters.push(defaultChapter);
  }
  
  return chapters;
}
