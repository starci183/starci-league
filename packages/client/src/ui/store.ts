// Cầu nối Phaser ↔ React: BoardScene đẩy ảnh chụp trạng thái trận vào đây sau mỗi lần vẽ,
// React (bảng bên phải, tooltip) đọc bằng useSyncExternalStore và gọi lại hành động qua `actions`.
import {
    useSyncExternalStore
} from "react"
import type {
    HandCard, Side
} from "@starci/shared"
import type {
    RoomState
} from "@starci/shared"

export type Selection =
  | { kind: "unit" | "roster"; id: string }
  | { kind: "hand"; uid: string; defId: string }
  | { kind: "set"; lane: number; defId: string }
  | null;

/** Thứ đang được rê chuột trên bàn Phaser (toạ độ màn hình để mở tooltip đúng chỗ) */
export type Hover = { kind: "unit"; id: string; x: number; y: number } | { kind: "monster"; lane: number; x: number; y: number } | null;

/** Hành động bảng bên phải gọi ngược vào BoardScene */
export interface PanelActions {
  endTurn(): void;
  toggleSmite(): void;
  toggleShop(): void;
  select(sel: Selection): void;
  cast(unitId: string, skillId: string): void;
  cancelPending(): void;
  confirmSummon(): void;
  useCard(uid: string): void;
  unequip(unitId: string, index: number): void;
}

export interface UiSnapshot {
  /** Trạng thái phòng (Colyseus, đọc trực tiếp) */
  s: RoomState | null;
  side: Side | null;
  hand: HandCard[];
  sel: Selection;
  pending: { unitId: string; skillId: string } | null;
  picks: number;
  summonNeed: number;
  smiteMode: boolean;
  shopOpen: boolean;
  /** Chữ giải thích khi rê chuột (chưa có tooltip riêng) */
  tip: string;
  hover: Hover;
  /** Vùng bảng bên phải trên màn hình (px CSS) */
  rect: { x: number; y: number; w: number; h: number } | null;
  /** Đang trong trận (bàn Phaser đang hiện) */
  inMatch: boolean;
}

let snap: UiSnapshot = {
    s: null, side: null, hand: [], sel: null, pending: null, picks: 0, summonNeed: 0, smiteMode: false, shopOpen: false,
    tip: "", hover: null, rect: null, inMatch: false,
}
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const ui = {
    actions: null as PanelActions | null,
    /** Ghi đè vài trường (luôn tạo object mới để React biết đã đổi) */
    set(patch: Partial<UiSnapshot>) { snap = {
        ...snap, ...patch
    }; emit() },
    get: () => snap,
    subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l) },
}

export const useUi = () => useSyncExternalStore(ui.subscribe,
    ui.get)
