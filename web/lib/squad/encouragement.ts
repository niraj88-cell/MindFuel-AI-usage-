// lib/squad/encouragement.ts — the fixed encouragement vocabulary.
// Ids (array indices) are what crosses the wire; the strings must mirror the CASE in
// encourage_session (migration 019). Fixed phrases are the design, not a limitation:
// no chat means no pressure to reply, nothing to moderate, nothing to check.

export const ENCOURAGEMENT_PHRASES = [
  'With you',
  'Cheering you on',
  'Stay strong',
  "You've got this",
] as const
