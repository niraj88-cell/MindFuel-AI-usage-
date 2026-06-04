import { z } from 'zod'

// ── Schema ──
export const NeuroStateSchema = z.object({
  dopamine: z.object({
    level: z.enum(['depleted', 'low', 'baseline', 'elevated', 'spiking']),
    percentage: z.number().min(0).max(100),
    trend: z.enum(['falling', 'stable', 'rising']),
    driver: z.string(),
  }),
  cortisol: z.object({
    level: z.enum(['calm', 'mild', 'moderate', 'elevated', 'spiking']),
    percentage: z.number().min(0).max(100),
    trend: z.enum(['falling', 'stable', 'rising']),
    driver: z.string(),
  }),
  serotonin: z.object({
    level: z.enum(['depleted', 'low', 'baseline', 'healthy', 'optimal']),
    percentage: z.number().min(0).max(100),
    trend: z.enum(['falling', 'stable', 'rising']),
    driver: z.string(),
  }),
  focus_capacity: z.object({
    level: z.enum(['exhausted', 'fragmented', 'moderate', 'sharp', 'flow_ready']),
    percentage: z.number().min(0).max(100),
    trend: z.enum(['falling', 'stable', 'rising']),
    driver: z.string(),
  }),
  overall_state: z.enum(['crisis', 'strained', 'neutral', 'good', 'thriving']),
  summary: z.string(),
})

export type NeuroState = z.infer<typeof NeuroStateSchema>

interface RecentActivity {
  category: string
  mental_score: number
  duration_minutes: number
  created_at: string
}

interface RecentMood {
  mood: number
  energy?: number | null
  anxiety?: number | null
  created_at: string
}

