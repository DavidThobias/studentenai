
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
    const { bookId, chapterId, numberOfQuestions = 5 } = await req.json();
    
    if (!bookId) {
      throw new Error('Book ID is required');
    }

    console.log(`Generating quiz for book ${bookId}, chapter ${chapterId || 'all'}, ${numberOfQuestions} questions`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if we already have enough questions for this book/chapter
    const query = supabase.from('quizzes').select('*').eq('book_id', bookId);
    if (chapterId) {
      query.eq('chapter_id', chapterId);
    } else {
      query.is('chapter_id', null);
    }
    
    const { data: existingQuestions, error: existingQuestionsError } = await query;
    
    if (!existingQuestionsError && existingQuestions && existingQuestions.length >= numberOfQuestions) {
      console.log(`Found ${existingQuestions.length} existing questions, returning those instead of generating new ones`);
      
      // Return existing questions
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Retrieved ${existingQuestions.length} existing questions`,
          questions: existingQuestions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correct_answer,
            explanation: q.explanation
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get book details - NOTE: Case sensitive table name!
    console.log(`Fetching book with ID: ${bookId} from Boeken table`);
    const { data: book, error: bookError } = await supabase
      .from('Boeken')
      .select('*')
      .eq('id', parseInt(bookId))
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

    // Get chapter details if provided
    let chapterContent = '';
    let chapterTitle = '';
    
    if (chapterId) {
      console.log(`Fetching chapter with ID: ${chapterId}`);
      const { data: chapter, error: chapterError } = await supabase
        .from('Chapters')
        .select('*')
        .eq('id', parseInt(chapterId))
        .single();

      if (chapterError) {
        console.error(`Error fetching chapter: ${JSON.stringify(chapterError)}`);
        throw new Error(`Error fetching chapter: ${chapterError.message}`);
      }

      if (!chapter) {
        console.error(`No chapter found with ID: ${chapterId}`);
        throw new Error(`No chapter found with ID: ${chapterId}`);
      }

      chapterTitle = chapter.Titel || '';
      console.log(`Fetched chapter: ${chapterTitle}`);

      // Get paragraph content for this chapter
      console.log(`Fetching paragraphs for chapter: ${chapterId}`);
      const { data: paragraphs, error: paragraphsError } = await supabase
        .from('Paragraven')
        .select('content')
        .eq('chapter_id', parseInt(chapterId));

      if (paragraphsError) {
        console.error(`Error fetching paragraphs: ${JSON.stringify(paragraphsError)}`);
      }

      if (paragraphs && paragraphs.length > 0) {
        chapterContent = paragraphs.map(p => p.content).join('\n');
        console.log(`Found ${paragraphs.length} paragraphs for chapter ${chapterId}`);
      } else {
        console.log(`No paragraphs found for chapter ${chapterId}`);
      }
    } else {
      // If no chapter specified, get all chapters for the book
      console.log(`Fetching all chapters for book: ${bookId}`);
      const { data: chapters, error: chaptersError } = await supabase
        .from('Chapters')
        .select('id, Titel')
        .eq('Boek_id', parseInt(bookId));

      if (chaptersError) {
        console.error(`Error fetching chapters: ${JSON.stringify(chaptersError)}`);
        throw new Error(`Error fetching chapters: ${chaptersError.message}`);
      }

      console.log(`Found ${chapters?.length || 0} chapters for book ${bookId}`);

      // For each chapter, get paragraphs
      for (const chapter of chapters || []) {
        console.log(`Fetching paragraphs for chapter: ${chapter.id}`);
        const { data: paragraphs, error: paragraphsError } = await supabase
          .from('Paragraven')
          .select('content')
          .eq('chapter_id', parseInt(chapter.id));
        
        if (paragraphsError) {
          console.error(`Error fetching paragraphs for chapter ${chapter.id}: ${JSON.stringify(paragraphsError)}`);
        }
        
        if (paragraphs && paragraphs.length > 0) {
          chapterContent += `${chapter.Titel}:\n${paragraphs.map(p => p.content).join('\n')}\n\n`;
          console.log(`Added ${paragraphs.length} paragraphs from chapter ${chapter.id}`);
        } else {
          console.log(`No paragraphs found for chapter ${chapter.id}`);
        }
      }
    }

    if (!chapterContent.trim()) {
      console.warn('No content found for generating questions');
      // If there's no content, still try to generate generic questions about the book
      chapterContent = `This is a book titled "${book.Titel}" by ${book.Auteur}. Please generate some general knowledge questions about this topic.`;
    }

    // Prepare prompt for OpenAI
    const promptContent = chapterId 
      ? `Book: ${book.Titel}\nChapter: ${chapterTitle}\nContent: ${chapterContent}`
      : `Book: ${book.Titel}\nContent: ${chapterContent}`;

    const openAIPrompt = `
    Based on the following text, create ${numberOfQuestions} multiple-choice questions to test knowledge about the content.
    
    ${promptContent}
    
    For each question:
    1. Provide a clear question
    2. Provide 4 possible answers where only one is correct
    3. Indicate which answer is correct (with the index: 0, 1, 2, or 3)
    4. Provide a brief explanation of why the answer is correct
    
    Format the response as a JSON array of objects with the following structure:
    [
      {
        "question": "Question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": 0,
        "explanation": "Explanation of the correct answer"
      }
    ]
    
    Do not include any markdown formatting, just return a valid JSON array.
    `;

    // Call OpenAI API with timeout handling
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Calling OpenAI API...');
    
    // Create a promise for the fetch request
    const fetchWithTimeout = async (timeoutMs = 60000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // Properly formatted model name without quotes
            messages: [
              {
                role: 'system',
                content: 'You are a helpful educational assistant that creates high-quality multiple-choice questions based on educational content. Your responses must be in valid JSON format without any markdown.'
              },
              {
                role: 'user',
                content: openAIPrompt
              }
            ],
            temperature: 0.7,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout: OpenAI API took too long to respond');
        }
        throw error;
      }
    };

    let openAIResponse;
    try {
      openAIResponse = await fetchWithTimeout();
    } catch (error) {
      console.error(`Error calling OpenAI API: ${error.message}`);
      throw new Error(`Error calling OpenAI API: ${error.message}`);
    }

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error(`OpenAI API error (${openAIResponse.status}): ${errorText}`);
      throw new Error(`OpenAI API error (${openAIResponse.status}): ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('Received response from OpenAI');
    
    // Parse the response content which should be JSON
    const quizContent = openAIData.choices[0].message.content.trim();
    let quizQuestions;
    
    try {
      // Try to parse directly if it's already JSON
      quizQuestions = JSON.parse(quizContent);
      console.log(`Successfully parsed ${quizQuestions.length} questions from OpenAI response`);
    } catch (e) {
      console.error('Failed to parse response as JSON directly, trying to extract from markdown', e);
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = quizContent.match(/```json\n([\s\S]*?)\n```/) || 
                        quizContent.match(/```\n([\s\S]*?)\n```/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          quizQuestions = JSON.parse(jsonMatch[1].trim());
          console.log(`Successfully extracted and parsed ${quizQuestions.length} questions from markdown code block`);
        } catch (innerError) {
          console.error('Failed to parse extracted content as JSON', innerError);
          throw new Error('Failed to parse quiz questions from OpenAI response');
        }
      } else {
        console.error('No JSON or code block found in the OpenAI response');
        throw new Error('Failed to parse quiz questions from OpenAI response');
      }
    }

    // Validate the structure of the questions
    if (!Array.isArray(quizQuestions)) {
      console.error('OpenAI did not return an array of questions', quizQuestions);
      throw new Error('OpenAI did not return an array of questions');
    }

    console.log(`Saving ${quizQuestions.length} questions to the database`);
    
    // Save the questions to the database
    for (const question of quizQuestions) {
      if (!question.question || !Array.isArray(question.options) || 
          question.correctAnswer === undefined || !question.explanation) {
        console.warn('Skipping invalid question:', JSON.stringify(question));
        continue;
      }

      const { error: insertError } = await supabase.from('quizzes').insert({
        book_id: parseInt(bookId),
        chapter_id: chapterId ? parseInt(chapterId) : null,
        question: question.question,
        options: question.options,
        correct_answer: question.correctAnswer,
        explanation: question.explanation
      });

      if (insertError) {
        console.error(`Error inserting question: ${JSON.stringify(insertError)}`);
      }
    }

    console.log('Successfully completed quiz generation process');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${quizQuestions.length} questions`,
        questions: quizQuestions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating quiz:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred',
        source: error.stack ? 'Edge function error' : 'Unknown source'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
