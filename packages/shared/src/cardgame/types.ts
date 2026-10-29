// Kiểu dữ liệu của lõi luật "thẻ bài thuần". Toàn bộ GameState là JSON thuần (clone được bằng structuredClone).
// Không phụ thuộc Colyseus. Xem docs/CARDGAME_API.md.
import type {
    Game
} from "./game"

export type Side = "A" | "B";
export const SIDES: Side[] = ["A",
    "B"]
export const otherSide = (s: Side): Side => (s === "A" ? "B" : "A")

export type Role = "fighter" | "tank" | "assassin" | "marksman" | "mage" | "support";
export type DamageKind = "physical" | "magic" | "true";
export type SkillKey = "Q" | "E" | "R";
export type SupportId = "basic" | "gold" | "item" | "potion" | "draw" | "buff";

/** 8 mảnh đồ dùng trong chế độ thẻ bài (bảng ghép 8x8 = 36 món). Bỏ Pha Lê Lam và Cuốc Chim. */
export const COMPONENTS = ["kiem_dai",
    "gay_qua_kho",
    "cung_go",
    "gang_tay",
    "giap_luoi",
    "ao_choang",
    "dai_khong_lo",
    "nuoc_mat"] as const

/** Số mạng để thua (mỗi lần tướng chết mất 1). Đổi 1 dòng này để chỉnh luật thắng. */
export const LIVES = 7
/** Số lá thưởng úp đầu trận mỗi bên (kiểu Pokémon): mỗi lần hạ 1 tướng địch thì người hạ lật 1 lá lên tay. */
export const PRIZE_COUNT = 6
/** Chỉ số đường của Ô TRIỆU HỒI PHỤ (ngoài 5 đường 0..4) */
export const EXTRA_LANE = 5

export const RULES = {
    lives: LIVES,
    prizeCount: PRIZE_COUNT,
    /** Tối đa số mắt xích trong một Chuỗi */
    maxChain: 10,
    handMax: 10,
    startHand: 5,
    drawPerTurn: 2,
    respawnRounds: 3,
    itemSlots: 3,
    /** Vòng mở đường, theo chỉ số đường 0..4 (đường 1..5) */
    laneOpenRound: [8,
        4,
        1,
        4,
        8] as number[],
    /** Số lá mỗi loại chiêu trong bộ bài của một tướng */
    skillCopies: {
        Q: 6, E: 6, R: 2
    } as Record<SkillKey, number>,
    /** Bộ bài gốc mỗi bên (trước khi có tướng ra sân) */
    baseDeck: {
        basic: 10, gold: 6, item: 6
    } as Partial<Record<SupportId, number>>,
    /** 20 thẻ hỗ trợ mỗi tướng mang vào bộ */
    heroSupport: {
        basic: 6, gold: 4, item: 4, potion: 2, draw: 2, buff: 2
    } as Record<SupportId, number>,
    /** Hệ số sát thương của lá Đánh thường theo vai (nhân AD) */
    roleAttack: {
        fighter: 1, tank: 1, assassin: 3.5, marksman: 2, mage: 1, support: 1
    } as Record<Role, number>,
    mageSkillBonus: 0.25,
    chillBonus: 0.25,
    shredMult: 0.6,
    potion: {
        base: 150, pctMax: 0.1
    },
    buffCard: {
        dmg: 0.2, shield: 100
    },
    critBase: 1.5,
    /** 1 điểm manaRegen của đồ = bấy nhiêu AP (không có mana trong chế độ này) */
    manaRegenToAp: 1.2,
    maxActionsPerTurn: 120,
}

// ---------------- Lá bài ----------------
export interface Card {
  uid: string;
  /** skill = lá chiêu của một tướng; wild = thẻ chiêu chung; support = thẻ hỗ trợ; special = lá do chiêu tạo ra (Nấm, Bóng) */
  kind: "skill" | "wild" | "support" | "special";
  /** skill: "darius_q"; wild: "wild_q" | "wild_e" | "wild_r"; support: SupportId; special: "mushroom"... */
  id: string;
  /** Tướng chủ của lá chiêu (hoặc lá Bóng) */
  hero?: string;
  /** Phe sở hữu tướng chủ (lá bị cướp vẫn nhớ chủ gốc) */
  side?: Side;
  /** Lá Đồ: mảnh nào */
  item?: string;
  /** Lá Bóng: sao chép lá chiêu nào (vd "zed_q") */
  copyOf?: string;
  /** Biến mất cuối lượt của người cầm nếu còn trên tay */
  temp?: boolean;
  data?: Record<string, number | string>;
}

