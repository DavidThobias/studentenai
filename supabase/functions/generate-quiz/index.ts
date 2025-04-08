
// @deno-types="https://deno.land/x/types/deno.d.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

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
    const { bookId, chapterId, paragraphId, numberOfQuestions = 5, sessionId, debug = false } = await req.json();
    
    if (!bookId) {
      throw new Error('Book ID is required');
    }

    console.log(`Generating quiz for book ${bookId}, chapter ${chapterId || 'all'}, paragraph ${paragraphId || 'all'}, ${numberOfQuestions} questions, session ${sessionId || 'none'}, debug: ${debug}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get book details - IMPORTANT: Use the 'books' table
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

    console.log(`Successfully fetched book: ${book.book_title}`);

    // Get content for quiz generation
    let contentToUse = '';
    let contentSource = '';
    
    // If paragraph ID is provided, get specific paragraph
    if (paragraphId) {
      console.log(`Fetching paragraph with ID: ${paragraphId}`);
      
      const { data: paragraph, error: paragraphError } = await supabase
        .from('books')
        .select('*')
        .eq('id', paragraphId)
        .maybeSingle();

      if (!paragraphError && paragraph) {
        contentToUse = paragraph.content || '';
        contentSource = `Paragraph ${paragraph.paragraph_number}, Chapter ${paragraph.chapter_number}`;
      } else {
        console.error(`No paragraph found with ID: ${paragraphId}`);
        throw new Error(`No paragraph found with ID: ${paragraphId}`);
      }
    }
    // If chapter ID is provided, get all paragraphs for that chapter
    else if (chapterId) {
      const numericChapterId = Number(chapterId);
      console.log(`Fetching chapter with ID: ${numericChapterId}`);
      
      // Get chapter info from books table
      const { data: chapterInfo, error: chapterError } = await supabase
        .from('books')
        .select('chapter_title')
        .eq('chapter_number', numericChapterId)
        .limit(1)
        .maybeSingle();
      
      if (!chapterError && chapterInfo) {
        contentSource = `Chapter ${numericChapterId}: ${chapterInfo.chapter_title}`;
        
        // Get all paragraphs for this chapter
        const { data: paragraphs, error: paragraphsError } = await supabase
          .from('books')
          .select('content, paragraph_number')
          .eq('chapter_number', numericChapterId)
          .order('paragraph_number', { ascending: true });
          
        if (!paragraphsError && paragraphs && paragraphs.length > 0) {
          contentToUse = paragraphs.map(p => p.content).join('\n\n');
          console.log(`Found ${paragraphs.length} paragraphs for chapter ${numericChapterId}`);
        } else {
          console.warn(`No paragraphs found for chapter ${numericChapterId}`);
          contentToUse = `Chapter ${numericChapterId}: ${chapterInfo.chapter_title}`;
        }
      } else {
        console.error(`No chapter found with number: ${numericChapterId}`);
        throw new Error(`No chapter found with number: ${numericChapterId}`);
      }
    }
    // If neither chapter nor paragraph specified, use first paragraph of first chapter
    else {
      console.log(`No specific chapter/paragraph. Getting content from the book`);
      
      // Get first chapter
      const { data: firstChapter, error: chapterError } = await supabase
        .from('books')
        .select('chapter_number, chapter_title')
        .eq('book_title', book.book_title)
        .order('chapter_number', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (chapterError || !firstChapter) {
        console.warn(`Could not find first chapter, using book info only`);
        contentToUse = `This is a book titled "${book.book_title}". Please generate some general knowledge questions about this topic.`;
        contentSource = `Book: ${book.book_title}`;
      } else {
        // Get first paragraph of this chapter
        const { data: firstParagraph, error: paragraphError } = await supabase
          .from('books')
          .select('content, paragraph_number')
          .eq('book_title', book.book_title)
          .eq('chapter_number', firstChapter.chapter_number)
          .order('paragraph_number', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (paragraphError || !firstParagraph) {
          console.warn(`Could not find paragraphs for chapter ${firstChapter.chapter_number}, using chapter info only`);
          contentToUse = `Chapter ${firstChapter.chapter_number}: ${firstChapter.chapter_title}`;
          contentSource = `Chapter ${firstChapter.chapter_number}`;
        } else {
          contentToUse = firstParagraph.content || '';
          contentSource = `Chapter ${firstChapter.chapter_number}: ${firstChapter.chapter_title}, Paragraph ${firstParagraph.paragraph_number}`;
        }
      }
    }

    if (!contentToUse.trim()) {
      console.warn('No content found for generating questions, using book info');
      contentToUse = `This is a book titled "${book.book_title}". Please generate some general knowledge questions about this topic.`;
      contentSource = `Book: ${book.book_title}`;
    }

    // Prepare prompt for OpenAI
    // Limit content length to prevent token limit issues
    const MAX_CONTENT_LENGTH = 4000;
    if (contentToUse.length > MAX_CONTENT_LENGTH) {
      console.log(`Content too long (${contentToUse.length} chars), truncating to ${MAX_CONTENT_LENGTH} chars`);
      contentToUse = contentToUse.substring(0, MAX_CONTENT_LENGTH) + "...";
    }

    // Random answer seed to prevent model bias toward specific letters
    const randomSeed = Math.floor(Math.random() * 10000);

    // Updated OpenAI prompt with focus on application-oriented questions and real-world scenarios
    const openAIPrompt = `
    Je bent een AI gespecialiseerd in het genereren van uitdagende educatieve meerkeuzevragen om gebruikers volledig inzicht te geven in een specifieke paragraaf uit een boek.
    
    Invoer:
    Boektitel: ${book.book_title}
    ${contentSource}
    
    Inhoud: ${contentToUse}
    
    Vereisten voor de vragen:
    Dynamisch aantal vragen: Op basis van de lengte en inhoud van de paragraaf. Kortere paragrafen krijgen minder vragen, langere paragrafen meer. Genereer maximaal ${numberOfQuestions} vragen.
    
    PERFECTE VERDELING VAN ANTWOORDEN: Het is CRUCIAAL dat er een exacte en gelijke verdeling is tussen A, B, C en D als correcte antwoorden. Elk correct antwoord (A, B, C, D) moet precies 25% van de tijd voorkomen. Dit is een ABSOLUTE VEREISTE. Genereer de antwoorden puur willekeurig zonder voorkeur voor bepaalde letters. Random seed voor antwoordverdeling: ${randomSeed}. Controleer dit zorgvuldig voordat je je antwoord voltooit.
    
    FOCUS OP TOEPASSING: ALLE vragen MOETEN gericht zijn op praktische toepassing van kennis, niet op definitie of begrip. Gebruik ALTIJD realistische praktijkscenario's, casussen of situaties waarin de leerstof toegepast moet worden. De vragen moeten testen of iemand de stof echt kan GEBRUIKEN in praktijksituaties.
    
    MOEILIJKHEIDSGRAAD: ZEER HOOG. Maak de vragen extreem uitdagend door:
      - Complexe scenario's te creëren die dieper begrip vereisen
      - Gebruik van verfijnde nuances tussen antwoordopties
      - Toepassing van kennis in nieuwe, onverwachte contexten
      - Hogere cognitieve vaardigheden testen (kritisch analyseren, evalueren, creëren)
      - Vragen over subtiele verbanden tussen concepten in praktijksituaties
      - Misleidende maar plausibele antwoordopties toevoegen die diep inzicht testen
      - Abstract denken en inzicht vereisen om de juiste conclusies te trekken
    
    UITGEBREIDE UITLEG: Voor elke vraag moet een grondige uitleg worden gegeven die:
      1. Begint met een duidelijke uitleg van het toegepaste principe of concept
      2. Daarna uitlegt waarom het correcte antwoord juist is in deze specifieke situatie
      3. Vervolgens specifiek beschrijft waarom elk onjuist antwoord fout is in deze context
      4. Verwijst naar complexe toepassingssituaties in de praktijk
    
    PRAKTIJKSCENARIO'S: 100% van de vragen MOETEN gebaseerd zijn op realistische scenario's of casussen, NOOIT pure kennisvragen. Voorbeeld scenario's kunnen zijn:
      - Een marketingmedewerker die een strategie moet kiezen
      - Een verkoper die moet beslissen hoe te reageren op een klantbezwaar
      - Een manager die moet bepalen welke leiderschapsstijl het meest effectief is
      - Een professional die moet beoordelen welke actie in een complexe situatie de beste is
    
    CASUÏSTIEK: Elke vraag moet beginnen met een korte maar informatierijke beschrijving van een praktijksituatie, gevolgd door een vraag die beoordeelt hoe de concepten uit de tekst toegepast moeten worden in die situatie.
    
    Correct geformatteerde JSON-uitvoer, met de volgende structuur:
    [
      {
        "question": "Een marketingmanager bij een B2B-bedrijf merkt dat de conversie van leads naar klanten achterblijft bij de verwachtingen. Na analyse blijkt dat vooral in de laatste fase van het verkoopproces veel potentiële klanten afhaken. Welke salesgerichte aanpak zou in deze situatie het meest effectief zijn?",
        "options": [
          "Meer focus leggen op het werven van nieuwe leads om het verlies te compenseren.",
          "Een gespecialiseerd team inzetten dat zich alleen richt op het laatste deel van de verkoopfunnel.",
          "De klantgerichte benadering versterken door betere afstemming tussen marketing en sales.",
          "Prijsverlagingen doorvoeren om twijfelende potentiële klanten over de streep te trekken."
        ],
        "correct": "C",
        "explanation": "Bij een probleem in de laatste fase van het verkoopproces is een klantgerichte benadering waarbij marketing en sales samenwerken meestal het meest effectief. Dit zorgt voor een betere begeleiding van leads door de funnel. Het werven van meer leads (A) lost het onderliggende conversieprobleem niet op. Een gespecialiseerd team (B) kan effectief zijn maar is minder holistisch dan een geïntegreerde benadering. Prijsverlagingen (D) kunnen tijdelijk helpen maar lossen structurele problemen in het verkoopproces niet op en kunnen de margestructuur ondermijnen."
      }
    ]
    
    Belangrijk:
    Retourneer alleen de JSON-array, zonder extra uitleg of inleidende tekst.
    Bepaal het aantal vragen dynamisch op basis van de paragraaflengte en complexiteit.
    De uitleg moet ALTIJD eerst het concept toelichten en daarna uitleggen hoe het van toepassing is.
    Controleer dat er een EXACTE gelijke verdeling is van A, B, C, D als correcte antwoorden.
    Maak de foute antwoorden geloofwaardig en vergelijkbaar met het juiste antwoord.
    ALLE vragen MOETEN praktijkgericht zijn, GEEN enkele kennisvraag.`;

    // Call OpenAI API with timeout handling
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Calling OpenAI API...');
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Upgraded to more powerful model
        messages: [
          {
            role: 'system',
            content: 'Je bent een ervaren Nederlandse onderwijsassistent die gespecialiseerd is in het maken van hoogwaardige multiple-choice vragen. Je genereert vragen die zowel uitdagend als leerzaam zijn, en die studenten helpen de stof beter te begrijpen. Je zorgt voor een EXACT GELIJKE verdeling van A, B, C en D als juiste antwoorden. Je antwoorden zijn altijd in correct JSON formaat, zonder markdown of andere opmaak.'
          },
          {
            role: 'user',
            content: openAIPrompt
          }
        ],
        temperature: 0.9, // Slightly higher temperature for more randomness in answers
        max_tokens: 3500, // Increased token limit for more detailed explanations
      }),
    });

    console.log('OpenAI API response received');
    
    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('Successfully received OpenAI response');
    
    if (!openAIData.choices || !openAIData.choices[0] || !openAIData.choices[0].message) {
      console.error('Invalid response structure from OpenAI:', openAIData);
      throw new Error('Invalid response structure from OpenAI');
    }
    
    // Parse the response content which should be JSON
    const quizContent = openAIData.choices[0].message.content.trim();
    console.log('Raw quiz content:', quizContent);
    let quizQuestions;
    
    try {
      // Try to parse directly if it's already JSON
      quizQuestions = JSON.parse(quizContent);
      console.log(`Successfully parsed ${quizQuestions.length} questions from OpenAI response`);
    } catch (e) {
      console.error('Failed to parse response as JSON directly:', e);
      console.error('Raw content that failed to parse:', quizContent);
      
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = quizContent.match(/```json\n([\s\S]*?)\n```/) || 
                       quizContent.match(/```\n([\s\S]*?)\n```/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          quizQuestions = JSON.parse(jsonMatch[1].trim());
          console.log(`Successfully extracted and parsed ${quizQuestions.length} questions from markdown code block`);
        } catch (innerError) {
          console.error('Failed to parse extracted content as JSON:', innerError);
          console.error('Extracted content that failed to parse:', jsonMatch[1].trim());
          throw new Error('Failed to parse quiz questions from OpenAI response');
        }
      } else {
        console.error('No JSON or code block found in the OpenAI response');
        throw new Error('Failed to parse quiz questions from OpenAI response');
      }
    }

    // Validate the structure of the questions
    if (!Array.isArray(quizQuestions)) {
      console.error('OpenAI did not return an array of questions:', quizQuestions);
      throw new Error('OpenAI did not return an array of questions');
    }

    // Count correct answers to check distribution
    const correctAnswerCount = { A: 0, B: 0, C: 0, D: 0 };
    quizQuestions.forEach(q => {
      if (q && q.correct && ["A", "B", "C", "D"].includes(q.correct)) {
        correctAnswerCount[q.correct]++;
      }
    });
    
    console.log("Answer distribution check:", correctAnswerCount);
    
    // Calculate variance to determine if distribution is reasonable
    const avgCount = quizQuestions.length / 4; // ideal average per answer type
    const threshold = 0.2; // allowable variance threshold
    const hasProperDistribution = Object.values(correctAnswerCount).every(count => {
      const variance = Math.abs(count - avgCount) / quizQuestions.length;
      return variance <= threshold;
    });
    
    if (!hasProperDistribution && quizQuestions.length >= 4) {
      console.warn("Detected uneven answer distribution. Forcing rebalancing...");
      
      // Enhanced rebalancing algorithm for when distribution is poor
      if (quizQuestions.length >= 4) {
        // Create a mapping of what letter each question's correct answer should be
        const targetDistribution = [];
        for (let i = 0; i < quizQuestions.length; i++) {
          // This ensures a perfectly even distribution of A, B, C, D
          targetDistribution.push(String.fromCharCode(65 + (i % 4)));
        }
        
        // Shuffle to avoid predictable pattern
        for (let i = targetDistribution.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [targetDistribution[i], targetDistribution[j]] = [targetDistribution[j], targetDistribution[i]];
        }
        
        // Rebalance by reassigning correct answers and reordering options
        quizQuestions = quizQuestions.map((question, idx) => {
          const currentCorrectIndex = question.correct.charCodeAt(0) - 65;
          const targetCorrectIndex = targetDistribution[idx].charCodeAt(0) - 65;
          
          if (currentCorrectIndex === targetCorrectIndex) {
            return question; // No change needed
          }
          
          // Create a deep copy of options to avoid reference issues
          const newOptions = [...question.options];
          
          // Swap the correct answer with the target position
          [newOptions[currentCorrectIndex], newOptions[targetCorrectIndex]] = 
            [newOptions[targetCorrectIndex], newOptions[currentCorrectIndex]];
          
          return {
            ...question,
            options: newOptions,
            correct: targetDistribution[idx]
          };
        });
        
        // Verify the new distribution
        const newDistribution = { A: 0, B: 0, C: 0, D: 0 };
        quizQuestions.forEach(q => {
          if (q && q.correct && ["A", "B", "C", "D"].includes(q.correct)) {
            newDistribution[q.correct]++;
          }
        });
        console.log("Rebalanced answer distribution:", newDistribution);
      }
    }

    // Validate each question's structure and convert from letter format to index format
    quizQuestions = quizQuestions.filter(question => {
      const isValid = question &&
        typeof question.question === 'string' &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        typeof question.correct === 'string' &&
        ["A", "B", "C", "D"].includes(question.correct) &&
        typeof question.explanation === 'string';

      if (!isValid) {
        console.warn('Filtered out invalid question:', JSON.stringify(question));
      }
      return isValid;
    }).map(question => {
      // Convert from letter format (A, B, C, D) to index format (0, 1, 2, 3)
      const correctIndex = question.correct.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      
      // Convert option format from "A. Option text" to just "Option text"
      const cleanedOptions = question.options.map(option => {
        // If option starts with a letter and dot (e.g., "A. "), remove it
        return option.replace(/^[A-D]\.\s*/, '');
      });
      
      return {
        question: question.question,
        options: cleanedOptions,
        correctAnswer: correctIndex,
        explanation: question.explanation
      };
    });

    if (quizQuestions.length === 0) {
      throw new Error('No valid questions were generated');
    }

    // If we have a session ID, store the questions for persistence
    if (sessionId) {
      try {
        console.log(`Storing ${quizQuestions.length} questions for session ${sessionId}`);
        
        // Store each question in the quizzes table
        for (const question of quizQuestions) {
          const { error } = await supabase
            .from('quizzes')
            .insert({
              book_id: bookId,
              chapter_id: chapterId || null,
              paragraph_id: paragraphId || null,
              question: question.question,
              options: question.options,
              correct_answer: question.correctAnswer,
              explanation: question.explanation,
              session_id: sessionId
            });
            
          if (error) {
            console.error('Error saving quiz question to database:', error);
            // Continue with the next question, don't fail the whole operation
          }
        }
        
        console.log(`Successfully stored questions for session ${sessionId}`);
      } catch (storageError) {
        // Log the error but don't fail the function - we can still return the questions
        console.error('Error storing quiz questions:', storageError);
      }
    }

    // Prepare response object - ALWAYS include debug info regardless of debug flag
    const responseObject = {
      success: true,
      message: `Generated ${quizQuestions.length} questions successfully`,
      questions: quizQuestions,
      sessionId: sessionId,
      // Always include debug information
      debug: {
        prompt: openAIPrompt,
        response: openAIData,
        answerDistribution: correctAnswerCount
      }
    };

    // Return the generated questions with debug info
    return new Response(
      JSON.stringify(responseObject),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-quiz function:', error);
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
