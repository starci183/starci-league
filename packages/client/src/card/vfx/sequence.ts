import type {
    cg
} from "@starci/shared"
import type {
    EffectEvent
} from "./semanticVfx"

export interface EffectBatch { start: number; end: number; events: EffectEvent[]; group?: string }
const isEffect = (event: cg.GameEvent): event is EffectEvent => event.t === "damage" || event.t === "heal" || event.t === "shield" || event.t === "status"

/** Only explicitly grouped adjacent effects share a beat. Resource payments,
 *  another action or an unrelated semantic receipt are ordering barriers. */
export function effectBatches(events: cg.GameEvent[]): EffectBatch[] {
    const batches: EffectBatch[] = []
    for (let i = 0; i < events.length; i++) {
        const event = events[i]
        if (!isEffect(event)) continue
        const batch: EffectBatch = {
            start: i, end: i + 1, events: [event], group: event.visualGroup
        }
        if (event.visualGroup) for (let j = i + 1; j < events.length; j++) {
            const next = events[j]
            if (isEffect(next)) {
                if (next.visualGroup !== event.visualGroup) break
                batch.events.push(next)
                batch.end = j + 1
            } else if (["teamManaChange",
                "play",
                "cast",
                "attack",
                "move",
                "chainResolve",
                "chainEnd",
                "mushroom"].includes(next.t)) break
        }
        batches.push(batch)
        i = batch.end - 1
    }
    return batches
}

/** One atomic group landing; parallel targets, sequential N cues per target. */
export async function runConcurrentTargets<T>(events: readonly T[], target: (event: T) => string, render: (event: T) => Promise<void>, land: () => void, active: () => boolean = () => true): Promise<void> {
    if (!active()) return
    land()
    const queues = new Map<string, T[]>()
    for (const event of events) {
        const key = target(event)
        queues.set(key,
            [...(queues.get(key) ?? []),
                event])
    }
    await Promise.all([...queues.values()].map(async queue => {
        for (const event of queue) {
            if (!active()) return
            await render(event)
        }
    }))
}

/** A presentation may contain many visual cues; its gameplay receipt lands once. */
export async function runVisualSequence<T>(cues: readonly T[], render: (cue: T, index: number) => Promise<void>, land: () => void, active: () => boolean = () => true): Promise<void> {
    if (!active()) return
    land()
    for (let index = 0; index < cues.length; index++) {
        if (!active()) return
        await render(cues[index],
            index)
    }
}

/** Full action recipes pair travel/impact per entry, while landing one receipt. */
export async function runActionVfxSequence<T>(cues: readonly T[], travel: (cue: T) => Promise<void>, impact: (cue: T) => Promise<void>, land: () => void, active: () => boolean = () => true, firstTravelDone = false): Promise<void> {
    if (!active()) return
    if (!cues.length) { land(); return }
    for (let index = 0; index < cues.length; index++) {
        if (!active()) return
        if (index || !firstTravelDone) await travel(cues[index])
        if (!active()) return
        if (!index) land()
        await impact(cues[index])
    }
}

export interface MovementTrack { unit: string; from: number; to: number; arc: number }

/** A swap has two physical tracks, while remaining one authoritative move event. */
export function movementTracks(move: { unit: string; from: number; to: number; with?: string }, kind: "swap" | "jump" = "swap"): MovementTrack[] {
    return move.with ? [
        {
            unit: move.unit, from: move.from, to: move.to, arc: kind === "jump" ? -130 : -48
        },
        {
            unit: move.with, from: move.to, to: move.from, arc: kind === "jump" ? 25 : 48
        }
    ] : [{
        unit: move.unit, from: move.from, to: move.to, arc: kind === "jump" ? -130 : 0
    }]
}
