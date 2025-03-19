
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
    const { bookId, chapterId, paragraphId, numberOfQuestions = 5 } = await req.json();
    
    if (!bookId) {
      throw new Error('Book ID is required');
    }

    console.log(`Generating quiz for book ${bookId}, chapter ${chapterId || 'all'}, paragraph ${paragraphId || 'all'}, ${numberOfQuestions} questions`);

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
    Generate ${numberOfQuestions} multiple-choice questions based on this content:
    
    Book: ${book.Titel}
    ${contentSource}
    
    Content: ${contentToUse}
    
    For each question:
    1. Create a clear question based ONLY on the content provided
    2. Provide 4 possible answers where only one is correct
    3. Indicate which answer is correct (with the index: 0, 1, 2, or 3)
    4. Provide a brief explanation of why the answer is correct
    
    Format the response as a JSON array with this structure:
    [
      {
        "question": "Question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": 0,
        "explanation": "Explanation of the correct answer"
      }
    ]
    
    Return ONLY the JSON array without any other text or formatting.
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
        console.log('Starting OpenAI API request...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',  // Updated to correct model name
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
        
        console.log('OpenAI API response received');
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        console.error('Error in OpenAI API call:', error);
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

    // Additional validation for each question
    const validatedQuestions = quizQuestions.filter(q => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3 || 
          !q.explanation) {
        console.warn('Invalid question format, filtering out:', q);
        return false;
      }
      return true;
    });

    console.log(`Validated ${validatedQuestions.length} out of ${quizQuestions.length} questions`);
    
    if (validatedQuestions.length === 0) {
      throw new Error('No valid questions could be generated from the OpenAI response');
    }

    console.log('Successfully completed quiz generation process');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${validatedQuestions.length} questions`,
        questions: validatedQuestions
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
