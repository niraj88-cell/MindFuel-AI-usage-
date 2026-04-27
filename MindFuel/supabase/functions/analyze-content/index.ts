import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'https://deno.land/x/anthropic@0.8.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `You are a "Mental Nutrition" analyzer for MindFuel app.
    Analyze content (text, article, video description, or URL) and categorize it into ONE of these categories:

    - educational: Learning, courses, tutorials, skill development
    - productive: Work tasks, coding, writing, planning, organizing
    - creative: Art, music, design, creative writing, brainstorming
    - social: Messaging, video calls, positive social media interactions
    - entertainment: Movies, games, reading (fiction), light content
    - doomscroll: Negative news, endless scrolling, toxic content, anxiety-inducing
    - neutral: Mixed content or unclear intent

    Also assign a mental nutrition score from 1-100 where:
    - 90-100: Excellent for mental wellbeing (educational, highly productive, positive social)
    - 70-89: Good (productive, creative, positive entertainment)
    - 50-69: Neutral (general entertainment, mixed content)
    - 30-49: Needs moderation (distraction-heavy content)
    - 1-29: Harmful (doomscrolling, toxic, anxiety-inducing)

    Provide a brief 1-2 sentence summary of why this content fits the category and score.

    Respond with JSON only:
    {
      "category": "category_name",
      "mental_score": number,
      "summary": "brief explanation"
    }`;

    const userPrompt = `Analyze this content:\n\n${content.substring(0, 4000)}`;

    const msg = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest', // Fast and cost-effective
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    const responseText = msg.content[0].type === 'text' ? msg.content[0].text : '{}';

    // Extract JSON from response (Claude might add markdown)
    const jsonMatch = responseText.match(/\{.*\}/s);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;

    const analysis = JSON.parse(jsonStr);

    // Validate category
    const validCategories = ['educational', 'productive', 'creative', 'social', 'entertainment', 'doomscroll', 'neutral'];
    if (!validCategories.includes(analysis.category)) {
      analysis.category = 'neutral';
    }

    // Clamp score
    analysis.mental_score = Math.max(1, Math.min(100, analysis.mental_score || 50));

    return new Response(
      JSON.stringify(analysis),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({
        error: 'Analysis failed',
        category: 'neutral',
        mental_score: 50,
        summary: 'Fallback analysis - please try again'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
