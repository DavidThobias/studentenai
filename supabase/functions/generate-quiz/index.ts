
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

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get book details
    const { data: book, error: bookError } = await supabase
      .from('Boeken')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError) {
      throw new Error(`Error fetching book: ${bookError.message}`);
    }

    // Get chapter details if provided
    let chapterContent = '';
    let chapterTitle = '';
    
    if (chapterId) {
      const { data: chapter, error: chapterError } = await supabase
        .from('Chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (chapterError) {
        throw new Error(`Error fetching chapter: ${chapterError.message}`);
      }

      chapterTitle = chapter.Titel || '';

      // Get paragraph content for this chapter
      const { data: paragraphs, error: paragraphsError } = await supabase
        .from('Paragraven')
        .select('content')
        .eq('chapter_id', chapterId);

      if (!paragraphsError && paragraphs) {
        chapterContent = paragraphs.map(p => p.content).join('\n');
      }
    } else {
      // If no chapter specified, get all chapters for the book
      const { data: chapters, error: chaptersError } = await supabase
        .from('Chapters')
        .select('id, Titel')
        .eq('Boek_id', bookId);

      if (chaptersError) {
        throw new Error(`Error fetching chapters: ${chaptersError.message}`);
      }

      // For each chapter, get paragraphs
      for (const chapter of chapters || []) {
        const { data: paragraphs } = await supabase
          .from('Paragraven')
          .select('content')
          .eq('chapter_id', chapter.id);
        
        if (paragraphs && paragraphs.length > 0) {
          chapterContent += `${chapter.Titel}:\n${paragraphs.map(p => p.content).join('\n')}\n\n`;
        }
      }
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
    `;

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful educational assistant that creates high-quality multiple-choice questions based on educational content. Your responses must be in valid JSON format.'
          },
          {
            role: 'user',
            content: openAIPrompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    
    // Parse the response content which should be JSON
    const quizContent = openAIData.choices[0].message.content.trim();
    let quizQuestions;
    
    try {
      // Try to parse directly if it's already JSON
      quizQuestions = JSON.parse(quizContent);
    } catch (e) {
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = quizContent.match(/```json\n([\s\S]*?)\n```/) || 
                        quizContent.match(/```\n([\s\S]*?)\n```/);
      
      if (jsonMatch && jsonMatch[1]) {
        quizQuestions = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error('Failed to parse quiz questions from OpenAI response');
      }
    }

    // Validate the structure of the questions
    if (!Array.isArray(quizQuestions)) {
      throw new Error('OpenAI did not return an array of questions');
    }

    // Save the questions to the database
    for (const question of quizQuestions) {
      if (!question.question || !Array.isArray(question.options) || 
          question.correctAnswer === undefined || !question.explanation) {
        console.warn('Skipping invalid question:', question);
        continue;
      }

      await supabase.from('quizzes').insert({
        book_id: bookId,
        chapter_id: chapterId || null,
        question: question.question,
        options: question.options,
        correct_answer: question.correctAnswer,
        explanation: question.explanation
      });
    }

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
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
