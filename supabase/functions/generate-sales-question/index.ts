
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
    let isSpecificParagraph = false;
    let specificParagraphContent = "";
    
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
      if (paragraphId) {
        isSpecificParagraph = true;
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
        specificParagraphContent = specificParagraph.content;
        console.log("Specific paragraph content:", specificParagraphContent.substring(0, 100) + "...");
        
        // We still set bookContent for reference, but we won't use it for term extraction
        bookContent = `Hoofdstuk ${specificParagraph.chapter_number} (${specificParagraph.chapter_title}), Paragraaf ${specificParagraph.paragraph_number}:\n\n${specificParagraph.content}`;
        contextDescription = `paragraaf ${specificParagraph.paragraph_number} van hoofdstuk ${specificParagraph.chapter_number} van ${contextDescription}`;
        
        console.log(`Using content ONLY from paragraph ${specificParagraph.paragraph_number} (ID: ${paragraphId})`);
      }
      // If only chapterId is specified (no paragraphId), query all paragraphs from that chapter
      else if (chapterId) {
        // ... keep existing code
      }
      // Otherwise use a sample of paragraphs from the book
      else {
        // ... keep existing code
      }
    }
    
    // Extract bolded terms from the content
    if (isSpecificParagraph && specificParagraphContent) {
      // When it's a specific paragraph, ONLY extract terms from that paragraph's content
      allBoldedTerms = extractBoldedTerms(specificParagraphContent);
      // Double check that the terms actually appear in the paragraph content
      allBoldedTerms = allBoldedTerms.filter(term => specificParagraphContent.includes(term));
      console.log(`Extracted and filtered ${allBoldedTerms.length} bolded terms ONLY from the specific paragraph`);
      console.log("Terms extracted:", allBoldedTerms);
    } else {
      // Otherwise extract from all content
      allBoldedTerms = extractBoldedTerms(bookContent);
      console.log(`Extracted ${allBoldedTerms.length} bolded terms from all content`);
    }
    
    if (allBoldedTerms.length === 0) {
      console.log('No bolded terms found in content. Returning empty result.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Geen gemarkeerde termen gevonden in de geselecteerde inhoud',
          questions: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // When it's a specific paragraph, we should process all terms in one batch if there are few terms
    // This ensures we don't divide a small set of paragraph-specific terms into multiple batches
    let actualBatchSize = batchSize;
    if (isSpecificParagraph && allBoldedTerms.length <= 10) {
      console.log(`Using larger batch size for paragraph with ${allBoldedTerms.length} terms`);
      actualBatchSize = allBoldedTerms.length; // Process all terms in one go if it's a small paragraph
    }
    
    // Process terms in batches
    const termBatches = chunkArray(allBoldedTerms, actualBatchSize);
    console.log("Term batches:", termBatches);
    totalBatches = termBatches.length;
    
    // Get the terms for the requested batch
    boldedTermsToProcess = termBatches[batchIndex] || [];
    console.log("Processing terms in this batch:", boldedTermsToProcess);
    
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
    
    // Updated system prompt with more educational focus and requirements for better explanations
    const systemPrompt = `Je bent een AI gespecialiseerd in het genereren van educatieve meerkeuzevragen op HBO-niveau.
    Je creëert vragen die UITDAGEND en leerzaam zijn, met de nadruk op het testen van begrip, analyse, toepassing en evaluatie - niet alleen feitenkennis.
    
    BELANGRIJK: 
    1. ANTWOORDVERDELING: Zorg voor een EXACTE gelijke verdeling van juiste antwoorden - PRECIES 25% A, 25% B, 25% C en 25% D.
    2. De vragen moeten ECHT UITDAGEND zijn, geschikt voor HBO-niveau. Vermijd eenvoudige feitelijke vragen.
    3. Voor elke TERM maak je EXACT ÉÉN VRAAG (niet meer, niet minder).
    4. Je maakt de uitleg als volgt:
       - EERST: Een duidelijke definitie van het begrip (1-2 zinnen)
       - DAARNA: Waarom het correcte antwoord juist is (2-3 zinnen)
       - TENSLOTTE: Waarom elk incorrect antwoord onjuist is (1 zin per antwoord)
    
    Je antwoorden zijn altijd in correct JSON formaat, zonder markdown of andere opmaak.`;
    
    // Revised user prompt with emphasis on HBO-level challenging questions and better explanations
    let userPrompt;
    
    if (isSpecificParagraph && specificParagraphContent) {
      // When generating questions for a specific paragraph, use ONLY the paragraph content as context
      userPrompt = `
      Invoer:
      ${bookTitle ? `Boektitel: ${bookTitle}\n` : ''}
      ${contextDescription ? `Context: ${contextDescription}\n` : ''}
      
      Inhoud van specifieke paragraaf: ${specificParagraphContent}
      
      Genereer UITDAGENDE HBO-niveau vragen. MAAK EXACT ÉÉN VRAAG VOOR ELKE van deze begrippen uit deze paragraaf:
      ${boldedTermsToProcess.join(', ')}
      
      LET OP DE STRUCTUUR: In de paragraaf hebben termen vaak deze structuur:
      - Eerst komt het begrip in **vetgedrukt**
      - Dan volgt informatie over dit begrip
      - Daarna komt het volgende begrip
      
      Gebruik deze structuur om PRECIES te begrijpen wat elke term betekent.
      
      Vereisten voor de vragen:
      1. Maak EXACT ÉÉN vraag per begrip, niet meer en niet minder.
      2. UITDAGEND HBO-NIVEAU: Focus op toepassing, analyse en evaluatie, NIET op feitenkennis.
      3. Gebruik bij voorkeur een van deze vraagtypen:
         - TOEPASSING: "Een bedrijf wil [complexe situatie]. Hoe zou [begrip] hierbij toegepast moeten worden?"
         - ANALYSE: "Wat is de belangrijkste functie van [begrip] in het marketingplanningsproces?"
         - EVALUATIE: "Welke risicofactor is het meest kritisch bij de implementatie van [begrip]?"
         - SCENARIO: "Een organisatie heeft te maken met [complexe situatie]. Welke [begrip]-strategie is meest geschikt en waarom?"
      4. Maak de foute antwoorden GELOOFWAARDIG maar DUIDELIJK ONJUIST bij nadere analyse.
      5. ZEER BELANGRIJK - UITLEG STRUCTUUR:
         - BEGIN: Definitie van het concept (1-2 zinnen)
         - DAARNA: Uitleg waarom het juiste antwoord correct is (2-3 zinnen)
         - TENSLOTTE: Korte uitleg waarom de andere opties incorrect zijn (1 zin per optie)
      6. VERDEEL DE JUISTE ANTWOORDEN EXACT GELIJK: 25% A, 25% B, 25% C en 25% D.
      
      GEBRUIK ALLEEN INFORMATIE UIT DEZE SPECIFIEKE PARAGRAAF.
      
      Dit is batch ${batchIndex + 1} van ${totalBatches}, focus alleen op deze begrippen: ${boldedTermsToProcess.join(', ')}
      
      Retourneer de vragen in een JSON array met deze structuur:
      [
        {
          "question": "De vraag in het Nederlands",
          "options": ["A. Optie 1", "B. Optie 2", "C. Optie 3", "D. Optie 4"],
          "correct": "A" (of B, C, D afhankelijk van welk antwoord correct is),
          "explanation": "Uitleg waarom dit antwoord correct is en waarom de andere opties incorrect zijn."
        },
        ...meer vragen...
      ]
      
      BELANGRIJK:
      - Retourneer alleen de JSON-array
      - Maak EXACT ÉÉN vraag voor ELKE term in de lijst
      - Zorg voor GELIJKE VERDELING van juiste antwoorden (A, B, C, D)`;
    } else {
      // For non-specific paragraphs, use the updated format with better explanations
      userPrompt = `
      Invoer:
      ${bookTitle ? `Boektitel: ${bookTitle}\n` : ''}
      ${contextDescription ? `Context: ${contextDescription}\n` : ''}
      
      Inhoud: ${bookContent}
      
      Genereer UITDAGENDE HBO-niveau vragen. MAAK EXACT ÉÉN VRAAG VOOR ELK van deze begrippen uit de tekst:
      ${boldedTermsToProcess.join(', ')}
      
      LET OP DE STRUCTUUR: In de tekst hebben termen vaak deze structuur:
      - Eerst komt het begrip in **vetgedrukt**
      - Dan volgt informatie over dit begrip
      - Daarna komt het volgende begrip
      
      Gebruik deze structuur om PRECIES te begrijpen wat elke term betekent.
      
      Vereisten voor de vragen:
      1. Maak EXACT ÉÉN vraag per begrip, niet meer en niet minder.
      2. UITDAGEND HBO-NIVEAU: Focus op toepassing, analyse en evaluatie, NIET op feitenkennis.
      3. Gebruik bij voorkeur een van deze vraagtypen:
         - TOEPASSING: "Een bedrijf wil [complexe situatie]. Hoe zou [begrip] hierbij toegepast moeten worden?"
         - ANALYSE: "Wat is de belangrijkste functie van [begrip] in het marketingplanningsproces?"
         - EVALUATIE: "Welke risicofactor is het meest kritisch bij de implementatie van [begrip]?"
         - SCENARIO: "Een organisatie heeft te maken met [complexe situatie]. Welke [begrip]-strategie is meest geschikt en waarom?"
      4. Maak de foute antwoorden GELOOFWAARDIG maar DUIDELIJK ONJUIST bij nadere analyse.
      5. ZEER BELANGRIJK - UITLEG STRUCTUUR:
         - BEGIN: Definitie van het concept (1-2 zinnen)
         - DAARNA: Uitleg waarom het juiste antwoord correct is (2-3 zinnen)
         - TENSLOTTE: Korte uitleg waarom de andere opties incorrect zijn (1 zin per optie)
      6. VERDEEL DE JUISTE ANTWOORDEN EXACT GELIJK: 25% A, 25% B, 25% C en 25% D.
      
      Dit is batch ${batchIndex + 1} van ${totalBatches}, focus alleen op deze begrippen: ${boldedTermsToProcess.join(', ')}
      
      Retourneer de vragen in een JSON array met deze structuur:
      [
        {
          "question": "De vraag in het Nederlands",
          "options": ["A. Optie 1", "B. Optie 2", "C. Optie 3", "D. Optie 4"],
          "correct": "A" (of B, C, D afhankelijk van welk antwoord correct is),
          "explanation": "Uitleg waarom dit antwoord correct is en waarom de andere opties incorrect zijn."
        },
        ...meer vragen...
      ]
      
      BELANGRIJK:
      - Retourneer alleen de JSON-array
      - Maak EXACT ÉÉN vraag voor ELKE term in de lijst
      - Zorg voor GELIJKE VERDELING van juiste antwoorden (A, B, C, D)`;
    }
    
    // Log the prompt for debugging
    if (debug) {
      console.log("User prompt to OpenAI:", userPrompt.substring(0, 500) + "...");
    }
    
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
    
    // Validate that questions only contain terms from the specified paragraph when required
    if (isSpecificParagraph && specificParagraphContent) {
      const originalQuestionsCount = questions.length;
      
      // Check if each question is actually about the terms we requested
      questions = questions.filter(q => {
        // Check if any of the terms we're processing appear in the question
        const containsRelevantTerm = boldedTermsToProcess.some(term => 
          q.question.toLowerCase().includes(term.toLowerCase()) ||
          q.explanation.toLowerCase().includes(term.toLowerCase())
        );
        
        if (!containsRelevantTerm) {
          console.warn('Filtered out question not related to requested terms:', q.question);
        }
        
        return containsRelevantTerm;
      });
      
      if (questions.length < originalQuestionsCount) {
        console.log(`Filtered out ${originalQuestionsCount - questions.length} questions not related to the specified terms`);
      }
    }
    
    // Verify answer distribution (new validation)
    if (questions.length >= 4) {
      // Count correct answers by letter
      const correctAnswerCounts = {
        'A': 0,
        'B': 0,
        'C': 0,
        'D': 0
      };
      
      questions.forEach(q => {
        correctAnswerCounts[q.correct]++;
      });
      
      console.log('Answer distribution:', correctAnswerCounts);
      
      // If there's a significant imbalance, log it (we don't want to filter questions at this point)
      const expectedCount = questions.length / 4;
      const isBalanced = Object.values(correctAnswerCounts).every(count => 
        Math.abs(count - expectedCount) <= 1
      );
      
      if (!isBalanced) {
        console.log('Warning: Answer distribution is not balanced:', correctAnswerCounts);
      }
    }
    
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
        boldedTermsCount: allBoldedTerms.length,
        isSpecificParagraph
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
        },
        answerDistribution: {
          'A': questions.filter(q => q.correct === 'A').length,
          'B': questions.filter(q => q.correct === 'B').length,
          'C': questions.filter(q => q.correct === 'C').length,
          'D': questions.filter(q => q.correct === 'D').length
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
