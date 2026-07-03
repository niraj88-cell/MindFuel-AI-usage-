// lib/intelligence/llm/refine.ts — the dormant Claude refinement entry point.
//
// PHASE 1: no adapter, no SDK, no network. refineMessage returns the template text
// unchanged. The one thing that IS live and tested here is the safety contract every
// future Claude output must pass — applyRefinement — so the guarantee exists before the
// capability does.

import { validateMessage } from '../messages.ts'
import type { RefineRequest } from './types.ts'

/** True only when an Anthropic key is configured. Off by default ⇒ fully deterministic. */
export function llmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * The permanent safety gate on any rephrasing. A candidate is used ONLY if it is non-empty
 * and passes the same validator every template passes; otherwise the original stands.
 * This is what makes Claude non-load-bearing: a bad rephrase can never reach a person.
 */
export function applyRefinement(base: string, candidate: string | null | undefined): string {
  const c = (candidate ?? '').trim()
  return c && validateMessage(c).ok ? c : base
}

/**
 * refineMessage — returns a possibly-improved version of req.text. In Phase 1 (no key, no
 * adapter) this is the identity function. Phase 2 replaces the marked line with a call to
 * the Anthropic adapter; the applyRefinement gate below stays exactly as is.
 */
export async function refineMessage(req: RefineRequest): Promise<string> {
  if (!llmEnabled()) return req.text
  // --- Phase 2 inserts: candidate = await anthropicAdapter.refine(req) ---
  const candidate: string | null = req.text // dormant: no rephrasing yet
  return applyRefinement(req.text, candidate)
}
