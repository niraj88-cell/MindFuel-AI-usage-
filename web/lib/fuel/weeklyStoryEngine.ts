// lib/fuel/weeklyStoryEngine.ts

export interface WeeklyStoryData {
  timeSavedMinutes: number
  topArchetype: string
  score: number
  shiftMoment: {
    day: string
    time: string
    event: string
    impact: string
  } | null
  finalAdvice: string
}

export function generateWeeklyStory(data: any): WeeklyStoryData {
  // Infer archetype from data
  let topArchetype = 'Passive Consumer'
  const creator = data?.predictiveHealth?.digitalDNA?.creator || 0
  const learner = data?.predictiveHealth?.digitalDNA?.learner || 0
  const consumer = data?.predictiveHealth?.digitalDNA?.consumer || 0

  if (creator >= learner && creator >= consumer) topArchetype = 'Creator'
  else if (learner >= creator && learner >= consumer) topArchetype = 'Learner'

  return {
    timeSavedMinutes: data?.timeSavedMinutes || 0,
    topArchetype,
    score: data?.predictiveHealth?.nutritionScore || 72,
    shiftMoment: data?.shiftMoment || null,
    finalAdvice: data?.finalAdvice || "Consistency is building. You're maintaining a stable baseline."
  }
}

export function getStoryNarration(slideIndex: number, story: WeeklyStoryData): string {
  switch (slideIndex) {
    case 0:
      return "Let's take a look at your week. I've compiled the data, and there's a clear story here."
    case 1:
      return `First, the good news. You reclaimed ${story.timeSavedMinutes} minutes of focus this week. That's time you took back from the algorithm.`
    case 2:
      return `Your digital DNA is skewing towards ${story.topArchetype}. Your brain is spending more time building and learning than just consuming.`
    case 3:
      if (!story.shiftMoment) return "You're still building your baseline. Keep logging to discover your turning points."
      return `Here's where the week turned. On ${story.shiftMoment.day} at ${story.shiftMoment.time}, you ${story.shiftMoment.event.toLowerCase()}. That one action ${story.shiftMoment.impact.toLowerCase()}`
    case 4:
      return `Overall, a ${story.score} out of 100. ${story.finalAdvice}`
    default:
      return ""
  }
}
