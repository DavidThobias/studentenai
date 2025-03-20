
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

    // Get book details - IMPORTANT: Case sensitive table name!
    console.log(`Fetching book with ID: ${bookId} from Boeken table`);
    const { data: book, error: bookError } = await supabase
      .from('Boeken')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError) {
      console.error(`Error fetching book: ${JSON.stringify(bookError)}`);
      throw new Error(`Error fetching book: ${bookError.message}`);
    }

    if (!book) {
      console.error(`No book found with ID: ${bookId}`);
      throw new Error(`No book found with ID: ${bookId}`);
    }

    console.log(`Successfully fetched book: ${book.Titel}`);

    // Get content for quiz generation
    let contentToUse = '';
    let contentSource = '';
    
    // If paragraph ID is provided, get specific paragraph
    if (paragraphId) {
      console.log(`Fetching paragraph with ID: ${paragraphId}`);
      const { data: paragraph, error: paragraphError } = await supabase
        .from('Paragraven')
        .select('*')
        .eq('id', paragraphId)
        .single();

      if (paragraphError) {
        console.error(`Error fetching paragraph: ${JSON.stringify(paragraphError)}`);
        throw new Error(`Error fetching paragraph: ${paragraphError.message}`);
      }

      if (!paragraph) {
        console.error(`No paragraph found with ID: ${paragraphId}`);
        throw new Error(`No paragraph found with ID: ${paragraphId}`);
      }

      contentToUse = paragraph.content || '';
      contentSource = `Paragraph ${paragraph['paragraaf nummer'] || paragraphId}`;
      
      // Also get chapter info for context
      if (paragraph.chapter_id) {
        const { data: chapter } = await supabase
          .from('Chapters')
          .select('Titel, Hoofdstuknummer')
          .eq('id', paragraph.chapter_id)
          .single();
          
        if (chapter) {
          contentSource = `Chapter ${chapter.Hoofdstuknummer}: ${chapter.Titel}, Paragraph ${paragraph['paragraaf nummer'] || paragraphId}`;
        }
      }
    }
    // If chapter ID is provided, get all paragraphs for that chapter
    else if (chapterId) {
      console.log(`Fetching chapter with ID: ${chapterId}`);
      const { data: chapter, error: chapterError } = await supabase
        .from('Chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (chapterError) {
        console.error(`Error fetching chapter: ${JSON.stringify(chapterError)}`);
        throw new Error(`Error fetching chapter: ${chapterError.message}`);
      }

      if (!chapter) {
        console.error(`No chapter found with ID: ${chapterId}`);
        throw new Error(`No chapter found with ID: ${chapterId}`);
      }

      contentSource = `Chapter ${chapter.Hoofdstuknummer}: ${chapter.Titel}`;

      // Get paragraph content for this chapter
      console.log(`Fetching paragraphs for chapter: ${chapterId}`);
      const { data: paragraphs, error: paragraphsError } = await supabase
        .from('Paragraven')
        .select('content, "paragraaf nummer"')
        .eq('chapter_id', chapterId)
        .order('"paragraaf nummer"', { ascending: true });

      if (paragraphsError) {
        console.error(`Error fetching paragraphs: ${JSON.stringify(paragraphsError)}`);
        throw new Error(`Error fetching paragraphs: ${paragraphsError.message}`);
      }
      
      if (paragraphs && paragraphs.length > 0) {
        contentToUse = paragraphs.map(p => p.content).join('\n\n');
      } else {
        console.warn(`No paragraphs found for chapter ${chapterId}`);
      }
    }
    // If neither paragraph nor chapter specified, use first paragraph of first chapter
    else {
      console.log(`No specific chapter/paragraph. Getting first paragraph of first chapter`);
      
      // Get first chapter
      const { data: firstChapter, error: chapterError } = await supabase
        .from('Chapters')
        .select('*')
        .eq('Boek_id', bookId)
        .order('Hoofdstuknummer', { ascending: true })
        .limit(1)
        .single();
      
      if (chapterError || !firstChapter) {
        console.warn(`Could not find first chapter, using book info only`);
        contentToUse = `This is a book titled "${book.Titel}" by ${book.Auteur}. Please generate some general knowledge questions about this topic.`;
        contentSource = `Book: ${book.Titel}`;
      } else {
        // Get first paragraph of this chapter
        const { data: firstParagraph, error: paragraphError } = await supabase
          .from('Paragraven')
          .select('content, "paragraaf nummer"')
          .eq('chapter_id', firstChapter.id)
          .order('"paragraaf nummer"', { ascending: true })
          .limit(1)
          .single();
        
        if (paragraphError || !firstParagraph) {
          console.warn(`Could not find paragraphs for chapter ${firstChapter.id}, using chapter info only`);
          contentToUse = `Chapter ${firstChapter.Hoofdstuknummer}: ${firstChapter.Titel}`;
          contentSource = `Chapter ${firstChapter.Hoofdstuknummer}`;
        } else {
          contentToUse = firstParagraph.content || '';
          contentSource = `Chapter ${firstChapter.Hoofdstuknummer}: ${firstChapter.Titel}, Paragraph ${firstParagraph['paragraaf nummer'] || 1}`;
        }
      }
    }

    if (!contentToUse.trim()) {
      console.warn('No content found for generating questions, using book info');
      contentToUse = `This is a book titled "${book.Titel}" by ${book.Auteur}. Please generate some general knowledge questions about this topic.`;
      contentSource = `Book: ${book.Titel}`;
    }

    // Prepare prompt for OpenAI
    // Limit content length to prevent token limit issues
    const MAX_CONTENT_LENGTH = 4000;
    if (contentToUse.length > MAX_CONTENT_LENGTH) {
      console.log(`Content too long (${contentToUse.length} chars), truncating to ${MAX_CONTENT_LENGTH} chars`);
      contentToUse = contentToUse.substring(0, MAX_CONTENT_LENGTH) + "...";
    }

    const openAIPrompt = `
    Je taak is om ${numberOfQuestions} multiple-choice vragen te genereren over de volgende tekst. 
    De vragen moeten in het Nederlands zijn.
    
    Boek: ${book.Titel}
    ${contentSource}
    
    Inhoud: ${contentToUse}
    
    Belangrijke regels:
    1. Maak elke vraag ALLEEN op basis van de gegeven inhoud
    2. Elke vraag moet precies 4 antwoordopties hebben
    3. Slechts één antwoord mag correct zijn
    4. Gebruik index 0, 1, 2, of 3 om het juiste antwoord aan te geven
    5. Geef een korte uitleg waarom het antwoord correct is
    6. Zorg dat de vragen verschillend zijn en verschillende aspecten van de tekst testen
    7. Maak de vragen uitdagend maar fair
    
    Retourneer je antwoord als een JSON array met deze structuur:
    [
      {
        "question": "De vraag in het Nederlands",
        "options": ["Optie 1", "Optie 2", "Optie 3", "Optie 4"],
        "correctAnswer": 0,
        "explanation": "Uitleg waarom dit antwoord correct is"
      }
    ]
    
    Retourneer ALLEEN de JSON array, zonder andere tekst of opmaak.`;

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
        model: 'gpt-4o-mini',  // Corrected model name from 'gpt-4-mini'
        messages: [
          {
            role: 'system',
            content: 'Je bent een ervaren Nederlandse onderwijsassistent die gespecialiseerd is in het maken van hoogwaardige multiple-choice vragen. Je genereert vragen die zowel uitdagend als leerzaam zijn, en die studenten helpen de stof beter te begrijpen. Je antwoorden zijn altijd in correct JSON formaat, zonder markdown of andere opmaak.'
          },
          {
            role: 'user',
            content: openAIPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
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

    // Validate each question's structure
    quizQuestions = quizQuestions.filter(question => {
      const isValid = question &&
        typeof question.question === 'string' &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        typeof question.correctAnswer === 'number' &&
        question.correctAnswer >= 0 &&
        question.correctAnswer <= 3 &&
        typeof question.explanation === 'string';

      if (!isValid) {
        console.warn('Filtered out invalid question:', JSON.stringify(question));
      }
      return isValid;
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

    // Prepare response object
    const responseObject = {
      success: true,
      message: `Generated ${quizQuestions.length} questions successfully`,
      questions: quizQuestions,
      sessionId: sessionId
    };

    // Add debug information if requested
    if (debug) {
      responseObject.debug = {
        prompt: openAIPrompt,
        response: openAIData
      };
    }

    // Return the generated questions
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
