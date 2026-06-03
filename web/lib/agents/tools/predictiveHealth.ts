import { subDays, isAfter } from 'date-fns'

export interface PredictiveHealthMetrics {
  burnoutRisk: 'Low' | 'Moderate' | 'High' | 'Critical'
  focusTrajectory: 'Improving' | 'Stable' | 'Declining'
  learningGrowth: number
  predictedScoreDrop: number
  digitalDNA: {
    creator: number
    consumer: number
    learner: number
  }
  warningMessage?: string
  successMessage?: string
}

export function calculatePredictiveHealth(logs: any[]): PredictiveHealthMetrics {
  if (!logs || logs.length === 0) {
    return {
      burnoutRisk: 'Low',
      focusTrajectory: 'Stable',
      learningGrowth: 0,
      predictedScoreDrop: 0,
      digitalDNA: { creator: 33, consumer: 33, learner: 33 }
    }
  }

  const now = new Date()
  const last7Days = logs.filter(l => isAfter(new Date(l.created_at), subDays(now, 7)))
  
  if (last7Days.length < 3) {
    return {
      burnoutRisk: 'Low',
      focusTrajectory: 'Stable',
      learningGrowth: 0,
      predictedScoreDrop: 0,
      digitalDNA: { creator: 33, consumer: 33, learner: 33 }
    }
  }

  // --- Calculate Digital DNA ---
  let createCount = 0
  let consumeCount = 0
  let learnCount = 0

  last7Days.forEach(l => {
    if (l.category === 'creative' || l.category === 'productive') createCount++
    else if (l.category === 'educational') learnCount++
    else consumeCount++
  })

  const total = createCount + consumeCount + learnCount
  const digitalDNA = {
    creator: Math.round((createCount / total) * 100),
    learner: Math.round((learnCount / total) * 100),
    consumer: Math.round((consumeCount / total) * 100)
  }

  // --- Focus Trajectory ---
  // Compare first half of the week to second half
  const midPoint = subDays(now, 3.5)
  const firstHalf = last7Days.filter(l => !isAfter(new Date(l.created_at), midPoint))
  const secondHalf = last7Days.filter(l => isAfter(new Date(l.created_at), midPoint))

  const avg1 = firstHalf.length > 0 ? firstHalf.reduce((s, l) => s + l.mental_score, 0) / firstHalf.length : 50
  const avg2 = secondHalf.length > 0 ? secondHalf.reduce((s, l) => s + l.mental_score, 0) / secondHalf.length : 50

  let focusTrajectory: 'Improving' | 'Stable' | 'Declining' = 'Stable'
  if (avg2 < avg1 - 10) focusTrajectory = 'Declining'
  else if (avg2 > avg1 + 10) focusTrajectory = 'Improving'

  // --- Burnout Risk ---
  let burnoutRisk: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low'
  const doomscrollLogs = last7Days.filter(l => l.category === 'doomscroll' || l.category === 'entertainment')
  const passiveRatio = doomscrollLogs.length / last7Days.length

  if (passiveRatio > 0.7 && focusTrajectory === 'Declining') burnoutRisk = 'Critical'
  else if (passiveRatio > 0.5) burnoutRisk = 'High'
  else if (passiveRatio > 0.3) burnoutRisk = 'Moderate'

  // --- Predictions & Messages ---
  let predictedScoreDrop = 0
  let warningMessage
  let successMessage

  if (burnoutRisk === 'Critical' || burnoutRisk === 'High') {
    predictedScoreDrop = Math.max(0, Math.round((avg1 - avg2) * 1.5))
    warningMessage = `Your content diet is strongly correlated with reduced focus. If this pattern continues, your average score is projected to drop by ${predictedScoreDrop}% next week.`
  }

  if (digitalDNA.learner > 40 && digitalDNA.creator > 20) {
    successMessage = "You are on track for your healthiest digital week this month. High learning and creation patterns detected."
  }

  return {
    burnoutRisk,
    focusTrajectory,
    learningGrowth: digitalDNA.learner,
    predictedScoreDrop,
    digitalDNA,
    warningMessage,
    successMessage
  }
}
