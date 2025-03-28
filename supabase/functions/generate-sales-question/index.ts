
// @deno-types="https://deno.land/x/xhr@0.1.0/mod.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract bolded terms from content
function extractBoldedTerms(content: string): string[] {
  const boldPattern = /\*\*(.*?)\*\*/g;
  const matches = content.match(boldPattern);
  
  if (!matches) return [];
  
  // Clean up the matches to remove the ** markers
  return matches.map(match => match.replace(/\*\*/g, '').trim())
    .filter(term => term.length > 0);
}

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
      count = 0, // Setting count to 0 means no limit - we'll generate questions for all bolded terms
      bookId,
      chapterId,
      paragraphId,
      debug = false,
      showProcessDetails = false // New parameter to control streaming process details
    } = requestData;
    
    console.log(`Generating sales questions with context:`, {
      bookId: bookId || 'not specified',
      chapterId: chapterId || 'not specified',
      paragraphId: paragraphId || 'not specified',
      requestedCount: count
    });
    
    // Fetch book content if bookId is provided
    let bookContent = "";
    let bookTitle = "";
    let contextDescription = "";
    let boldedTerms: string[] = [];
    
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
      
      // IMPORTANT FIX: If paragraphId is specified, we need to query by ID, not by paragraph_number
      let paragraphs;
      let paragraphsError;
      
      if (paragraphId && chapterId) {
        // First get the specific paragraph by its ID
        console.log(`Fetching specific paragraph with ID: ${paragraphId}`);
        const { data: specificParagraph, error: specificError } = await supabase
          .from('books')
          .select('content, chapter_number, paragraph_number, chapter_title')
          .eq('id', paragraphId)
          .maybeSingle();
        
        if (specificError) {
          console.error(`Error fetching specific paragraph: ${JSON.stringify(specificError)}`);
          paragraphsError = specificError;
        } else if (!specificParagraph) {
          console.error(`No paragraph found with ID: ${paragraphId}`);
          paragraphsError = new Error(`No paragraph found with ID: ${paragraphId}`);
        } else {
          paragraphs = [specificParagraph];
          contextDescription = `paragraaf ${specificParagraph.paragraph_number} van ${contextDescription}`;
          console.log(`Found paragraph ${specificParagraph.paragraph_number} with ID ${paragraphId}`);
        }
      } else {
        // Get all paragraphs for the chapter
        const result = await query
          .order('chapter_number', { ascending: true })
          .order('paragraph_number', { ascending: true });
        
        paragraphs = result.data;
        paragraphsError = result.error;
      }
      
      if (!paragraphsError && paragraphs && paragraphs.length > 0) {
        // If there's paragraph-specific content, use it
        if (paragraphId && paragraphs.length === 1) {
          const paragraph = paragraphs[0];
          bookContent = `Hoofdstuk ${paragraph.chapter_number} (${paragraph.chapter_title}), Paragraaf ${paragraph.paragraph_number}:\n\n${paragraph.content}`;
          console.log(`Using content from paragraph ${paragraph.paragraph_number} (ID: ${paragraphId})`);
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
    
    // Extract bolded terms from the content
    boldedTerms = extractBoldedTerms(bookContent);
    console.log(`Extracted ${boldedTerms.length} bolded terms from content`);
    
    // Check if we extracted a reasonable number of terms
    if (boldedTerms.length > 30) {
      console.log(`Warning: Large number of bolded terms (${boldedTerms.length}), performance may be affected`);
    }
    
    // Updated system prompt with more educational focus
    const systemPrompt = `Je bent een AI gespecialiseerd in het genereren van educatieve meerkeuzevragen om gebruikers volledig inzicht te geven in sales en marketing concepten. 
    Je genereert vragen die zowel uitdagend als leerzaam zijn, en die studenten helpen de stof beter te begrijpen.
    Je antwoorden zijn altijd in correct JSON formaat, zonder markdown of andere opmaak.`;
    
    // Completely revised user prompt based on user's analysis
    const userPrompt = `
    Invoer:
    ${bookTitle ? `Boektitel: ${bookTitle}\n` : ''}
    ${contextDescription ? `Context: ${contextDescription}\n` : ''}
    
    Inhoud: ${bookContent}
    
    Genereer een uitgebreide set vragen op basis van de meegeleverde tekst. Identificeer alle gemarkeerde kernbegrippen (aangeduid met ** ** ) en maak voor elk begrip minimaal één vraag. Zorg ervoor dat de vragen zowel kennis als begrip en toepassing testen, en niet alleen maar feiten reproduceren.
    
    Vereisten voor de vragen:
    1. Volledige dekking: Identificeer en verwerk ALLE gemarkeerde begrippen (** ** ), zonder limiet aan het aantal vragen. 
    2. HBO-niveau: Maak uitdagende vragen die begrip en toepassing testen, niet alleen feitenkennis.
    3. Variatie in vraagtypen:
       - Kennisvragen: "Wat betekent [begrip]?"
       - Vergelijkingsvragen: "Wat is het verschil tussen [begrip A] en [begrip B]?"
       - Toepassingsvragen: "In welke situatie zou je [begrip] toepassen?"
       - Scenariovragen: "Een bedrijf heeft te maken met [situatie]. Welk [begrip] is hier van toepassing?"
    4. Geen letterlijke kopie: Gebruik de tekst als context, maar neem geen zinnen letterlijk over.
    5. Opties: Elke vraag moet vier duidelijke antwoordopties hebben (A, B, C, D), waarvan er precies één correct is.
    6. Uitgebreide uitleg: Leg uit waarom het correcte antwoord juist is en waarom de andere opties fout zijn.
    
    Zorg dat je zeker een vraag maakt voor elk van deze gemarkeerde begrippen:
    ${boldedTerms.join(', ')}
    
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
    
    Belangrijk:
    - Retourneer alleen de JSON-array, zonder extra uitleg of inleidende tekst.
    - Beperk het aantal vragen NIET; genereer zoveel vragen als nodig om alle gemarkeerde begrippen (** ** ) te dekken.
    - Zorg dat elke vraag nauwkeurig past bij het niveau en de context van het lesmateriaal.
    - Gebruik de begrippen zoals ze zijn gedefinieerd in de tekst, maar formuleer de vragen in je eigen woorden.`;
    
    // Calculate estimated token count to help debug potential OpenAI token limit issues
    const estimatedPromptTokens = (systemPrompt.length + userPrompt.length) / 4;
    console.log(`Estimated prompt tokens: ${Math.ceil(estimatedPromptTokens)}`);
    
    // Dynamically adjust max tokens based on content size
    const numberOfTerms = boldedTerms.length;
    // Base token count + additional tokens per term
    const requiredTokens = 2000 + (numberOfTerms * 300);
    // Cap at OpenAI's max limit for gpt-4o
    const maxTokens = Math.min(requiredTokens, 8000);
    
    console.log(`Using max_tokens: ${maxTokens} for ${numberOfTerms} terms`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using the most capable model for complex question generation
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
        max_tokens: maxTokens,
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
          console.error('Raw content that failed to parse:', jsonMatch[0].substring(0, 200) + '...');
          throw new Error('Failed to parse question data');
        }
      } else {
        console.error('No JSON content found in response');
        console.error('Raw response content:', content.substring(0, 200) + '...');
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
    
    console.log(`Generated ${questions.length} questions for ${boldedTerms.length} bolded terms`);
    
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
    
    console.log(`Returning ${questions.length} questions after validation`);

    // Create response object, include debug info if requested
    const responseObj: any = {
      success: true,
      questions: questions,
      context: {
        bookId,
        chapterId,
        paragraphId,
        bookTitle,
        contextDescription,
        boldedTermsCount: boldedTerms.length
      }
    };
    
    // Add debug information if requested
    if (debug) {
      responseObj.debug = {
        prompt: userPrompt,
        response: data.choices[0].message,
        extractedTerms: boldedTerms,
        tokenEstimates: {
          promptTokens: Math.ceil(estimatedPromptTokens),
          requestedMaxTokens: maxTokens
        }
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