// ---------------- Tướng trên sân ----------------
export interface StatusInst { until: number; v: number }
/** Buff của đòn đánh kế tiếp (Nami E, Blitz E, TF R...). Tiêu hết khi tướng đánh. */
export interface NextAttackBuff {
  id: string;
  /** id tướng đã tạo buff (để hook nhận ra: Nami rút bài nếu đòn chí mạng) */
  source: string;
  /** Đòn này không cần lá Đánh thường */
  free?: boolean;
  bonusRaw?: number;
  bonusKind?: DamageKind;
  mult?: number;
}
export interface Unit {
  id: string; // `${side}:${hero}`
  hero: string;
  side: Side;
  /** reserve = chưa ra sân, board = trên sân, dead = đang chờ hồi sinh */
  status: "reserve" | "board" | "dead";
  lane: number; // -1 nếu không ở trên sân
  homeLane: number;
  hp: number; maxHp: number; shield: number;
  items: string[]; // id đồ huyền thoại đã ghép
  /** Trạng thái có thời hạn: stun, silence, chill (Buốt), shred (Rã giáp), taunt, empower, blind... */
  statuses: Record<string, StatusInst>;
  /** Bộ đếm riêng của tướng (giữ qua các lần chết): dấu Darius, Kog Stack, điểm Viktor... */
  stacks: Record<string, number>;
  nextAttack: NextAttackBuff[];
  respawnRound: number;
  deaths: number;
  /** Có = đây là VẬT TRIỆU HỒI (token) ở ô triệu hồi phụ, không phải tướng: không tính mạng khi chết, không có lá */
  token?: TokenInfo;
}
/** Định nghĩa vật triệu hồi (dữ liệu thuần, truyền cho g.summonToken) */
export interface TokenDef {
  /** id loại token (vd "ice_wall") */
  id: string; name: string;
  hp: number; atk?: number; armor?: number; mr?: number;
  /** Loại sát thương đòn đánh của token (mặc định physical) */
  damage?: "physical" | "magic";
  /** Vai (mặc định fighter) */
  role?: Role;
  /** Khiên ban đầu */
  shield?: number;
  /** Tướng chủ (id unit). Chủ rời sân/chết thì token biến mất. */
  ownerId?: string;
  /** "Máu ảo" của chủ: sát thương nhắm chủ đánh vào token trước tới khi token chết. Mặc định true nếu có ownerId. */
  soak?: boolean;
  /** Sát thương thừa khi token vỡ có chảy sang chủ không (sát thương chuẩn). Mặc định false. */
  overflow?: boolean;
}
export type TokenInfo = Required<Pick<TokenDef, "id" | "name" | "atk" | "armor" | "mr" | "damage" | "role" | "soak" | "overflow">> & { ownerId?: string };
export interface Player {
  side: Side;
  heroes: string[];
  /** deck[0] là lá trên cùng */
  deck: Card[];
  hand: Card[];
  grave: Card[];
  lives: number;
}
export interface Trigger {
  side: Side; card: Card; actor?: string; target: string;
  /** Chiêu/đòn này nhắm đúng 1 tướng bên phản ứng (Braum Q) */
  single?: boolean;
  /** Chiêu nhắm nhiều tướng: tối đa N hoặc mọi tướng (Braum E) */
  multi?: boolean;
  /** Chiêu bị chặn là chiêu cuối (R) */
  ult?: boolean;
  /** id các tướng bên phản ứng có thể thay làm mục tiêu mới (đổi mục tiêu) */
  redirectable?: string[];
}
/** Hiệu ứng tạm trong lúc giải quyết lá gốc sau cửa sổ phản ứng. Xoá ngay khi lá gốc xong. */
export interface ReactFx {
  /** Đổi mục tiêu của lá gốc sang tướng này */
  redirect?: string;
  /** Giảm sát thương nhận vào của phe cutSide (0..1) */
  cut?: number; cutSide?: Side;
  /** Phe cutSide miễn hiệu ứng khống chế */
  cutNoCc?: boolean;
  /** Tướng này phản lại reflectPct sát thương nhận từ kẻ tấn công */
  reflectUnit?: string; reflectPct?: number;
}
/** Một mắt xích của Chuỗi (Chain). links[0] là lá gốc, giải quyết từ mắt xích CUỐI về ĐẦU. */
export interface ChainLink {
  /** thứ tự 1.. */
  n: number;
  side: Side;
  kind: "card" | "attack";
  /** Lá đã đánh (kind = card) — công khai */
  card?: Card;
  /** Tướng đánh/tung chiêu */
  actor?: string;
  args: PlayArgs;
  /** Tướng bị nhắm (cho client vẽ mũi tên) */
  targets: string[];
  /** Mô tả mắt xích này cho bên kia xét điều kiện quickWhen */
  trigger: Trigger;
  /** Mắt xích do nối chuỗi (Quick) thay vì lá gốc */
  quick: boolean;
  /** Trigger của mắt xích mà nó đáp lại (đưa vào ctx.trigger khi giải quyết) */
  reactTo?: Trigger;
}
export interface Chain {
  links: ChainLink[];
  /** Bên đang có quyền nối chuỗi */
  priority: Side;
  /** Số lần bỏ qua liên tiếp (2 = giải quyết) */
  passes: number;
  /** đã phát sự kiện chainAdd cho lá gốc */
  opened?: boolean;
}
export interface GameState {
  seed: number; rng: number; nextUid: number;
  round: number; turnNo: number; active: Side;
  phase: "main" | "chain" | "over";
  actionsThisTurn: number;
  players: Record<Side, Player>;
  units: Record<string, Unit>;
  /** lanes[side][đường] = id tướng đang đứng (hoặc null) */
  lanes: Record<Side, (string | null)[]>;
  /** Chuỗi đang mở (phase = "chain" khi đang chờ quyết định nối/bỏ qua), null nếu không */
  chain: Chain | null;
  /** Ô triệu hồi phụ mỗi bên: id token đang đứng (hoặc null) */
  extra: Record<Side, string | null>;
  /** Số lá thưởng còn úp của mỗi bên (công khai) */
  prizes: Record<Side, number>;
  /** Lá thưởng úp (BÍ MẬT với cả hai bên tới khi lật; server không gửi) */
  prizeCards: Record<Side, Card[]>;
  /** Hiệu ứng tạm của lá Quick, áp lên mắt xích ngay dưới nó rồi xoá (xem ReactFx) */
  fx?: ReactFx;
  /** Hiệu ứng tạm do mắt xích ĐANG giải quyết tạo ra cho mắt xích ngay dưới (ghi qua g.chainFx()) */
  fxNext?: ReactFx;
  winner: Side | null;
  endReason: "lives" | "deck" | null;
  /** Thống kê nhẹ cho script mô phỏng */
  stats: Record<Side, { kills: number; damage: number; cardsPlayed: number }>;
}

