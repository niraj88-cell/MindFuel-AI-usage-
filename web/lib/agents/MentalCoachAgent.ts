// lib/agents/MentalCoachAgent.ts
// LangGraph StateGraph — orchestrates the full AI coaching pipeline

import { StateGraph, END, START, Annotation } from '@langchain/langgraph'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
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

// ── Gemini Model (lazy init to avoid build-time crash) ──
let _model: ChatGoogleGenerativeAI | null = null
function getModel() {
  if (!_model) {
    _model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxOutputTokens: 2048,
    })
  }
  return _model
}

// ── Node: Analyze User Data ──
async function analyzeUserData(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const systemMsg = new SystemMessage(
    `You are MindFuel's AI Coach analyzing a user's mental wellness data. Extract key patterns, concerns, and areas for improvement. Be specific about numbers and trends.`
  )

  const userDataStr = state.userData
    ? JSON.stringify(state.userData, null, 2)
    : 'No data available — provide general wellness advice.'

  const humanMsg = new HumanMessage(
    `Analyze this user's mental wellness data and identify 3-5 key insights:\n\n${userDataStr}`
  )

  const response = await getModel().invoke([systemMsg, humanMsg])

  return {
    messages: [response],
    insights: [typeof response.content === 'string' ? response.content : JSON.stringify(response.content)],
  }
}

// ── Node: Generate Recommendations ──
async function generateRecommendations(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const insightsSummary = state.insights.join('\n')

  const systemMsg = new SystemMessage(
    `You are MindFuel's recommendation engine. Based on the analysis, generate 3-5 specific, actionable recommendations. Each should be something the user can do TODAY. Format as a numbered list.`
  )

  const humanMsg = new HumanMessage(
    `Based on these insights:\n${insightsSummary}\n\nGenerate specific, actionable recommendations for today.`
  )

  const response = await getModel().invoke([systemMsg, humanMsg])
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
    `You are MindFuel's friendly AI coach. Synthesize the analysis and recommendations into a warm, encouraging, but honest message to the user. Keep it under 200 words. Use emoji sparingly. Start with their score summary and end with one actionable next step.`
  )

  const humanMsg = new HumanMessage(
    `Insights:\n${state.insights.join('\n')}\n\nRecommendations:\n${state.recommendations.join('\n')}\n\nCreate a friendly coach message for the user.`
  )

  const response = await getModel().invoke([systemMsg, humanMsg])

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