// ── Core estimation engine ──
export function estimateNeuroState(
  recentLogs: RecentActivity[],
  recentMoods: RecentMood[],
  todayPulse: number | null,
  focusMinutesToday: number
): NeuroState {
  // ── Time context ──
  const now = new Date()
  const hour = now.getHours()
  const isLateNight = hour >= 22 || hour < 5

  // ── Dopamine Analysis ──
  // Short-form/doomscroll content spikes dopamine then depletes it
  const last3Hours = recentLogs.filter(l => {
    const diff = (now.getTime() - new Date(l.created_at).getTime()) / 3600000
    return diff <= 3
  })

  const doomscrollMins = last3Hours
    .filter(l => l.category === 'doomscroll' || l.category === 'entertainment')
    .reduce((sum, l) => sum + l.duration_minutes, 0)

  const productiveMins = last3Hours
    .filter(l => ['educational', 'productive', 'creative'].includes(l.category))
    .reduce((sum, l) => sum + l.duration_minutes, 0)

  const shortSessions = last3Hours.filter(l => l.duration_minutes < 5).length

  let dopaminePercentage: number
  let dopamineLevel: NeuroState['dopamine']['level']
  let dopamineTrend: NeuroState['dopamine']['trend']
  let dopamineDriver: string

  if (doomscrollMins > 30) {
    dopaminePercentage = Math.max(15, 40 - doomscrollMins)
    dopamineLevel = 'depleted'
    dopamineTrend = 'falling'
    dopamineDriver = `${doomscrollMins} min of high-stimulation content depleted your baseline`
  } else if (doomscrollMins > 10) {
    dopaminePercentage = Math.max(30, 55 - doomscrollMins)
    dopamineLevel = 'low'
    dopamineTrend = shortSessions > 3 ? 'falling' : 'stable'
    dopamineDriver = 'Recent scroll sessions pulled dopamine above baseline, causing mild depletion'
  } else if (productiveMins > 20) {
    dopaminePercentage = Math.min(80, 60 + productiveMins / 3)
    dopamineLevel = 'elevated'
    dopamineTrend = 'rising'
    dopamineDriver = 'Sustained purposeful work is building healthy dopamine through achievement'
  } else if (focusMinutesToday > 30) {
    dopaminePercentage = 70
    dopamineLevel = 'baseline'
    dopamineTrend = 'stable'
    dopamineDriver = 'Focus sessions are maintaining a healthy dopamine equilibrium'
  } else {
    dopaminePercentage = 55
    dopamineLevel = 'baseline'
    dopamineTrend = 'stable'
    dopamineDriver = 'No significant dopamine disruptors detected recently'
  }

  // ── Cortisol Analysis ──
  const latestMood = recentMoods[0]
  const anxiety = latestMood?.anxiety ?? 3
  const avgMood = recentMoods.length > 0
    ? recentMoods.reduce((sum, m) => sum + m.mood, 0) / recentMoods.length
    : 5

  let cortisolPercentage: number
  let cortisolLevel: NeuroState['cortisol']['level']
  let cortisolTrend: NeuroState['cortisol']['trend']
  let cortisolDriver: string

  if (anxiety >= 8 || (isLateNight && doomscrollMins > 15)) {
    cortisolPercentage = Math.min(95, 70 + anxiety * 3)
    cortisolLevel = 'spiking'
    cortisolTrend = 'rising'
    cortisolDriver = isLateNight
      ? 'Late-night screen exposure is elevating cortisol and suppressing melatonin'
      : 'High reported anxiety combined with stimulating content is spiking stress hormones'
  } else if (anxiety >= 6 || avgMood < 4) {
    cortisolPercentage = Math.min(75, 50 + anxiety * 4)
    cortisolLevel = 'elevated'
    cortisolTrend = avgMood < 3.5 ? 'rising' : 'stable'
    cortisolDriver = 'Elevated anxiety is keeping cortisol above optimal levels'
  } else if (anxiety >= 4) {
    cortisolPercentage = 45
    cortisolLevel = 'moderate'
    cortisolTrend = 'stable'
    cortisolDriver = 'Moderate baseline stress — normal for active digital use'
  } else if (focusMinutesToday > 20 || productiveMins > 15) {
    cortisolPercentage = 25
    cortisolLevel = 'calm'
    cortisolTrend = 'falling'
    cortisolDriver = 'Focused work and low-anxiety state are keeping cortisol optimally low'
  } else {
    cortisolPercentage = 35
    cortisolLevel = 'mild'
    cortisolTrend = 'stable'
    cortisolDriver = 'No significant stress indicators detected'
  }

  // ── Serotonin Analysis ──
  const energy = todayPulse ?? (latestMood?.energy ?? 3)
  const hasEducational = last3Hours.some(l => l.category === 'educational')
  const hasCreative = last3Hours.some(l => l.category === 'creative')

  let serotoninPercentage: number
  let serotoninLevel: NeuroState['serotonin']['level']
  let serotoninTrend: NeuroState['serotonin']['trend']
  let serotoninDriver: string

  if ((hasEducational || hasCreative) && avgMood >= 6) {
    serotoninPercentage = Math.min(90, 70 + energy * 4)
    serotoninLevel = 'optimal'
    serotoninTrend = 'rising'
    serotoninDriver = 'Creative and learning activities combined with positive mood are boosting serotonin'
  } else if (avgMood >= 6 || energy >= 4) {
    serotoninPercentage = Math.min(75, 55 + energy * 4)
    serotoninLevel = 'healthy'
    serotoninTrend = 'stable'
    serotoninDriver = 'Positive mood baseline is maintaining healthy serotonin levels'
  } else if (avgMood >= 4) {
    serotoninPercentage = 50
    serotoninLevel = 'baseline'
    serotoninTrend = doomscrollMins > 15 ? 'falling' : 'stable'
    serotoninDriver = 'Neutral mood state — serotonin at baseline'
  } else if (doomscrollMins > 20) {
    serotoninPercentage = Math.max(20, 35 - doomscrollMins / 2)
    serotoninLevel = 'low'
    serotoninTrend = 'falling'
    serotoninDriver = 'Extended passive consumption is suppressing serotonin production'
  } else {
    serotoninPercentage = 35
    serotoninLevel = 'low'
    serotoninTrend = 'stable'
    serotoninDriver = 'Low mood and energy suggest depleted serotonin reserves'
  }

  // ── Focus Capacity ──
  let focusPercentage: number
  let focusLevel: NeuroState['focus_capacity']['level']
  let focusTrend: NeuroState['focus_capacity']['trend']
  let focusDriver: string

  if (focusMinutesToday > 60 && shortSessions < 3) {
    focusPercentage = Math.min(95, 75 + focusMinutesToday / 10)
    focusLevel = 'flow_ready'
    focusTrend = 'rising'
    focusDriver = 'Strong focus session history today — your prefrontal cortex is primed for deep work'
  } else if (focusMinutesToday > 25 && doomscrollMins < 15) {
    focusPercentage = 70
    focusLevel = 'sharp'
    focusTrend = 'stable'
    focusDriver = 'Moderate focus time with low distractions — attention networks are healthy'
  } else if (shortSessions > 5 || doomscrollMins > 20) {
    focusPercentage = Math.max(15, 35 - shortSessions * 3)
    focusLevel = 'fragmented'
    focusTrend = 'falling'
    focusDriver = `${shortSessions} quick-check sessions have fragmented your attention residue`
  } else if (doomscrollMins > 30 && focusMinutesToday < 10) {
    focusPercentage = 10
    focusLevel = 'exhausted'
    focusTrend = 'falling'
    focusDriver = 'Extended scrolling with no focus blocks — prefrontal cortex is depleted'
  } else {
    focusPercentage = 55
    focusLevel = 'moderate'
    focusTrend = 'stable'
    focusDriver = 'Average focus capacity — could be improved with a focused block'
  }

  // ── Overall ──
  const avgPercentage = (dopaminePercentage + (100 - cortisolPercentage) + serotoninPercentage + focusPercentage) / 4

  let overallState: NeuroState['overall_state']
  if (avgPercentage >= 75) overallState = 'thriving'
  else if (avgPercentage >= 60) overallState = 'good'
  else if (avgPercentage >= 40) overallState = 'neutral'
  else if (avgPercentage >= 25) overallState = 'strained'
  else overallState = 'crisis'

  // Summary
  const summaryMap: Record<NeuroState['overall_state'], string> = {
    thriving: 'Your brain chemistry is in an excellent state. Protect this momentum.',
    good: 'Healthy neural balance. A focused work block right now would push you into flow.',
    neutral: 'Your brain is stable but not optimized. One intentional action could shift the balance.',
    strained: 'Multiple systems are under strain. Consider a 10-minute offline reset.',
    crisis: 'Your neurochemistry needs a hard reset. Step away from all screens for 15 minutes.',
  }

  return {
    dopamine: { level: dopamineLevel, percentage: dopaminePercentage, trend: dopamineTrend, driver: dopamineDriver },
    cortisol: { level: cortisolLevel, percentage: cortisolPercentage, trend: cortisolTrend, driver: cortisolDriver },
    serotonin: { level: serotoninLevel, percentage: serotoninPercentage, trend: serotoninTrend, driver: serotoninDriver },
    focus_capacity: { level: focusLevel, percentage: focusPercentage, trend: focusTrend, driver: focusDriver },
    overall_state: overallState,
    summary: summaryMap[overallState],
  }
}
