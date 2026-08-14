/** Minimal Host entry so the Loader can discover the browser half. */

/** The small part of Cordis Context this host-only entry uses. */
export interface EffectOwner {
  /** Register an effect that is disposed with the owning plugin. */
  effect(execute: () => () => void, label?: string): unknown
}

/**
 * Register an effect-owned no-op host contribution.
 * @param ctx - Host plugin context provided by Cordis.
 */
export function apply(ctx: EffectOwner): void {
  ctx.effect(() => () => {}, 'dsh-thinking-status-customizer: host loader entry')
}
