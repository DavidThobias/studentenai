
// @deno-types="https://deno.land/x/xhr@0.1.0/deno.d.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Parse request body
    const requestData = await req.json();
    const { count = 5, bookId, debug = false } = requestData; // Default to 5 questions if not specified
    console.log(`Calling OpenAI API to generate ${count} sales questions for book ID: ${bookId || 'not specified'}`);
    
    // Fetch book content if bookId is provided
    let bookContent = "";
    let bookTitle = "";
    
    if (bookId) {
      // Create Supabase client to fetch book content
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase credentials not configured');
      }
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // Get book details
      console.log(`Fetching book with ID: ${bookId} from books table`);
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .maybeSingle();

      if (bookError) {
        console.error(`Error fetching book: ${JSON.stringify(bookError)}`);
        throw new Error(`Error fetching book: ${bookError.message}`);
      }

      if (!book) {
        console.error(`No book found with ID: ${bookId}`);
        throw new Error(`No book found with ID: ${bookId}`);
      }
      
      bookTitle = book.book_title;
      
      // Get content from this book (multiple paragraphs)
      const { data: paragraphs, error: paragraphsError } = await supabase
        .from('books')
        .select('content, chapter_number, paragraph_number')
        .eq('book_title', bookTitle)
        .order('chapter_number', { ascending: true })
        .order('paragraph_number', { ascending: true })
        .limit(20); // Limit to prevent token overflow
      
      if (!paragraphsError && paragraphs && paragraphs.length > 0) {
        bookContent = paragraphs.map(p => 
          `Hoofdstuk ${p.chapter_number}, Paragraaf ${p.paragraph_number}: ${p.content}`
        ).join('\n\n');
        
        console.log(`Fetched ${paragraphs.length} paragraphs for book: ${bookTitle}`);
      } else {
        console.warn(`No paragraphs found for book ID: ${bookId}`);
        bookContent = `Boek: ${bookTitle}`;
      }
    }
    
    // Create a prompt that requests multiple questions
    const systemPrompt = `Je bent een ervaren Nederlandse docent die gespecialiseerd is in sales en marketing. 
    Je taak is om uitstekende quizvragen te maken over het Basisboek Sales.
    
    Elke vraag moet uniek en informatief zijn, gericht op verschillende aspecten van sales en marketing.`;
    
    const userPrompt = `Genereer ${count} verschillende meerkeuzevragen over sales${bookContent ? ' gebaseerd op de volgende inhoud' : ''}.
    
    ${bookContent ? `Boektitel: ${bookTitle}\n\nInhoud:\n${bookContent}\n\n` : ''}
    
    Elke vraag moet:
    1. Relevant zijn voor het onderwerp sales
    2. Vier antwoordopties hebben (A, B, C, D), waarvan er precies één correct is
    3. Een duidelijk correcte optie hebben
    
    Retourneer de vragen in een JSON array met de volgende structuur:
    [
      {
        "question": "De vraag in het Nederlands",
        "options": ["Optie 1", "Optie 2", "Optie 3", "Optie 4"],
        "correct": "A" (of B, C, D afhankelijk van welk antwoord correct is)
      },
      ...meer vragen...
    ]
    
    Zorg ervoor dat de vragen niet te lang zijn en dat ze verschillende onderwerpen binnen sales behandelen.`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using gpt-4o-mini as a more affordable alternative to gpt-4
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000, // Increased to allow for more questions
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully received OpenAI response');
    
    // Extract the content from the OpenAI response
    const content = data.choices[0].message.content;
    console.log('Generated content length:', content.length);
    
    // Try to parse the JSON from the response
    let questions = [];
    try {
      // First try direct parsing
      questions = JSON.parse(content);
      console.log(`Successfully parsed JSON directly with ${questions.length} questions`);
    } catch (e) {
      console.log('Failed to parse JSON directly, trying to extract JSON from text');
      // If direct parsing fails, try to extract JSON from the text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          questions = JSON.parse(jsonMatch[0]);
          console.log(`Successfully extracted and parsed JSON from text with ${questions.length} questions`);
        } catch (extractError) {
          console.error('Failed to parse extracted content:', extractError);
          throw new Error('Failed to parse question data');
        }
      } else {
        console.error('No JSON content found in response');
        throw new Error('Invalid format in OpenAI response');
      }
    }

    // Validate the questions
    if (!Array.isArray(questions)) {
      throw new Error('OpenAI did not return an array of questions');
    }
    
    // Make sure we have at least one question
    if (questions.length === 0) {
      throw new Error('No questions were generated');
    }
    
    console.log(`Returning ${questions.length} questions`);

    // Create response object, include debug info if requested
    const responseObj: any = {
      success: true,
      questions: questions
    };
    
    // Add debug information if requested
    if (debug) {
      responseObj.debug = {
        prompt: userPrompt,
        response: data.choices[0].message
      };
    }

    return new Response(
      JSON.stringify(responseObj),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-sales-question function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
