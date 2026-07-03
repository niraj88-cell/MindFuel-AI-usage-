// lib/intelligence/llm/types.ts — the shape of the (dormant) Claude refinement seam.
//
// Same discipline as lib/billing/: provider details live behind an adapter; application
// code only ever asks for a refined string. In Phase 1 there is no adapter — refineMessage
// is the identity function — so the product ships with ZERO AI dependency and zero cost.
// When ANTHROPIC_API_KEY is set (Phase 2), a Claude adapter slots in here WITHOUT changing
// any caller, because the contract below never changes: Claude only ever RE-PHRASES an
// already-safe template, and the output is re-validated (messages.validateMessage) before
// use — anything that fails falls back to the template. Claude is never load-bearing.

import type { Register } from '../types.ts'

export interface RefineRequest {
  /** The message intent (e.g. "insight:morning_strength") — for prompt selection later. */
  intent: string
  register: Register
  /** The already-composed, already-safe template text. This is the floor: never regress it. */
  text: string
  /** Domain-free context Claude may draw on. NEVER contains a domain, URL, or content. */
  evidence: string[]
}

export interface Refiner {
  refine(req: RefineRequest): Promise<string>
}
