// Kiểu của state phòng đấu sau khi Colyseus giải mã ở client / script (khớp DuelState trong packages/server/src/schema.ts).
// MapSchema hành xử như Map, ArraySchema hành xử như mảng. Chỉ có kiểu, không có mã chạy.
import type {
    Side
} from "./cards"
import type {
    UnitLike, ZoneLike
} from "./types"
import type {
    MonsterLike
} from "./jungle"

export interface UnitView extends UnitLike {
    moved: boolean;
    items: string[];
    cooldowns: Map<string, number>;
    statuses: Map<string, number>;
    stacks: Map<string, number>;
}

export interface PlayerView {
    sessionId: string;
    name: string;
    side: Side;
    mana: number;
    maxMana: number;
    gold: number;
    nexus: number;
    towers: number[];
    traps: boolean[];
    handCount: number;
    deckCount: number;
    bench: string[];
    summonReady: boolean;
    streak: number;
    smiteRound: number;
}

export interface MonsterView extends MonsterLike {
    id: string;
    dmgA: number;
    dmgB: number;
}

export interface ZoneView extends ZoneLike {
    hp: number;
    maxHp: number;
}

export interface RoomState {
    phase: string;
    turn: number;
    round: number;
    activeSide: string;
    winner: string;
    summonCount: number;
    nexusHit: boolean;
    units: Map<string, UnitView>;
    players: Map<string, PlayerView>;
    draftStep: number;
    bans: string[];
    picksA: string[];
    picksB: string[];
    monsters: MonsterView[];
    zones: ZoneView[];
    log: string[];
    fxSeq: number;
    fx: string;
}
