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
  }
}

export function generateWeeklyStory(data: any): WeeklyStoryData {
  // Infer archetype from data
  let topArchetype = 'Passive Consumer'
  const creator = data?.predictiveHealth?.digitalDNA?.creator || 0
  const learner = data?.predictiveHealth?.digitalDNA?.learner || 0
  const consumer = data?.predictiveHealth?.digitalDNA?.consumer || 0

  if (creator >= learner && creator >= consumer) topArchetype = 'Creator'
  else if (learner >= creator && learner >= consumer) topArchetype = 'Learner'

  // Generate a mock shift moment based on the data if one isn't provided
  // In a real system, this would be computed from the pattern engine (Phase 7)
  const shiftMoments = [
    {
      day: 'Wednesday',
      time: '2:15 PM',
      event: 'Opened Instagram',
      impact: 'Kicked off a 3-day pattern of afternoon scrolling that pulled your average score down 22 points.'
    },
    {
      day: 'Tuesday',
      time: '9:00 AM',
      event: 'Started a Deep Work Sprint',
      impact: 'Set a new baseline. Your focus capacity was 40% higher for the rest of the week.'
    },
    {
      day: 'Thursday',
      time: '11:30 PM',
      event: 'Late night YouTube binge',
      impact: 'Disrupted your sleep architecture, leading to a 30% drop in Friday morning vitality.'
    }
  ]

  // Pick one deterministically or semi-randomly for the demo
  const shiftIndex = data?.timeSavedMinutes ? (data.timeSavedMinutes % 3) : 0

  return {
    timeSavedMinutes: data?.timeSavedMinutes || 0,
    topArchetype,
    score: data?.predictiveHealth?.nutritionScore || 72,
    shiftMoment: shiftMoments[shiftIndex]
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
      return `Here's where the week turned. On ${story.shiftMoment.day} at ${story.shiftMoment.time}, you ${story.shiftMoment.event.toLowerCase()}. That one action ${story.shiftMoment.impact.toLowerCase()}`
    case 4:
      return `Overall, a ${story.score} out of 100. The good news? Your mornings are consistently strong. If we protect the afternoons, next week could be your best yet.`
    default:
      return ""
  }
}