// ---------------- Hành động ----------------
export interface PlayArgs {
  /** Đánh thường: tướng ra đòn. Thẻ chiêu chung (wild): tướng tung chiêu. */
  actor?: string;
  target?: string;
  /** Chiêu "tối đa N tướng": các tướng được chọn */
  targets?: string[];
  lane?: number;
  color?: "blue" | "red" | "gold";
  /** uid lá trên tay bị bỏ */
  discard?: string[];
  /** lựa chọn tự do khác: uid / id lá, tên chế độ... */
  pick?: string;
}
export type Action =
  | { t: "summon"; side: Side; hero: string; lane: number }
  | { t: "play"; side: Side; uid: string; args?: PlayArgs }
  | { t: "attack"; side: Side; actor: string; target: string }
  | { t: "craft"; side: Side; items: [string, string]; gold: string; unit: string }
  | { t: "chain"; side: Side; uid: string; args?: PlayArgs }
  | { t: "pass"; side: Side }
  | { t: "end"; side: Side };

// ---------------- Sự kiện (cho client chơi hiệu ứng / log) ----------------
export type GameEvent =
  | { t: "roundStart"; round: number; openLanes: number[] }
  | { t: "turnStart"; side: Side; round: number }
  | { t: "turnEnd"; side: Side }
  | { t: "summon"; unit: string; lane: number; swapped?: string }
  | { t: "respawn"; unit: string; lane: number }
  | { t: "play"; side: Side; card: Card; args?: PlayArgs; reaction?: boolean }
  | { t: "cast"; unit: string; skill: string; target?: string }
  | { t: "attack"; attacker: string; target: string; crit: boolean; miss: boolean; free: boolean }
  | { t: "damage"; src?: string; target: string; amount: number; hpLost: number; absorbed: number; kind: DamageKind; tag: string; crit?: boolean; hp: number }
  | { t: "heal"; src?: string; target: string; amount: number; hp: number }
  | { t: "shield"; src?: string; target: string; amount: number; shield: number }
  | { t: "status"; target: string; id: string; turns: number; v: number }
  | { t: "statusEnd"; target: string; id: string }
  | { t: "stack"; unit: string; key: string; value: number }
  | { t: "move"; unit: string; from: number; to: number; with?: string }
  | { t: "kill"; src?: string; target: string }
  | { t: "lives"; side: Side; lives: number }
  | { t: "draw"; side: Side; card: Card; reason: string; by?: string }
  | { t: "drawAuto"; side: Side; card: Card }
  | { t: "discard"; side: Side; card: Card; reason: string }
  | { t: "burn"; side: Side; card: Card }
  | { t: "create"; side: Side; card: Card; zone: "hand" | "deck" | "grave" }
  | { t: "steal"; from: Side; to: Side; card: Card }
  | { t: "returnToHand"; side: Side; card: Card }
  | { t: "shuffle"; side: Side; what: "deck" | "graveIntoDeck"; count: number }
  | { t: "craft"; side: Side; unit: string; item: string }
  | { t: "chainAdd"; side: Side; n: number; card?: Card; kind: "card" | "attack"; actor?: string; targets: string[] }
  | { t: "chainWindow"; priority: Side; length: number }
  | { t: "chainResolve"; n: number; side: Side; card?: Card }
  | { t: "chainEnd"; length: number }
  | { t: "summonToken"; side: Side; unit: string; name: string; owner?: string }
  | { t: "tokenEnd"; unit: string; reason: "dead" | "owner" | "replaced" }
  | { t: "prize"; side: Side; card: Card; left: number }
  | { t: "pass"; side: Side }
  | { t: "reveal"; side: Side; to: Side; cards: Card[] }
  | { t: "log"; text: string }
  | { t: "end"; winner: Side; reason: "lives" | "deck" };

