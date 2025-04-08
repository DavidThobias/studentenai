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

// Function to ensure there's an equal distribution of answers
function balanceAnswerDistribution(questions: any[]): any[] {
  if (questions.length < 4) return questions;
  
  // Count the number of each answer
  const answerCounts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
  questions.forEach(q => {
    if (q.correct && ['A', 'B', 'C', 'D'].includes(q.correct)) {
      answerCounts[q.correct]++;
    }
  });
  
  console.log('Initial answer distribution:', answerCounts);
  
  // Determine the target count for each answer
  const targetCount = Math.ceil(questions.length / 4);
  
  // Find answers that are over-represented and under-represented
  const overRepresented = Object.entries(answerCounts)
    .filter(([_, count]) => (count as number) > targetCount)
    .map(([letter]) => letter);
  
  const underRepresented = Object.entries(answerCounts)
    .filter(([_, count]) => (count as number) < targetCount)
    .map(([letter]) => letter);
  
  if (overRepresented.length === 0 || underRepresented.length === 0) {
    return questions; // No rebalancing needed
  }
  
  console.log(`Need to rebalance: over-represented=${overRepresented.join(',')}, under-represented=${underRepresented.join(',')}`);
  
  // Clone questions to avoid modifying the original array
  const balancedQuestions = [...questions];
  
  // Start with questions that have the over-represented answers
  let overRepIndex = 0;
  let underRepIndex = 0;
  
  for (let i = 0; i < balancedQuestions.length; i++) {
    const q = balancedQuestions[i];
    
    // If this question has an over-represented answer
    if (overRepresented.includes(q.correct)) {
      // And there are still under-represented answers to use
      if (underRepIndex < underRepresented.length) {
        const newAnswerLetter = underRepresented[underRepIndex];
        
        // We need to adjust both the correct answer and the options order
        const oldAnswerIndex = q.correct.charCodeAt(0) - 65; // Convert A, B, C, D to 0, 1, 2, 3
        const newAnswerIndex = newAnswerLetter.charCodeAt(0) - 65;
        
        console.log(`Rebalancing question ${i}: changing correct from ${q.correct} to ${newAnswerLetter}`);
        
        // Save the original correct option and its content
        const correctOption = q.options[oldAnswerIndex];
        
        // Swap options - move the correct option to the new position
        q.options[oldAnswerIndex] = q.options[newAnswerIndex];
        q.options[newAnswerIndex] = correctOption;
        
        // Update the correct answer
        q.correct = newAnswerLetter;
        
        // IMPORTANT: Update explanation to reflect the new option ordering
        // This prevents the explanation from referencing the wrong options
        if (q.explanation) {
          // Replace specific option references like "Option A", "Option B", etc.
          const optionLetters = ['A', 'B', 'C', 'D'];
          
          // Create a mapping of old positions to new positions
          const optionMap = optionLetters.reduce((map, letter, index) => {
            if (index === oldAnswerIndex) {
              // The previously correct option moved to newAnswerIndex
              map[letter] = optionLetters[newAnswerIndex];
            } else if (index === newAnswerIndex) {
              // The option that was at newAnswerIndex moved to oldAnswerIndex
              map[letter] = optionLetters[oldAnswerIndex];
            } else {
              // Other options stay the same
              map[letter] = letter;
            }
            return map;
          }, {} as Record<string, string>);
          
          // Apply the mapping to update option references in the explanation
          for (const [oldLetter, newLetter] of Object.entries(optionMap)) {
            if (oldLetter !== newLetter) {
              // Replace references like "Option A", "Optie A", etc.
              const patterns = [
                new RegExp(`[Oo]ptie ${oldLetter}\\b`, 'g'),
                new RegExp(`[Oo]ption ${oldLetter}\\b`, 'g'),
                new RegExp(`[Aa]ntwoord ${oldLetter}\\b`, 'g'),
                new RegExp(`[Aa]nswer ${oldLetter}\\b`, 'g')
              ];
              
              for (const pattern of patterns) {
                q.explanation = q.explanation.replace(pattern, (match) => 
                  match.replace(oldLetter, newLetter)
                );
              }
            }
          }
        }
        
        // Move to the next under-represented answer
        underRepIndex++;
        
        // Decrease count for the previous answer, increase for the new one
        answerCounts[overRepresented[overRepIndex]]--;
        answerCounts[newAnswerLetter]++;
        
        // If we've fixed this over-represented answer, move to the next one
        if (answerCounts[overRepresented[overRepIndex]] <= targetCount) {
          overRepIndex++;
          if (overRepIndex >= overRepresented.length) break;
        }
      }
    }
  }
  
  console.log('Balanced answer distribution:', {
    A: balancedQuestions.filter(q => q.correct === 'A').length,
    B: balancedQuestions.filter(q => q.correct === 'B').length,
    C: balancedQuestions.filter(q => q.correct === 'C').length,
    D: balancedQuestions.filter(q => q.correct === 'D').length
  });
  
  return balancedQuestions;
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
      showProcessDetails = false,
      questionsPerObjective = 3 // Explicitly limit to 3 questions per objective
    } = requestData;
    
    console.log(`Generating sales questions with context:`, {
      bookId: bookId || 'not specified',
      chapterId: chapterId || 'not specified',
      paragraphId: paragraphId || 'not specified',
      batchSize,
      batchIndex,
      questionsPerObjective
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
        console.log(`Fetching all paragraphs from chapter with ID: ${chapterId}`);
        const { data: chapterParagraphs, error: chapterError } = await supabase
          .from('books')
          .select('content, chapter_number, paragraph_number')
          .eq('book_id', bookId)
          .eq('chapter_id', chapterId);
        
        if (chapterError) {
          console.error(`Error fetching paragraphs for chapter: ${JSON.stringify(chapterError)}`);
          throw new Error(`Error fetching paragraphs for chapter: ${chapterError.message}`);
        }
        
        if (!chapterParagraphs || chapterParagraphs.length === 0) {
          console.warn(`No paragraphs found for chapter ID: ${chapterId}`);
        } else {
          // Concatenate all paragraph contents from the chapter
          bookContent = chapterParagraphs.map(p => `Paragraaf ${p.chapter_number}.${p.paragraph_number}:\n\n${p.content}`).join('\n\n');
          contextDescription = `hoofdstuk van ${contextDescription}`;
          console.log(`Using content from chapter ${chapterId} with ${chapterParagraphs.length} paragraphs`);
        }
      }
      // Otherwise use a sample of paragraphs from the book
      else {
        console.log(`Fetching a sample of paragraphs from book with ID: ${bookId}`);
        const { data: bookParagraphs, error: bookError } = await supabase
          .from('books')
          .select('content, chapter_number, paragraph_number')
          .eq('book_id', bookId)
          .limit(50); // Limit to a reasonable number of paragraphs
        
        if (bookError) {
          console.error(`Error fetching paragraphs for book: ${JSON.stringify(bookError)}`);
          throw new Error(`Error fetching paragraphs for book: ${bookError.message}`);
        }
        
        if (!bookParagraphs || bookParagraphs.length === 0) {
          console.warn(`No paragraphs found for book ID: ${bookId}`);
        } else {
          // Concatenate all paragraph contents from the book
          bookContent = bookParagraphs.map(p => `Hoofdstuk ${p.chapter_number}, Paragraaf ${p.paragraph_number}:\n\n${p.content}`).join('\n\n');
          console.log(`Using content from book ${bookId} with ${bookParagraphs.length} paragraphs`);
        }
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

    // Updated system prompt with stronger focus on application questions
    const systemPrompt = `Je bent een AI gespecialiseerd in het genereren van uitdagende meerkeuzevragen op HBO-niveau.
    Creëer vragen die UITSLUITEND TOEPASSINGSGERICHT zijn en kritisch denken vereisen. Test uitsluitend hoger-orde vaardigheden zoals analyse, toepassing en evaluatie.
    
    BELANGRIJKSTE VEREISTEN:
    1. UITSLUITEND TOEPASSINGSGERICHTE VRAGEN: Genereer ALLEEN vragen die de toepassing van kennis in praktische scenario's testen. GEEN begripsvragen of definitievragen.
    2. ELKE VRAAG BEGINT MET EEN CASUS: Begin elke vraag met een realistische praktijksituatie waarin kennis moet worden toegepast.
    3. SUBTIEL ONJUISTE ANTWOORDEN: Maak afleidende opties die GELOOFWAARDIG maar SUBTIEL ONJUIST zijn, bijvoorbeeld:
       - Deels waar maar onvolledig in deze specifieke situatie
       - Te breed of te specifiek voor het gegeven scenario
       - Juiste redenering maar onjuiste conclusie in deze context
       - Verward met verwante concepten die in andere situaties juist zouden zijn
    4. COMPLEXE SCENARIO'S: Gebruik realistische bedrijfscontexten die meerdere concepten integreren.
    5. GEVARIEERDE VRAAGTYPEN: Inclusief berekeningen, tabellen, en afbeeldinginterpretatie waar relevant.
    6. ANTWOORDVERDELING: Zorg voor gelijke verdeling van juiste antwoorden (25% A, 25% B, 25% C, 25% D).
    
    Voor elke TERM maak je EXACT ÉÉN vraag die:
    - De toepassing van het concept in een praktijksituatie test
    - Verwarring kan veroorzaken met aanverwante toepassingen
    - Beroep doet op kritisch denken en analyse van de situatie`;

    // Revised user prompt for application-focused questions
    let userPrompt;
    
    if (isSpecificParagraph && specificParagraphContent) {
      // When generating questions for a specific paragraph, use ONLY the paragraph content as context
      userPrompt = `
      Invoer:
      ${bookTitle ? `Boektitel: ${bookTitle}\n` : ''}
      ${contextDescription ? `Context: ${contextDescription}\n` : ''}
      
      Inhoud van specifieke paragraaf: ${specificParagraphContent}
      
      Genereer UITSLUITEND TOEPASSINGSGERICHTE vragen op HBO-niveau. MAAK EXACT ${questionsPerObjective} VRAAG VOOR ELKE van deze begrippen uit deze paragraaf:
      ${boldedTermsToProcess.join(', ')}
      
      VRAAGVEREISTEN:
      1. 100% PRAKTIJK GEORIËNTEERD: Elke vraag MOET een realistische business case of scenario bevatten en testen of de student het concept kan TOEPASSEN, NIET OF ZE HET BEGRIJPEN OF KENNEN.
      2. GEEN DEFINITIE- OF BEGRIPSVRAGEN: Absoluut GEEN vragen stellen als "Wat betekent X?" of "Welke definitie past bij X?".
      3. SIMULEER WERKSITUATIES: Plaats de student in een rol (marketeer, verkoper, manager) die beslissingen moet nemen.
      4. SUBTIEL ONDERSCHEID: Het verschil tussen juiste en onjuiste antwoorden moet subtiel zijn binnen de context.
      5. GEÏNTEGREERDE KENNIS: Vraag naar het toepassen van relaties tussen concepten in praktijksituaties.
      
      VOORBEELDSTRUCTUUR VOOR VRAGEN:
      "Een marketingmanager bij een B2B-bedrijf merkt dat de conversie van leads naar klanten achterblijft. Welke salesgerichte aanpak zou in deze situatie het meest effectief zijn?"
      
      FOUTE ANTWOORDOPTIES:
      - Gebruik GEEN duidelijk foute antwoorden
      - Maak OPTIES DIE BIJNA JUIST ZIJN maar subtiel onjuist in de beschreven context, bijvoorbeeld:
        * In een andere situatie correct, maar niet in deze specifieke casus
        * Juiste strategie maar verkeerde timing of omstandigheden
        * Te drastisch of te voorzichtig voor het beschreven probleem
      
      UITLEGSTRUCTUUR (beknopt):
      1. Uitleg van hoe het concept in deze situatie toegepast moet worden (1 zin)
      2. Waarom het juiste antwoord correct is in deze specifieke situatie (1-2 zinnen)
      3. Korte uitleg waarom de andere opties incorrect zijn in deze context (1 zin voor alle opties samen)
      
      BELANGRIJK: Vermijd in de uitleg te refereren naar specifieke optie-letters (A, B, C, D) of de exacte tekst van een optie, omdat de volgorde kan wijzigen. Gebruik algemene termen als "het juiste antwoord" en "de onjuiste opties".
      
      Dit is batch ${batchIndex + 1} van ${totalBatches}, focus alleen op deze begrippen: ${boldedTermsToProcess.join(', ')}
      
      Retourneer de vragen in een JSON array met deze structuur:
      [
        {
          "question": "De vraag in het Nederlands, inclusief een praktijkscenario",
          "options": ["Optie 1 (bijna juist maar subtiel onjuist)", "Optie 2", "Optie 3", "Optie 4"],
          "correct": "A" (of B, C, D afhankelijk van welk antwoord correct is),
          "explanation": "Uitleg over het concept en waarom het antwoord correct is."
        },
        ...meer vragen...
      ]
      
      BELANGRIJK:
      - Maak EXACT ÉÉN vraag per begrip
      - Zorg voor GELIJKE VERDELING van juiste antwoorden (A, B, C, D)
      - Genereer UITSLUITEND vragen die TOEPASSING testen, NOOIT begripsvragen`;
    } else {
      // For non-specific paragraphs, use a similar but adapted format
      userPrompt = `
      Invoer:
      ${bookTitle ? `Boektitel: ${bookTitle}\n` : ''}
      ${contextDescription ? `Context: ${contextDescription}\n` : ''}
      
      Inhoud: ${bookContent}
      
      Genereer UITSLUITEND TOEPASSINGSGERICHTE vragen op HBO-niveau. MAAK EXACT ${questionsPerObjective} VRAAG VOOR ELK van deze begrippen uit de tekst:
      ${boldedTermsToProcess.join(', ')}
      
      VRAAGVEREISTEN:
      1. 100% PRAKTIJK GEORIËNTEERD: Elke vraag MOET een realistische business case of scenario bevatten en testen of de student het concept kan TOEPASSEN, NIET OF ZE HET BEGRIJPEN OF KENNEN.
      2. GEEN DEFINITIE- OF BEGRIPSVRAGEN: Absoluut GEEN vragen stellen als "Wat betekent X?" of "Welke definitie past bij X?".
      3. SIMULEER WERKSITUATIES: Plaats de student in een rol (marketeer, verkoper, manager) die beslissingen moet nemen.
      4. SUBTIEL ONDERSCHEID: Het verschil tussen juiste en onjuiste antwoorden moet subtiel zijn binnen de context.
      5. GEÏNTEGREERDE KENNIS: Vraag naar het toepassen van relaties tussen concepten in praktijksituaties.
      
      VOORBEELDSTRUCTUUR VOOR VRAGEN:
      "Een marketingmanager bij een B2B-bedrijf merkt dat de conversie van leads naar klanten achterblijft. Welke salesgerichte aanpak zou in deze situatie het meest effectief zijn?"
      
      FOUTE ANTWOORDOPTIES:
      - Gebruik GEEN duidelijk foute antwoorden
      - Maak OPTIES DIE BIJNA JUIST ZIJN maar subtiel onjuist in de beschreven context, bijvoorbeeld:
        * In een andere situatie correct, maar niet in deze specifieke casus
        * Juiste strategie maar verkeerde timing of omstandigheden
        * Te drastisch of te voorzichtig voor het beschreven probleem
      
      UITLEGSTRUCTUUR (beknopt):
      1. Uitleg van hoe het concept in deze situatie toegepast moet worden (1 zin)
      2. Waarom het juiste antwoord correct is in deze specifieke situatie (1-2 zinnen)
      3. Korte uitleg waarom de andere opties incorrect zijn in deze context (1 zin voor alle opties samen)
      
      BELANGRIJK: Vermijd in de uitleg te refereren naar specifieke optie-letters (A, B, C, D) of de exacte tekst van een optie, omdat de volgorde kan wijzigen. Gebruik algemene termen als "het juiste antwoord" en "de onjuiste opties".
      
      Dit is batch ${batchIndex + 1} van ${totalBatches}, focus alleen op deze begrippen: ${boldedTermsToProcess.join(', ')}
      
      Retourneer de vragen in een JSON array met deze structuur:
      [
        {
          "question": "De vraag in het Nederlands, inclusief een praktijkscenario",
          "options": ["Optie 1 (bijna juist maar subtiel onjuist)", "Optie 2", "Optie 3", "Optie 4"],
          "correct": "A" (of B, C, D afhankelijk van welk antwoord correct is),
          "explanation": "Uitleg over het concept en waarom het antwoord correct is."
        },
        ...meer vragen...
      ]
      
      BELANGRIJK:
      - Maak EXACT ÉÉN vraag per begrip
      - Zorg voor GELIJKE VERDELING van juiste antwoorden (A, B, C, D)
      - Genereer UITSLUITEND vragen die TOEPASSING testen, NOOIT begripsvragen`;
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
    
    // Randomize system instruction order to prevent model predictable patterns
    const rotationValue = Math.floor(Math.random() * 4); // 0, 1, 2, or 3
    const letterRotation = {
      0: ["A", "B", "C", "D"],
      1: ["B", "C", "D", "A"],
      2: ["C", "D", "A", "B"],
      3: ["D", "A", "B", "C"]
    };
    
    const rotatedLetters = letterRotation[rotationValue as keyof typeof letterRotation];
    const randomSystemInstruction = `Voor deze set vragen, gebruik juist een variatie van antwoorden. Begin met ${rotatedLetters.join(", ")} als correcte antwoorden.`;
    
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
            content: randomSystemInstruction + "\n\n" + userPrompt
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
    
    // Verify answer distribution and balance if needed
    if (questions.length >= 4) {
      // Count correct answers by letter
      const answerDistribution = {
        A: questions.filter(q => q.correct === 'A').length,
        B: questions.filter(q => q.correct === 'B').length,
        C: questions.filter(q => q.correct === 'C').length,
        D: questions.filter(q => q.correct === 'D').length
      };
      
      console.log('Initial answer distribution:', answerDistribution);
      
      // Balance answer distribution if needed
      questions = balanceAnswerDistribution(questions);
      
      // Get the new distribution after balancing
      const balancedDistribution = {
        A: questions.filter(q => q.correct === 'A').length,
        B: questions.filter(q => q.correct === 'B').length,
        C: questions.filter(q => q.correct === 'C').length,
        D: questions.filter(q => q.correct === 'D').length
      };
      
      console.log('Balanced answer distribution:', balancedDistribution);
    }
    
    console.log(`Returning ${questions.length} questions after validation and balancing`);
    
    // Convert the letter answers (A, B, C, D) to indices (0, 1, 2, 3) for client-side processing
    const processedQuestions = questions.map(q => {
      // Convert the letter to an index (A=0, B=1, etc.)
      const correctIndex = q.correct.charCodeAt(0) - 65;
      
      // Ensure the explanation doesn't reference specific options by letter
      const explanation = q.explanation
        // Replace direct option letter references with more generic language
        .replace(/\b(optie|option|antwoord|answer)\s+[A-D]\b/gi, "het juiste antwoord")
        // Remove any remaining direct letter references
        .replace(/\b[Oo]ptie [A-D]\b/g, "een optie")
        .replace(/\b[Aa]ntwoord [A-D]\b/g, "een antwoord");
      
      return {
        ...q,
        correctAnswer: correctIndex,
        explanation: explanation
      };
    });
    
    const responseData = {
      success: true,
      questions: processedQuestions,
      metadata: {
        batchIndex,
        totalBatches,
        totalTerms: allBoldedTerms.length,
        processedTerms: (batchIndex * actualBatchSize) + processedQuestions.length,
        batchSize: actualBatchSize,
        isLastBatch: batchIndex >= totalBatches - 1,
        boldedTermsCount: allBoldedTerms.length,
        questionsPerObjective // Add this to metadata
      },
      context: {
        bookTitle,
        contextDescription,
        isSpecificParagraph,
        boldedTermsCount: allBoldedTerms.length
      }
    };
    
    if (debug) {
      // Add debug info if requested
      responseData.debug = {
        prompt: userPrompt,
        response: { content },
        batchTerms: boldedTermsToProcess,
        extractedTerms: allBoldedTerms,
        tokenEstimates: {
          promptTokens: Math.ceil(estimatedPromptTokens),
          requestedMaxTokens: maxTokens
        },
        answerDistribution: {
          A: questions.filter(q => q.correct === 'A').length,
          B: questions.filter(q => q.correct === 'B').length,
          C: questions.filter(q => q.correct === 'C').length,
          D: questions.filter(q => q.correct === 'D').length
        }
      };
    }
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
