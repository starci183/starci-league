import {
    useSyncExternalStore
} from "react"
import type {
    cg
} from "@starci/shared"

export interface CardInspectionContext {
    source: "hand" | "chain" | "reaction" | "deck" | "grave";
    side?: cg.Side;
    actor?: string;
    targets?: string[];
    link?: number;
    cancelled?: boolean;
    trigger?: cg.Trigger;
    count?: number;
}
export type Inspection = { kind: "card"; card: cg.Card; context: CardInspectionContext } | { kind: "unit"; unitId: string } | null
let value: Inspection = null
const listeners = new Set<() => void>()
const update = (next: Inspection) => { value = next; listeners.forEach((f) => f()) }
export const inspectionActions = {
    card(card: cg.Card, context: CardInspectionContext) {
        if ((card as cg.Card & { hidden?: boolean }).hidden) return
        update({
            kind: "card", card, context
        })
    },
    unit(unitId: string) { update({
        kind: "unit", unitId
    }) },
    clear() { update(null) }
}
export const useInspection = () => useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f) },
    () => value)
export const getInspection = () => value
