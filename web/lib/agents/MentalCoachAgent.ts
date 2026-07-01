// lib/agents/MentalCoachAgent.ts
// LangGraph StateGraph — orchestrates the full AI coaching pipeline

import { StateGraph, END, START, Annotation } from '@langchain/langgraph'
import Groq from 'groq-sdk'
import { HumanMessage, SystemMessage, AIMessage, type BaseMessage } from '@langchain/core/messages'

// ── State Definition ──
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  userId: Annotation<string>(),
  userData: Annotation<Record<string, unknown> | null>({
    value: (_curr, update) => update,
    default: () => null,
  }),
  insights: Annotation<string[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  recommendations: Annotation<string[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  shouldNotify: Annotation<boolean>({
    value: (_curr, update) => update,
    default: () => false,
  }),
})

type AgentStateType = typeof AgentState.State

// ── Model: Groq (free tier). A tiny adapter keeps the LangGraph nodes unchanged — they still call
// invokeModel([...messages]) and read response.content, but the request now goes to Groq's free
// llama-3.3-70b instead of paid Gemini. If no GROQ_API_KEY is set, each node degrades to a calm,
// deterministic fallback so the pipeline never crashes and never costs anything. ──
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function groqReady(): boolean {
  const k = process.env.GROQ_API_KEY || ''
  return !!k && k !== 'your_free_groq_key_here'
}

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
  return _groq
}

// Map LangChain messages to Groq's chat format via each message's type tag.
function toGroqMessages(messages: BaseMessage[]) {
  return messages.map((m) => {
    const t = m._getType()
    const role: 'system' | 'user' | 'assistant' = t === 'system' ? 'system' : t === 'ai' ? 'assistant' : 'user'
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    return { role, content }
  })
}

// Returns an AIMessage so the graph's message reducer and every `response.content` read still work.
async function invokeModel(messages: BaseMessage[], fallback: string): Promise<AIMessage> {
  if (!groqReady()) return new AIMessage(fallback)
  try {
    const completion = await getGroq().chat.completions.create({
      messages: toGroqMessages(messages),
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 2048,
    })
    return new AIMessage(completion.choices[0]?.message?.content || fallback)
  } catch (err) {
    console.error('[MentalCoachAgent] Groq error:', err)
    return new AIMessage(fallback)
  }
}

// ── Node: Analyze User Data ──
async function analyzeUserData(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const systemMsg = new SystemMessage(
    `You are MindFuel's Behavioral Intelligence Engine — a world-class behavioral psychologist and neuroscientist AI.

Your job is to analyze a user's mental wellness data and identify the REAL patterns beneath the surface.

Rules:
- Go beyond basic statistics. Identify behavioral loops, neurochemical patterns, and timing correlations.
- Name specific psychological mechanisms (dopamine habituation, cortisol-driven avoidance scrolling, attention residue, default mode network activation).
- Be ruthlessly specific about numbers and trends.
- Extract 3-5 key insights ranked by psychological impact.
- NEVER be generic. If you can't find a specific pattern, say what data is missing.
- Tone: calm, intelligent, direct. Like a world-class therapist who also understands neuroscience.`
  )

  const userDataStr = state.userData
    ? JSON.stringify(state.userData, null, 2)
    : 'No data available — provide general wellness advice.'

  const humanMsg = new HumanMessage(
    `Analyze this user's mental wellness data and identify 3-5 key insights:\n\n${userDataStr}`
  )

  const response = await invokeModel(
    [systemMsg, humanMsg],
    'AI analysis is temporarily unavailable. Focus on one small, intentional action today.',
  )

  return {
    messages: [response],
    insights: [typeof response.content === 'string' ? response.content : JSON.stringify(response.content)],
  }
}

