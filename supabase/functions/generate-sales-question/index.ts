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

// Split an array into chunks of a specified size
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
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
      bookId,
      chapterId,
      paragraphId,
      batchSize = 5, // Default batch size of 5 terms
      batchIndex = 0, // Which batch to process (0-based index)
      debug = false,
      showProcessDetails = false // Parameter to control streaming process details
    } = requestData;
    
    console.log(`Generating sales questions with context:`, {
      bookId: bookId || 'not specified',
      chapterId: chapterId || 'not specified',
      paragraphId: paragraphId || 'not specified',
      batchSize,
      batchIndex
    });
    
    // Fetch book content if bookId is provided
    let bookContent = "";
    let bookTitle = "";
    let contextDescription = "";
    let allBoldedTerms: string[] = [];
    let totalBatches = 0;
    let boldedTermsToProcess: string[] = [];
    
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
      
      // If paragraphId is specified, query ONLY by this specific ID
      // This is the key change to focus quiz generation on a single paragraph
      if (paragraphId) {
        console.log(`Fetching specific paragraph with ID: ${paragraphId}`);
        const { data: specificParagraph, error: specificError } = await supabase
          .from('books')
          .select('content, chapter_number, paragraph_number, chapter_title')
          .eq('id', paragraphId)
          .maybeSingle();
        
        if (specificError) {
          console.error(`Error fetching specific paragraph: ${JSON.stringify(specificError)}`);
          throw new Error(`Error fetching paragraph: ${specificError.message}`);
        }
        
        if (!specificParagraph) {
          console.error(`No paragraph found with ID: ${paragraphId}`);
          throw new Error(`No paragraph found with ID: ${paragraphId}`);
        }
        
        // Set content to ONLY this paragraph's content
        bookContent = `Hoofdstuk ${specificParagraph.chapter_number} (${specificParagraph.chapter_title}), Paragraaf ${specificParagraph.paragraph_number}:\n\n${specificParagraph.content}`;
        contextDescription = `paragraaf ${specificParagraph.paragraph_number} van hoofdstuk ${specificParagraph.chapter_number} van ${contextDescription}`;
        
        console.log(`Using content ONLY from paragraph ${specificParagraph.paragraph_number} (ID: ${paragraphId})`);
      }
      // If only chapterId is specified (no paragraphId), query all paragraphs from that chapter
      else if (chapterId) {
        const { data: paragraphs, error: paragraphsError } = await supabase
          .from('books')
          .select('content, chapter_number, paragraph_number, chapter_title')
          .eq('book_title', bookTitle)
          .eq('chapter_number', chapterId)
          .order('paragraph_number', { ascending: true });
        
        if (paragraphsError) {
          console.error(`Error fetching paragraphs: ${JSON.stringify(paragraphsError)}`);
          throw new Error(`Error fetching paragraphs: ${paragraphsError.message}`);
        }
        
        if (!paragraphs || paragraphs.length === 0) {
          console.error(`No paragraphs found for chapter ${chapterId}`);
          throw new Error(`No paragraphs found for chapter ${chapterId}`);
        }
        
        bookContent = paragraphs.map(p => 
          `Paragraaf ${p.paragraph_number}: ${p.content}`
        ).join('\n\n');
        contextDescription = `hoofdstuk ${chapterId} van ${contextDescription}`;
        
        console.log(`Fetched ${paragraphs.length} paragraphs from chapter ${chapterId}`);
      }
      // Otherwise use a sample of paragraphs from the book
      else {
        const { data: paragraphs, error: paragraphsError } = await supabase
          .from('books')
          .select('content, chapter_number, paragraph_number, chapter_title')
          .eq('book_title', bookTitle)
          .order('chapter_number', { ascending: true })
          .order('paragraph_number', { ascending: true })
          .limit(20); // Get a reasonable sample
        
        if (paragraphsError) {
          console.error(`Error fetching paragraphs: ${JSON.stringify(paragraphsError)}`);
          throw new Error(`Error fetching paragraphs: ${paragraphsError.message}`);
        }
        
        bookContent = paragraphs?.map(p => 
          `Hoofdstuk ${p.chapter_number}, Paragraaf ${p.paragraph_number}: ${p.content}`
        ).join('\n\n') || `Boek: ${bookTitle}`;
        
        console.log(`Fetched ${paragraphs?.length || 0} paragraphs for book: ${bookTitle}`);
      }
    }
    
    // Extract bolded terms from the content
    allBoldedTerms = extractBoldedTerms(bookContent);
    console.log(`Extracted ${allBoldedTerms.length} bolded terms from content`);
    
    // Check if we extracted a reasonable number of terms
    if (allBoldedTerms.length > 30) {
      console.log(`Processing large number of bolded terms (${allBoldedTerms.length}) in batches`);
    }
    
    // Process terms in batches
    const termBatches = chunkArray(allBoldedTerms, batchSize);
    totalBatches = termBatches.length;
    
    // Get the terms for the requested batch
    boldedTermsToProcess = termBatches[batchIndex] || [];
    
    if (boldedTermsToProcess.length === 0) {
      console.log(`No terms found for batch ${batchIndex}. Total batches: ${totalBatches}`);
      return new Response(
        JSON.stringify({
          success: true,
          questions: [],
          metadata: {
            batchIndex,
            totalBatches,
            totalTerms: allBoldedTerms.length,
            processedTerms: 0,
            batchSize,
            isLastBatch: batchIndex >= totalBatches - 1
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing batch ${batchIndex + 1}/${totalBatches} with ${boldedTermsToProcess.length} terms`);
    
    // Updated system prompt with more educational focus and balanced answer distribution
    const systemPrompt = `Je bent een AI gespecialiseerd in het genereren van educatieve meerkeuzevragen om gebruikers volledig inzicht te geven in sales en marketing concepten. 
    Je genereert vragen die zowel uitdagend als leerzaam zijn, en die studenten helpen de stof beter te begrijpen.
    
    BELANGRIJK: Zorg voor een evenwichtige verdeling van juiste antwoorden - ongeveer 25% A, 25% B, 25% C en 25% D. Wissel de correcte antwoorden door elkaar zodat er geen voorspelbaar patroon is, maar houd de distributie zo gelijk mogelijk.
    
    Je antwoorden zijn altijd in correct JSON formaat, zonder markdown of andere opmaak.`;
    
    // Revised user prompt
    const userPrompt = `
    Invoer:
    ${bookTitle ? `Boektitel: ${bookTitle}\n` : ''}
    ${contextDescription ? `Context: ${contextDescription}\n` : ''}
    
    Inhoud: ${bookContent}
    
    Genereer een uitgebreide set vragen over de volgende specifieke begrippen uit de tekst.
    
    Vereisten voor de vragen:
    1. Maak voor ELK van deze termen minimaal één vraag: ${boldedTermsToProcess.join(', ')}
    2. HBO-niveau: Maak uitdagende vragen die begrip en toepassing testen, niet alleen feitenkennis.
    3. Variatie in vraagtypen:
       - Kennisvragen: "Wat betekent [begrip]?"
       - Vergelijkingsvragen: "Wat is het verschil tussen [begrip A] en [begrip B]?"
       - Toepassingsvragen: "In welke situatie zou je [begrip] toepassen?"
       - Scenariovragen: "Een bedrijf heeft te maken met [situatie]. Welk [begrip] is hier van toepassing?"
    4. Geen letterlijke kopie: Gebruik de tekst als context, maar neem geen zinnen letterlijk over.
    5. Opties: Elke vraag moet vier duidelijke antwoordopties hebben (A, B, C, D), waarvan er precies één correct is.
    6. Evenwichtige verdeling: Zorg voor een gelijke verdeling van correcte antwoorden (A, B, C, D) over alle vragen.
    7. Uitgebreide uitleg: Leg uit waarom het correcte antwoord juist is en waarom de andere opties fout zijn.
    
    Dit is batch ${batchIndex + 1} van ${totalBatches}, focus alleen op deze begrippen: ${boldedTermsToProcess.join(', ')}
    
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
    - Maak alleen vragen voor de specifiek genoemde begrippen in deze batch.
    - Zorg dat elke vraag nauwkeurig past bij het niveau en de context van het lesmateriaal.
    - Gebruik de begrippen zoals ze zijn gedefinieerd in de tekst, maar formuleer de vragen in je eigen woorden.
    - Verdeel de juiste antwoorden (A, B, C, D) gelijkmatig over alle vragen.`;
    
    // Calculate estimated token count to help debug potential OpenAI token limit issues
    const estimatedPromptTokens = (systemPrompt.length + userPrompt.length) / 4;
    console.log(`Estimated prompt tokens: ${Math.ceil(estimatedPromptTokens)}`);
    
    // Dynamically adjust max tokens based on batch size
    // Base token count + additional tokens per term
    const requiredTokens = 1000 + (boldedTermsToProcess.length * 500);
    // Cap at OpenAI's max limit for gpt-4o
    const maxTokens = Math.min(requiredTokens, 4000);
    
    console.log(`Using max_tokens: ${maxTokens} for batch of ${boldedTermsToProcess.length} terms`);
    
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
    
    console.log(`Generated ${questions.length} questions for batch of ${boldedTermsToProcess.length} terms`);
    
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
      metadata: {
        batchIndex,
        totalBatches,
        totalTerms: allBoldedTerms.length,
        processedTerms: boldedTermsToProcess.length,
        batchSize,
        isLastBatch: batchIndex >= totalBatches - 1
      },
      context: {
        bookId,
        chapterId,
        paragraphId,
        bookTitle,
        contextDescription,
        boldedTermsCount: allBoldedTerms.length
      }
    };
    
    // Add debug information if requested
    if (debug) {
      responseObj.debug = {
        prompt: userPrompt,
        response: data.choices[0].message,
        extractedTerms: allBoldedTerms,
        batchTerms: boldedTermsToProcess,
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