// ---------------- API tướng ----------------
/**
 * Chọn mục tiêu kiểu Yu-Gi-Oh (không theo đường):
 * - none / self / all_enemies / all_allies: không cần chọn (resolve tự lấy g.enemies(self) / g.allies(self))
 * - opposite: tướng địch đối diện (đấu sĩ cận chiến; không cần chọn, ctx.target = g.opposite(self); không có thì không đánh được)
 * - enemy: 1 tướng địch (args.target) · ally: 1 tướng mình, kể cả bản thân · ally_other: 1 đồng minh khác
 * - enemies_upto / allies_upto: chọn 1..max tướng (args.targets), max ghi ở SkillDef.max
 * - lane: chọn 1 đường đang mở (args.lane). CHỈ dùng cho DI CHUYỂN/đổi chỗ tướng (không có vùng/AOE theo ô).
 */
export type TargetKind = "none" | "self" | "all_enemies" | "all_allies" | "opposite" | "enemy" | "ally" | "ally_other" | "enemies_upto" | "allies_upto" | "lane";
export type ExtraKind = "color" | "discard";

export interface Ctx {
  g: Game;
  /** Tướng dùng lá */
  self: Unit;
  side: Side;
  card: Card;
  args: PlayArgs;
  /** Mục tiêu đơn (đã đổi thành Unit). Lá phản ứng: tướng đang bị nhắm */
  target?: Unit;
  /** Mọi mục tiêu còn trên sân: [target] hoặc các tướng đã chọn (enemies_upto/allies_upto) */
  targets: Unit[];
  lane?: number;
  trigger?: Trigger;
  /** Tính công thức theo chỉ số của tướng dùng lá: ctx.f("40 + 60% AD") */
  f(expr: string): number;
  /** Lá này quay về tay thay vì vào mộ (Darius R hạ gục, Viktor Q bậc 3) */
  toHand(): void;
  /** Lá này biến mất, không vào mộ */
  vanish(): void;
}
export interface OptCtx { g: Game; side: Side; self: Unit; card: Card; trigger?: Trigger }