// ── Node: Generate Recommendations ──
async function generateRecommendations(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const insightsSummary = state.insights.join('\n')

  const systemMsg = new SystemMessage(
    `You are MindFuel's Behavioral Prescription Engine. Based on the psychological analysis, generate 3-5 specific, actionable micro-interventions.

Rules:
- Each recommendation MUST be something the user can do in under 5 minutes, TODAY.
- Frame as small experiments, not commands: "Try..." or "Experiment with..." not "You should..."
- Reference the specific neurochemical or psychological mechanism each recommendation targets.
- Prioritize by impact: the single most impactful intervention should be first.
- Be creative and specific — no generic "take a walk" or "meditate" advice unless tied to a specific pattern.
- If the user is doing well, reinforce what's working and suggest ONE stretch goal.
- Format as a numbered list with a brief rationale for each.`
  )

  const humanMsg = new HumanMessage(
    `Based on these insights:\n${insightsSummary}\n\nGenerate specific, actionable recommendations for today.`
  )

  const response = await invokeModel(
    [systemMsg, humanMsg],
    '1. Take one 25-minute focused block on your most important task.\n2. Put your phone in another room during it.\n3. Note how you feel afterward.',
  )
  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  return {
    messages: [response],
    recommendations: [content],
  }
}

// ── Node: Decide If Notification Needed ──
async function decideNotification(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const hasLowScores = state.userData &&
    typeof state.userData === 'object' &&
    'avg_score' in state.userData &&
    typeof state.userData.avg_score === 'number' &&
    state.userData.avg_score < 50

  return {
    shouldNotify: !!(hasLowScores || state.recommendations.length > 0),
  }
}

// ── Node: Format Response ──
async function formatResponse(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const systemMsg = new SystemMessage(
    `You are MindFuel's premium AI coach. Synthesize the analysis and recommendations into a warm, emotionally intelligent message.

Persona rules:
- Sound like a calm, intelligent friend who also happens to be a neuroscientist.
- NEVER sound robotic, corporate, or preachy.
- Be specific: reference their actual numbers, patterns, and content categories.
- Keep it under 200 words.
- Start with a genuine acknowledgment of what they did well (even small things).
- Be honest about concerning patterns, but frame them through the lens of "here's what's happening neurochemically" not "you're doing bad."
- End with exactly ONE specific, doable next step framed as a small experiment.
- Use natural language, not bullet points or lists. Write like a thoughtful text message.`
  )

  const humanMsg = new HumanMessage(
    `Insights:\n${state.insights.join('\n')}\n\nRecommendations:\n${state.recommendations.join('\n')}\n\nCreate a friendly coach message for the user.`
  )

  const response = await invokeModel(
    [systemMsg, humanMsg],
    "Here's your check-in: even small intentional choices add up. Pick one thing that matters and give it 25 focused minutes today, then notice how it feels.",
  )

  return {
    messages: [response],
  }
}

// ── Build the Graph ──
function createCoachGraph() {
  const graph = new StateGraph(AgentState)
    .addNode('analyze', analyzeUserData)
    .addNode('recommend', generateRecommendations)
    .addNode('notify_check', decideNotification)
    .addNode('format', formatResponse)
    .addEdge(START, 'analyze')
    .addEdge('analyze', 'recommend')
    .addEdge('recommend', 'notify_check')
    .addEdge('notify_check', 'format')
    .addEdge('format', END)

  return graph.compile()
}

// ── Export runnable agent ──
export const coachAgent = createCoachGraph()

// ── Convenience runner ──
export async function runCoachAgent(
  userId: string,
  userData: Record<string, unknown>
): Promise<{
  insights: string[]
  recommendations: string[]
  coachMessage: string
  shouldNotify: boolean
}> {
  const result = await coachAgent.invoke({
    messages: [],
    userId,
    userData,
    insights: [],
    recommendations: [],
    shouldNotify: false,
  })

  const lastMessage = result.messages[result.messages.length - 1]
  const coachMessage = typeof lastMessage.content === 'string'
    ? lastMessage.content
    : JSON.stringify(lastMessage.content)

  return {
    insights: result.insights,
    recommendations: result.recommendations,
    coachMessage,
    shouldNotify: result.shouldNotify,
  }
}

