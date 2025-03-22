
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
    const { 
      count = 5,
      bookId,
      chapterId,
      paragraphId,
      debug = false 
    } = requestData;
    
    console.log(`Generating ${count} sales questions with context:`, {
      bookId: bookId || 'not specified',
      chapterId: chapterId || 'not specified',
      paragraphId: paragraphId || 'not specified'
    });
    
    // Fetch book content if bookId is provided
    let bookContent = "";
    let bookTitle = "";
    let contextDescription = "";
    
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
      contextDescription = `boek "${bookTitle}"`;
      
      // Build query for content based on provided context
      let query = supabase
        .from('books')
        .select('content, chapter_number, paragraph_number, chapter_title')
        .eq('book_title', bookTitle);
      
      // Add chapter filter if specified
      if (chapterId) {
        query = query.eq('chapter_number', chapterId);
        contextDescription = `hoofdstuk ${chapterId} van ${contextDescription}`;
      }
      
      // Add paragraph filter if specified
      if (paragraphId && chapterId) {
        query = query.eq('paragraph_number', paragraphId);
        contextDescription = `paragraaf ${paragraphId} van ${contextDescription}`;
      }
      
      // Limit and order results
      const { data: paragraphs, error: paragraphsError } = await query
        .order('chapter_number', { ascending: true })
        .order('paragraph_number', { ascending: true });
      
      if (!paragraphsError && paragraphs && paragraphs.length > 0) {
        // If there's paragraph-specific content, use it
        if (paragraphId && paragraphs.length === 1) {
          const paragraph = paragraphs[0];
          bookContent = `Hoofdstuk ${paragraph.chapter_number} (${paragraph.chapter_title}), Paragraaf ${paragraph.paragraph_number}:\n\n${paragraph.content}`;
          console.log(`Fetched specific paragraph ${paragraphId} from chapter ${chapterId}`);
        } 
        // If there's chapter-specific content, use all paragraphs from that chapter
        else if (chapterId) {
          bookContent = paragraphs.map(p => 
            `Paragraaf ${p.paragraph_number}: ${p.content}`
          ).join('\n\n');
          console.log(`Fetched ${paragraphs.length} paragraphs from chapter ${chapterId}`);
        }
        // Otherwise use a sample of paragraphs from the book
        else {
          bookContent = paragraphs.map(p => 
            `Hoofdstuk ${p.chapter_number}, Paragraaf ${p.paragraph_number}: ${p.content}`
          ).join('\n\n');
          
          console.log(`Fetched ${paragraphs.length} paragraphs for book: ${bookTitle}`);
        }
      } else if (paragraphsError) {
        console.error(`Error fetching paragraphs: ${JSON.stringify(paragraphsError)}`);
      } else {
        console.warn(`No paragraphs found for the specified context`);
        bookContent = `Boek: ${bookTitle}`;
      }
    }
    
    // Create a prompt that uses the improved structure with explanations and dynamic question generation
    const systemPrompt = `Je bent een ervaren Nederlandse docent die gespecialiseerd is in sales en marketing. 
    Je taak is om uitstekende quizvragen te maken over het Basisboek Sales.
    
    Elke vraag moet uniek en informatief zijn, gericht op verschillende aspecten van sales en marketing.
    Vraag moeten diepgaand inzicht toetsen in de concepten en hun praktische toepassing.`;
    
    // User prompt rewritten based on the improved version from generate-quiz
    const userPrompt = `Genereer ${count} verschillende meerkeuzevragen over sales${bookContent ? ' gebaseerd op de volgende inhoud' : ''}.
    
    ${bookContent ? `Boektitel: ${bookTitle}\n\nInhoud:\n${bookContent}\n\n` : ''}
    
    Vereisten voor de vragen:
    1. Dynamisch aantal vragen: Op basis van de lengte en inhoud van de paragraaf. Kortere paragrafen krijgen minder vragen, langere paragrafen meer. Genereer maximaal ${count} vragen.
    2. Relevantie: De vragen moeten relevant zijn voor het onderwerp sales${bookContent ? ` en specifiek gaan over de inhoud van ${contextDescription}` : ''}
    3. Diepgang: De vragen moeten zowel feitelijke kennis als begrip testen (bijv. onderscheid tussen concepten, praktische toepassingen).
    4. Scenario-gebaseerde vragen: Enkele vragen moeten de stof in een realistische context plaatsen.
    5. Geen letterlijke kopie: De vragen moeten de stof testen zonder exacte zinnen uit de tekst over te nemen.
    6. Opties: Elke vraag moet vier duidelijke antwoordopties hebben (A, B, C, D), waarvan er precies één correct is.
    7. Uitgebreide uitleg: Naast het juiste antwoord moet ook worden uitgelegd waarom dit correct is en waarom de andere opties fout zijn.
    
    Retourneer de vragen in een JSON array met de volgende structuur:
    [
      {
        "question": "De vraag in het Nederlands",
        "options": ["A. Optie 1", "B. Optie 2", "C. Optie 3", "D. Optie 4"],
        "correct": "A" (of B, C, D afhankelijk van welk antwoord correct is),
        "explanation": "Uitleg waarom dit antwoord correct is en waarom de andere opties incorrect zijn."
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
        max_tokens: 2000, // Increased to allow for more questions and explanations
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
    
    // Validate and format each question
    questions = questions.filter(q => {
      const isValid = q && 
        typeof q.question === 'string' && 
        Array.isArray(q.options) && 
        q.options.length === 4 && 
        typeof q.correct === 'string' && 
        ["A", "B", "C", "D"].includes(q.correct) &&
        typeof q.explanation === 'string';
      
      if (!isValid) {
        console.warn('Filtered out invalid question:', JSON.stringify(q));
      }
      return isValid;
    });
    
    console.log(`Returning ${questions.length} questions`);

    // Create response object, include debug info if requested
    const responseObj: any = {
      success: true,
      questions: questions,
      context: {
        bookId,
        chapterId,
        paragraphId,
        bookTitle,
        contextDescription
      }
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