export interface SkillDef {
  key: SkillKey;
  name: string;
  /** Mô tả Việt có công thức {…} */
  desc: string;
  target: TargetKind | TargetKind[];
  /** N của enemies_upto / allies_upto */
  max?: number;
  extra?: ExtraKind;
  /** Điều kiện tối thiểu để đánh (vd Darius R cần có tướng đối diện) */
  canPlay?(c: OptCtx): boolean;
  /** Ghi đè cách liệt kê lựa chọn (Soraka E bỏ tuỳ ý...). Trả về các PlayArgs hợp lệ. */
  options?(c: OptCtx): PlayArgs[];
  /** Nhãn QUICK: chiêu này đánh được trong lượt mình như thường, VÀ được kích hoạt để nối Chuỗi lên lá vừa đánh (cả lượt đối thủ). */
  quick?: boolean;
  /** Điều kiện kích hoạt khi NỐI CHUỖI (mắt xích đang đáp lại mô tả bởi trigger). Không khai báo = nối được với mọi mắt xích. */
  quickWhen?(c: OptCtx & { trigger: Trigger }): boolean;
  /** Quick chỉ dùng để nối chuỗi, không đánh được chủ động (resolve dùng ctx.trigger; ctx.target = trigger.target) */
  chainOnly?: boolean;
  resolve(ctx: Ctx): void;
}

export interface AttackInfo {
  attacker: Unit; target: Unit;
  raw: number; mult: number; kind: DamageKind;
  crit: boolean; miss: boolean; free: boolean;
  bonus: { raw: number; kind: DamageKind }[];
  buffs: NextAttackBuff[];
}
/** Dữ liệu từng hook (xem docs/CARDGAME_API.md) */
export interface HookData {
  onSummon: { unit: Unit };
  onRespawn: { unit: Unit };
  onTurnStart: { side: Side };
  onTurnEnd: { side: Side };
  onRoundStart: { round: number };
  onDraw: { side: Side; card: Card; reason: string; by?: string };
  onDiscard: { side: Side; card: Card; reason: string };
  onBurn: { side: Side; card: Card };
  onPlay: { side: Side; card: Card; unit?: Unit };
  onCast: { caster: Unit; card: Card; skill: SkillDef; target?: Unit };
  onAttack: { attacker: Unit; target: Unit; info: AttackInfo };
  onAttackHit: { attacker: Unit; target: Unit; info: AttackInfo; dealt: number };
  onCrit: { attacker: Unit; target: Unit; info: AttackInfo };
  onDamage: { src?: Unit; target: Unit; amount: number; hpLost: number; kind: DamageKind; tag: string; crit?: boolean };
  onShieldBreak: { target: Unit };
  onKill: { killer: Unit; victim: Unit };
  onDeath: { victim: Unit; killer?: Unit };
  onCraft: { side: Side; unit: Unit; item: string; gold: Card };
  onLifeLost: { side: Side; lives: number };
  /** `side` vừa cướp lá `card` (lá gốc) từ tay `from` bằng g.stealCard */
  onSteal: { side: Side; from: Side; card: Card };
}
export type HookName = keyof HookData;
export type HeroHooks = { [K in HookName]?: (g: Game, me: Unit, d: HookData[K]) => void };

export interface HeroDef {
  id: string; name: string; role: Role;
  /** Loại sát thương của đòn đánh thường */
  damage: "physical" | "magic";
  hp: number; atk: number; armor: number; mr: number;
  /** AP gốc luôn 0: AP chỉ từ đồ */
  desc?: string;
  passive: { name: string; desc: string };
  skills: { Q: SkillDef; E: SkillDef; R: SkillDef };
  hooks?: HeroHooks;
  /** Đường được phép gọi vào (mặc định: ô trống đang mở). Zed ghi đè. */
  summonLanes?(g: Game, side: Side): number[];
  /** Mục tiêu tự đánh cuối lượt (đấu sĩ mặc định tướng đối diện; Kog E...). Trả undefined = không đánh. */
  autoAttack?(g: Game, me: Unit): Unit | undefined;
  /** true = khung chưa viết, bot/selfplay bỏ qua */
  todo?: boolean;
}
export interface SpecialCardDef {
  id: string; name: string; desc: string;
  /** Tự bật khi bị rút (Nấm). Lá chiếm lượt rút đó rồi biến mất. */
  onDraw?(g: Game, card: Card, side: Side): void;
}
