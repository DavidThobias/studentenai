
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookId, chapterId, paragraphId, debug = false } = await req.json();

    console.log(`Generating online marketing quiz for book ${bookId}, chapter ${chapterId}, paragraph ${paragraphId}`);

    if (!bookId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Book ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get book data first to get the title
    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .select('book_title')
      .eq('id', bookId)
      .limit(1)
      .single();

    if (bookError || !bookData) {
      console.error('Error fetching book data:', bookError);
      return new Response(
        JSON.stringify({ success: false, error: 'Book not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const bookTitle = bookData.book_title;
    let chapterContent = '';
    let chapterTitle = '';
    let objectives = '';
    let objectivesArray: string[] = [];

    // Fetch content based on provided IDs
    if (paragraphId) {
      // For a specific paragraph
      const { data: paragraphData, error: paragraphError } = await supabase
        .from('books')
        .select('content, chapter_title, chapter_number, objectives')
        .eq('id', paragraphId)
        .single();

      if (paragraphError || !paragraphData) {
        console.error('Error fetching paragraph data:', paragraphError);
        return new Response(
          JSON.stringify({ success: false, error: 'Paragraph not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      chapterContent = paragraphData.content || '';
      chapterTitle = paragraphData.chapter_title || '';
      objectives = paragraphData.objectives || '';

      // If paragraph has no objectives, try to get chapter objectives
      if (!objectives && paragraphData.chapter_number) {
        const { data: chapterData, error: chapterError } = await supabase
          .from('books')
          .select('objectives')
          .eq('chapter_number', paragraphData.chapter_number)
          .limit(1)
          .single();

        if (!chapterError && chapterData && chapterData.objectives) {
          objectives = chapterData.objectives;
        }
      }
    } else if (chapterId) {
      // For an entire chapter
      const { data: chapterContent, error: chapterError } = await supabase
        .from('books')
        .select('content, chapter_title, objectives')
        .eq('chapter_number', chapterId)
        .eq('book_title', bookTitle)
        .order('paragraph_number', { ascending: true });

      if (chapterError || !chapterContent || chapterContent.length === 0) {
        console.error('Error fetching chapter data:', chapterError);
        return new Response(
          JSON.stringify({ success: false, error: 'Chapter not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Combine all paragraphs content
      chapterContent = chapterContent.map(p => p.content).join('\n\n');
      chapterTitle = chapterContent[0]?.chapter_title || '';
      
      // Get objectives from first paragraph that has them
      for (const paragraph of chapterContent) {
        if (paragraph.objectives) {
          objectives = paragraph.objectives;
          break;
        }
      }
    } else {
      // For the entire book (or multiple chapters)
      const { data: bookParagraphs, error: bookError } = await supabase
        .from('books')
        .select('content, chapter_title, objectives')
        .eq('book_title', bookTitle)
        .order('chapter_number', { ascending: true })
        .order('paragraph_number', { ascending: true });

      if (bookError || !bookParagraphs || bookParagraphs.length === 0) {
        console.error('Error fetching book paragraphs:', bookError);
        return new Response(
          JSON.stringify({ success: false, error: 'Book content not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Take a subset of paragraphs to avoid too large requests
      const maxParagraphs = 10;
      const selectedParagraphs = bookParagraphs.slice(0, maxParagraphs);
      
      chapterContent = selectedParagraphs.map(p => p.content).join('\n\n');
      chapterTitle = "Multiple Chapters";
      
      // Get objectives from first paragraph that has them
      for (const paragraph of selectedParagraphs) {
        if (paragraph.objectives) {
          objectives = paragraph.objectives;
          break;
        }
      }
    }

    // Parse objectives into an array by splitting on newlines and/or bullet points
    if (objectives) {
      objectivesArray = objectives
        .split(/\n|-|\*/)
        .map(obj => obj.trim())
        .filter(obj => obj.length > 10); // Filter out empty or very short lines
    }

    if (objectivesArray.length === 0) {
      // If no objectives found, extract them from content using a simple heuristic
      const objectivesSection = chapterContent.match(/doelstelling(en)?:?\s*([\s\S]*?)(?=\n\n|$)/i);
      if (objectivesSection && objectivesSection[2]) {
        objectivesArray = objectivesSection[2]
          .split(/\n|-|\*/)
          .map(obj => obj.trim())
          .filter(obj => obj.length > 10);
      }
      
      // If still no objectives, create some based on section headers or bold terms
      if (objectivesArray.length === 0) {
        const boldTerms = chapterContent.match(/\*\*(.*?)\*\*/g)?.map(term => term.replace(/\*\*/g, '')) || [];
        const sectionHeaders = chapterContent.match(/^#+\s+(.*?)$/gm)?.map(header => header.replace(/^#+\s+/, '')) || [];
        
        // Use section headers if available, otherwise bold terms
        const terms = sectionHeaders.length > 0 ? sectionHeaders : boldTerms;
        
        if (terms.length > 0) {
          // Convert the top 5 terms into pseudo-objectives
          objectivesArray = terms.slice(0, 5).map(term => 
            `Na het bestuderen van dit hoofdstuk begrijp je het concept "${term}" en kun je dit toepassen in de praktijk.`
          );
        } else {
          // Last resort: create a generic objective
          objectivesArray = ["Na het bestuderen van dit hoofdstuk begrijp je de belangrijkste concepten en kun je deze toepassen in de praktijk."];
        }
      }
    }

    console.log(`Found ${objectivesArray.length} learning objectives`);
    
    // Limit chapter content to avoid token limit issues
    const maxContentLength = 8000;
    let contentForPrompt = chapterContent;
    if (contentForPrompt.length > maxContentLength) {
      contentForPrompt = contentForPrompt.substring(0, maxContentLength);
      console.log(`Content truncated to ${maxContentLength} characters`);
    }

    // Build the prompt for OpenAI focusing on objectives
    const objectivesForPrompt = objectivesArray.join('\n- ');
    const questionsPerObjective = 3; // Generate approximately 3 questions per objective
    const totalQuestionsExpected = objectivesArray.length * questionsPerObjective;
    
    const prompt = `
Genereer meervoudige-keuzevragen op basis van de theorie en doelstellingen van het meegeleverde hoofdstuk. Zorg ervoor dat er voldoende vragen zijn om elk aspect van de theorie en elke doelstelling volledig te dekken. Genereer ongeveer ${questionsPerObjective} vragen per doelstelling, zodat de gebruiker elk concept grondig kan begrijpen.

Kijk goed naar iedere doelstelling en bepaal welk type vraag het beste past bij die specifieke doelstelling. Niet elke doelstelling vereist elk type vraag. Stem het type vraag af op wat de doelstelling probeert te bereiken.

Gebruik verschillende vraagtypes zoals:

1. Begripsvragen (Wat betekent dit model of begrip?)
Voorbeeld:
Wat betekent de 'B van Binden' in het 6B-model binnen digital marketing?
A) De klant overtuigen om een aankoop te doen
B) De klant stimuleren om terug te keren na een aankoop
C) De klant informeren over het betaalproces
D) De klant laten navigeren naar de website
Correct antwoord: B – Binden gaat over het creëren van herhaalaankopen en klantloyaliteit.

2. Toepassingsvragen (Pas een model of begrip toe op een situatie)
Voorbeeld:
Je deelt via Instagram regelmatig video's waarin je jouw product demonstreert en uitlegt hoe je het gebruikt. Tot welke van de 4 E's van contentmarketing behoort dit?
A) Entertain
B) Engage
C) Empower
D) Educate
Correct antwoord: D – Educate: je leert mensen hoe ze het product moeten gebruiken.

3. Reken-/datavragen (Gebruik data om een KPI of metric te berekenen)
Voorbeeld:
Een webshop had in maart 10.000 bezoekers en 250 bestellingen. Wat is het conversiepercentage?
A) 2%
B) 2,5%
C) 5%
D) 4%
Correct antwoord: B – 250 / 10.000 = 0,025 → 2,5%

4. Vergelijkingsvragen (Wat is het verschil of overeenkomst tussen modellen?)
Voorbeeld:
Welke positioneringsstrategie van Treacy & Wiersema komt het meest overeen met de strategie 'Kostenleiderschap' van Porter?
A) Customer Intimacy
B) Product Leadership
C) Operational Excellence
D) Stuck in the Middle
Correct antwoord: C – Operational Excellence focust, net als Kostenleiderschap, op efficiëntie en lage kosten.

5. Interpretatievragen (Welk begrip past bij deze situatie?)
Voorbeeld:
Picnic innoveert in de supermarktbranche met een eigen logistiek systeem en unieke bezorgmethode. Op welk niveau in het businessmodel zit hun vernieuwing?
A) Marketingoperatie
B) Marketinginstrumenten
C) Businessmodel
D) Klantsegmentatie
Correct antwoord: C – Ze veranderen fundamenteel hoe ze waarde leveren: dus op businessmodel-niveau.

Elke vraag moet een realistisch scenario bevatten dat past bij het onderwerp van het hoofdstuk en op toepassingsniveau is, zodat de gebruiker de concepten in praktische situaties moet toepassen. Elke vraag heeft vier antwoordopties, waarvan één correct is. Maak de antwoorden misleidend: de foute opties moeten lijken op het correcte antwoord, maar subtiele fouten bevatten. Zorg dat de vragen duidelijk, grammaticaal correct en uitdagend zijn.

Voor deze quiz focus je specifiek op de volgende leerdoelstellingen:
- ${objectivesForPrompt}

Boektitel: ${bookTitle}
Hoofdstuktitel: ${chapterTitle}

Inhoud:
${contentForPrompt}

Genereer in totaal ongeveer ${totalQuestionsExpected} quizvragen. Elke vraag moet de volgende structuur hebben:
{
  "question": "De vraag hier",
  "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
  "correctAnswer": 0, // index van het correcte antwoord (0-3)
  "explanation": "Uitleg waarom dit het juiste antwoord is",
  "objective": "De leerdoelstelling waar deze vraag bij hoort",
  "questionType": "Begrip/Toepassing/Rekenen/Vergelijking/Interpretatie" // Type vraag dat bij deze leerdoelstelling past
}

Geef alleen de JSON-array terug, geen omliggende tekst.
`;

    // Call OpenAI API
    console.log('Calling OpenAI API to generate questions for all objectives at once');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Je bent een online marketing expert en onderwijsspecialist die quizvragen ontwerpt om studenten te helpen leren.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const responseData = await openAIResponse.json();
    console.log('OpenAI API response received');

    if (!responseData.choices || !responseData.choices[0]) {
      console.error('Invalid response from OpenAI:', responseData);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response from AI' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiResponse = responseData.choices[0].message.content;
    
    // Parse the response to extract the JSON array of questions
    let questions;
    try {
      // Try to parse the entire response as JSON
      questions = JSON.parse(aiResponse);
      
      // If it's not an array, try to extract JSON from the text
      if (!Array.isArray(questions)) {
        const jsonMatch = aiResponse.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Response does not contain a valid JSON array');
        }
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response:', aiResponse);
      
      // Attempt more aggressive JSON extraction
      try {
        const fixedJson = aiResponse
          .replace(/^```json/g, '') // Remove markdown code block markers
          .replace(/```$/g, '')
          .trim();
        questions = JSON.parse(fixedJson);
      } catch (e) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to parse questions from AI response',
            rawResponse: aiResponse
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Ensure response is an array
    if (!Array.isArray(questions)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI response is not an array of questions',
          parsedResponse: questions
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Calculate answer distribution for debugging
    const answerDistribution = questions.reduce((dist, q) => {
      const letter = ['A', 'B', 'C', 'D'][q.correctAnswer];
      dist[letter] = (dist[letter] || 0) + 1;
      return dist;
    }, { A: 0, B: 0, C: 0, D: 0 });

    // Count question types for analytics
    const questionTypeDistribution = questions.reduce((dist, q) => {
      const type = q.questionType || 'Onbekend';
      dist[type] = (dist[type] || 0) + 1;
      return dist;
    }, {});

    // Ensure each question has an objective
    const questionsWithObjectives = questions.map((q, index) => {
      if (!q.objective) {
        // If no objective is specified, assign to most likely objective based on question content
        const bestMatchIndex = objectivesArray.findIndex(obj => 
          q.question.toLowerCase().includes(obj.toLowerCase().substring(0, 20)));
        
        q.objective = bestMatchIndex >= 0 ? 
          objectivesArray[bestMatchIndex] : 
          objectivesArray[Math.floor(index / questionsPerObjective) % objectivesArray.length];
      }
      
      // Ensure questionType field exists
      if (!q.questionType) {
        // Basic classification based on question content
        if (q.question.match(/verschil|overeenkomst|vergelijk/i)) {
          q.questionType = 'Vergelijking';
        } else if (q.question.match(/betekent|definitie|wat is/i)) {
          q.questionType = 'Begrip';
        } else if (q.question.match(/berekent|percentage|aantal/i)) {
          q.questionType = 'Rekenen';
        } else if (q.question.match(/scenario|situatie|geval/i)) {
          q.questionType = 'Interpretatie';
        } else {
          q.questionType = 'Toepassing';
        }
      }
      
      return q;
    });

    // Group questions by objective for analysis
    const questionsByObjective = objectivesArray.map(objective => {
      const objQuestions = questionsWithObjectives.filter(q => q.objective === objective);
      return {
        objective,
        questionCount: objQuestions.length,
        types: objQuestions.reduce((types, q) => {
          types[q.questionType || 'Onbekend'] = (types[q.questionType || 'Onbekend'] || 0) + 1;
          return types;
        }, {})
      };
    });

    // Prepare the response
    const responsePayload = {
      success: true,
      questions: questionsWithObjectives,
      metadata: {
        bookId,
        chapterId,
        paragraphId,
        totalObjectives: objectivesArray.length,
        totalQuestions: questionsWithObjectives.length,
        questionsByObjective
      },
      context: {
        bookTitle,
        chapterTitle
      }
    };

    // Add debug info if requested
    if (debug) {
      responsePayload.debug = {
        prompt,
        response: aiResponse,
        answerDistribution,
        questionTypeDistribution,
        objectives,
        allObjectives: objectivesArray,
        tokenEstimates: {
          promptTokens: Math.ceil(prompt.length / 4),
          requestedMaxTokens: 4000
        }
      };
    }

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-online-marketing-quiz function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
