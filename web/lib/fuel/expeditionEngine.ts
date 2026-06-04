// lib/fuel/expeditionEngine.ts

export const EXPEDITIONS = [
  {
    id: 'exp_silence',
    title: 'The Silence Experiment',
    description: 'No social media or news before noon for 3 days. Not because it\'s bad — because we want to observe your morning brain.',
    target_days: 3,
    difficulty: 'medium',
    category: 'observation',
    target_category: 'doomscroll',
  },
  {
    id: 'exp_swap',
    title: 'The Dopamine Swap',
    description: 'Replace 30 minutes of your evening scroll with reading or a podcast for 5 days. Let\'s see how it affects your sleep data.',
    target_days: 5,
    difficulty: 'hard',
    category: 'intervention',
    target_category: 'entertainment',
  },
  {
    id: 'exp_deep_dive',
    title: 'The Deep Dive',
    description: 'Two 60-minute Focus missions per day for 4 days. Pure cognitive output training.',
    target_days: 4,
    difficulty: 'hard',
    category: 'performance',
    target_category: 'productive',
  }
]

export function getExpeditionStartLine(id: string): string {
  switch (id) {
    case 'exp_silence':
      return "Here's the experiment. No social media before noon for 3 days. Not because it's bad — because I want to show you something about your morning brain. Game?"
    case 'exp_swap':
      return "Let's run a test. Swap 30 minutes of evening scrolling for reading. I hypothesize your morning energy will jump 20%. Let's prove it."
    case 'exp_deep_dive':
      return "This is pure cognitive training. Two hours of deep work a day. Your prefrontal cortex is going to feel this one. Ready?"
    default:
      return "Experiment initialized. Let's gather some data on your brain."
  }
}

export function getExpeditionProgressLine(id: string, currentDay: number, targetDays: number): string {
  // Final day
  if (currentDay === targetDays - 1) {
    return "Final day of the experiment. Whatever happens today, we've already learned something. Let's finish strong."
  }

  // Day 2 of Silence Experiment
  if (id === 'exp_silence' && currentDay === 1) {
    return "Day 2. You made it past noon yesterday. Your focus capacity was noticeably higher. Coincidence? Let's find out."
  }

  // Generic progress
  const lines = [
    `Day ${currentDay + 1}. The data is starting to tell a story. Keep going.`,
    `Logging Day ${currentDay}. Your behavioral baseline is already shifting.`,
    `Another day complete. You're overriding the algorithm's default programming.`
  ]
  
  return lines[currentDay % lines.length]
}

export function getExpeditionCompletionStory(id: string): string {
  switch (id) {
    case 'exp_silence':
      return "Experiment complete. Look at this: on the days you stayed offline before noon, your average focus session was 34% longer, and your afternoon crash was delayed by two hours. It wasn't just willpower — your brain simply had more fuel. That's your new baseline."
    case 'exp_swap':
      return "Experiment complete. By replacing the high-stimulation evening scroll, your nervous system actually had time to downregulate. The result? You woke up with 20% more baseline energy. You literally slept better because of what you didn't look at."
    case 'exp_deep_dive':
      return "Experiment complete. 8 hours of deep, uninterrupted cognitive output across 4 days. Most people don't do that in a month. Your attention span is like a muscle, and you just put it through intensive training. Impressive work, Boss."
    default:
      return "Experiment complete. We gathered the data, we proved the hypothesis, and your behavioral awareness just leveled up."
  }
}
