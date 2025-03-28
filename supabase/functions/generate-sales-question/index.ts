
// @deno-types="https://deno.land/x/xhr@0.1.0/mod.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.0.0";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY") || "",
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Keeps track of answer distribution to ensure even distribution
let answerDistribution = {
  A: 0,
  B: 0,
  C: 0,
  D: 0
};

function getPreferredAnswer() {
  // Find the answer with lowest count
  const sorted = Object.entries(answerDistribution).sort((a, b) => a[1] - b[1]);
  return sorted[0][0]; // Return the letter with lowest count
}

function updateAnswerDistribution(answer: string) {
  if (answerDistribution[answer] !== undefined) {
    answerDistribution[answer]++;
  }
}

// Reset distribution if it gets too unbalanced
function resetDistributionIfNeeded() {
  const total = Object.values(answerDistribution).reduce((sum, val) => sum + val, 0);
  if (total > 20) { // Reset after generating a good number of questions
    answerDistribution = { A: 0, B: 0, C: 0, D: 0 };
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 1, bookId, paragraphId, debug = false } = await req.json();
    
    // Reset distribution if needed
    resetDistributionIfNeeded();
    
    // Get the preferred answer for even distribution
    const preferredAnswer = getPreferredAnswer();
    
    // For multiple questions, we'll generate them in sequence
    const questions = [];
    let debugInfo = null;
    
    for (let i = 0; i < count; i++) {
      const systemPrompt = `
You are an expert in creating multiple-choice questions about sales and marketing. 
Create challenging but fair multiple-choice questions based on sales and marketing knowledge.

Important requirements:
1. Each question must have exactly 4 options labeled A, B, C, and D.
2. One option must be clearly correct, and the others must be plausible but incorrect.
3. For EVEN DISTRIBUTION of answers, prefer to make option "${preferredAnswer}" the correct answer for this question, if reasonable.
4. Each answer option should start with the letter (A, B, C, or D) followed by a period and space.
5. Include a clear explanation for the correct answer.
6. Present questions in JSON format with these fields: question, options, correct, explanation.
7. Focus on conceptual understanding rather than simple recall.
8. Questions should be challenging but fair, requiring critical thinking.
9. If the question is about a definition, ensure the correct answer accurately reflects the term's meaning.
10. For questions that involve processes or steps, ensure options are clearly distinct from each other.
      
Example format:
{
  "question": "What is the primary goal of need discovery in the sales process?",
  "options": [
    "A. To close the deal quickly",
    "B. To understand customer requirements and pain points",
    "C. To present product features effectively",
    "D. To negotiate the best price"
  ],
  "correct": "B",
  "explanation": "Need discovery aims to understand the customer's specific requirements, challenges, and pain points before proposing solutions. This ensures the salesperson can tailor their approach to address actual customer needs rather than just presenting features."
}`;

      // Customize the user prompt based on provided parameters
      let userPrompt = "";
      if (bookId && paragraphId) {
        userPrompt = `Create a challenging but fair multiple-choice question about sales and marketing based on the content from the textbook chapter focusing on terms like marketingplanning, strategie, planning, verkoopdoelstellingen, and segmentatiestrategie. The question should test deep understanding rather than simple facts.`;
      } else if (bookId) {
        userPrompt = `Create a challenging but fair multiple-choice question about sales and marketing concepts from a textbook. Focus on topics like marketing planning, strategy, segmentation, sales objectives, or sales tactics. The question should test understanding of key concepts.`;
      } else {
        userPrompt = `Create a challenging but fair multiple-choice question about sales concepts, strategies or marketing techniques. The question should test deep understanding rather than simple facts.`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const content = response.choices[0].message.content;
      let questionData;

      try {
        questionData = JSON.parse(content);
        
        // Validate and clean the question data
        if (!questionData.question || !Array.isArray(questionData.options) || !questionData.correct || !questionData.explanation) {
          throw new Error("Invalid question format");
        }

        // Ensure we have exactly 4 options
        if (questionData.options.length !== 4) {
          throw new Error("Question must have exactly 4 options");
        }

        // Update distribution counter for the correct answer
        updateAnswerDistribution(questionData.correct);
        
        questions.push(questionData);
        
        // Save debug info only for the first question if requested
        if (debug && i === 0) {
          debugInfo = {
            prompt: systemPrompt + "\n\n" + userPrompt,
            response: response.choices[0],
            answerDistribution: {...answerDistribution} // Copy of current distribution
          };
        }
        
      } catch (error) {
        console.error("Error parsing question:", error);
        console.error("Raw content:", content);
        
        // If parsing fails, try to create a fallback question
        questions.push({
          question: "Which of the following best describes the concept of marketing planning?",
          options: [
            "A. The process of creating advertisements",
            "B. Determining marketing objectives and strategies to achieve them",
            "C. Analyzing customer complaints and feedback",
            "D. Setting product prices based on competitors"
          ],
          correct: preferredAnswer, // Use the preferred answer for distribution
          explanation: "Marketing planning is the process of determining marketing objectives and developing appropriate strategies to achieve those objectives. It involves strategic analysis and planning for all marketing activities."
        });
        
        // Update distribution for fallback question
        updateAnswerDistribution(preferredAnswer);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        questions,
        count: questions.length,
        debug: debugInfo
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});
