
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

    // Improved OpenAI prompt with focus on challenging questions and balanced answer distribution
    const openAIPrompt = `
    Je bent een AI gespecialiseerd in het genereren van uitdagende educatieve meerkeuzevragen om gebruikers volledig inzicht te geven in een specifieke paragraaf uit een boek.
    
    Invoer:
    Boektitel: ${book.book_title}
    ${contentSource}
    
    Inhoud: ${contentToUse}
    
    Vereisten voor de vragen:
    Dynamisch aantal vragen: Op basis van de lengte en inhoud van de paragraaf. Kortere paragrafen krijgen minder vragen, langere paragrafen meer. Genereer maximaal ${numberOfQuestions} vragen.
    
    Diepgang: De vragen moeten zowel feitelijke kennis als begrip testen (bijv. onderscheid tussen concepten, praktische toepassingen).
    
    Scenario-gebaseerde vragen: Minstens een paar vragen moeten de stof in een realistische context plaatsen.
    
    Strikvragen: Voeg enkele subtiele strikvragen toe waarbij oppervlakkige lezing tot een verkeerd antwoord kan leiden. Deze vragen testen diepgaand begrip.
    
    Moeilijkheidsgraad: Zorg voor gevarieerde antwoordopties die allemaal aannemelijk klinken, met subtiele verschillen tussen het juiste antwoord en de afleiders.
    
    Evenwichtige antwoorden: Zorg voor een gelijke verdeling van juiste antwoorden over A, B, C en D - geen enkel antwoord (A, B, C of D) mag vaker dan de andere voorkomen als juist antwoord.
    
    Geen letterlijke kopie: De vragen moeten de stof testen zonder exacte zinnen uit de tekst over te nemen.
    
    Uitgebreide uitleg: Naast het juiste antwoord moet ook worden uitgelegd waarom dit correct is en waarom de andere opties fout zijn.
    
    Correct geformatteerde JSON-uitvoer, met de volgende structuur:
    [
      {
        "question": "Wat is een belangrijk kenmerk van een salesgerichte organisatie?",
        "options": [
          "A. Er wordt nauwelijks met sales targets gewerkt.",
          "B. Het verkoopresultaat staat centraal.",
          "C. Verkopers worden niet afgerekend op prestaties.",
          "D. Het product verkoopt zichzelf."
        ],
        "correct": "B",
        "explanation": "Salesgerichte organisaties werken met duidelijke targets en resultaatgerichte verkopers. Optie A en C zijn onjuist omdat salesgerichte bedrijven juist sterk sturen op prestaties. Optie D past meer bij een productgerichte organisatie."
      }
    ]
    
    Belangrijk:
    Retourneer alleen de JSON-array, zonder extra uitleg of inleidende tekst.
    Bepaal het aantal vragen dynamisch op basis van de paragraaflengte en complexiteit.
    De uitleg moet helder en bondig zijn, en aangeven waarom het juiste antwoord correct is en waarom de andere opties fout zijn.
    Zorg voor een gelijke verdeling van A, B, C en D als correcte antwoorden.
    Maak de foute antwoorden geloofwaardig en vergelijkbaar met het juiste antwoord.`;

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
        model: 'gpt-4o-mini',  // Changed back from gpt-4o to gpt-4o-mini
        messages: [
          {
            role: 'system',
            content: 'Je bent een ervaren Nederlandse onderwijsassistent die gespecialiseerd is in het maken van hoogwaardige multiple-choice vragen. Je genereert vragen die zowel uitdagend als leerzaam zijn, en die studenten helpen de stof beter te begrijpen. Je zorgt voor een evenwichtige verdeling van A, B, C en D als juiste antwoorden. Je antwoorden zijn altijd in correct JSON formaat, zonder markdown of andere opmaak.'
          },
          {
            role: 'user',
            content: openAIPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
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
        response: openAIData
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
