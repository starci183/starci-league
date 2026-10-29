// Kiểu dữ liệu của lõi luật "thẻ bài thuần". Toàn bộ GameState là JSON thuần (clone được bằng structuredClone).
// Không phụ thuộc Colyseus. Xem docs/CARDGAME_API.md.
import type {
    Game, UnitStats
} from "./game"

export type Side = "A" | "B";
export const SIDES: Side[] = ["A",
    "B"]
export const otherSide = (s: Side): Side => (s === "A" ? "B" : "A")

export type Role = "fighter" | "tank" | "assassin" | "marksman" | "mage" | "support";
export type DamageKind = "physical" | "magic" | "true";
export type SkillKey = "Q" | "E" | "R";
/** Thẻ hỗ trợ. "spell_<phép>" = phép bổ trợ (spells.ts). potion/buff là lá cũ, không còn trong bộ (giữ để tương thích). */
export type SupportId = "basic" | "gold" | "item" | "potion" | "draw" | "buff" | "legend" | "mana" | `spell_${string}`;

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
/** Giá trị `until` cho trạng thái KHÔNG BAO GIỜ hết (dùng g.status(..., { until: FOREVER })); không dùng Infinity vì JSON làm mất */
export const FOREVER = 1_000_000

/** Thứ tự mở đường (chỉ số đường 0..4): đường giữa trước, rồi lần lượt 2 bên */
export const LANE_ORDER = [2,
    1,
    3,
    0,
    4]
/** V3: các vòng được GỌI TƯỚNG (úp đồng thời, mỗi bên 1 tướng); đường LANE_ORDER[i] mở ở vòng SUMMON_ROUNDS[i] */
export const SUMMON_ROUNDS = [1,
    4,
    8,
    13,
    19]

export const RULES = {
    lives: LIVES,
    prizeCount: PRIZE_COUNT,
    /** Tối đa số mắt xích trong một Chuỗi */
    maxChain: 10,
    handMax: 10,
    /** Tay đầu: rút trước bước gọi tướng đầu tiên */
    startHand: 5,
    /** Luật chủ 30/10: rút 1 lá mỗi lượt (đã có quà Đánh Thường mỗi lượt (freeBasicEvery 1, cân bằng V3) và mảnh đồ mỗi 3 lượt) */
    drawPerTurn: 1,
    respawnRounds: 2,
    itemSlots: 3,
    /** Thứ tự mở đường */
    laneOrder: LANE_ORDER,
    /** V3: chỉ được gọi tướng ở các vòng này (mỗi mốc mở đúng 1 đường, mỗi bên gọi tối đa 1 tướng) */
    summonRounds: SUMMON_ROUNDS,
    /** Vòng mở đường, theo chỉ số đường 0..4 (đường laneOrder[i] mở ở summonRounds[i]) */
    laneOpenRound: [0,
        1,
        2,
        3,
        4].map((l) => SUMMON_ROUNDS[LANE_ORDER.indexOf(l)]) as number[],
    /** V3: cứ mỗi bấy nhiêu lượt CỦA MÌNH, người chơi được tặng 1 lá Đánh Thường / 1 mảnh đồ ngẫu nhiên (không lấy từ bộ bài) */
    freeBasicEvery: 1,
    freeItemEvery: 3,
    /** Số lá mỗi loại chiêu của MỖI tướng trong bộ bài (cố định, vào bộ từ đầu trận) */
    skillCopies: {
        Q: 8, E: 8, R: 2
    } as Record<SkillKey, number>,
    /** Số lá của bộ gốc người chơi xếp (deck.ts); mỗi tướng thêm 18 lá chiêu => 80 + 5 x 18 = 170 (bộ gấp đôi, chủ chốt 30/10) */
    sharedDeckSize: 80,
    /** Giới hạn CỨNG số đòn đánh mỗi người mỗi lượt: tính cả lá Đánh thường, đòn không cần lá của Đấu sĩ và đòn miễn phí (nextAttack free) */
    attackLimit: 3,
    /** Đòn không cần lá của Đấu sĩ: hệ số sát thương (Quick, 1 lần/lượt/đấu sĩ) */
    fighterCardlessMult: 0.66,
    /** Pháp sư: mana nhân 10 (mỗi tướng có thể đặt riêng qua HeroDef.mana) */
    mage: {
        manaMax: 100, manaStart: 100, manaRegen: 10,
        /** Chi phí mặc định khi SkillDef.mana thiếu */
        defaultCost: {
            Q: 20, E: 20, R: 50
        } as Record<SkillKey, number>,
        /** Mana lá hỗ trợ "mana" hồi */
        restoreCard: 30,
    },
    /** Trợ thủ được gọi ra sân lần đầu: lấy các lá chiêu này từ bộ lên tay */
    supportSummonKeys: ["Q",
        "E"] as SkillKey[],
    /** Hệ số sát thương của lá Đánh thường theo vai (nhân AD) */
    roleAttack: {
        fighter: 1, tank: 1, assassin: 1.25, marksman: 1, mage: 1, support: 1
    } as Record<Role, number>,
    /** Đã bỏ (+40% cũ); giữ 0 để không đổi API. Pháp sư dùng mana */
    mageSkillBonus: 0,
    /** Luật chủ 30/10 "Pháp sư nhận chiêu tạm": đầu lượt mỗi Pháp sư trên sân nhận 1 lá Q hoặc E (ngẫu nhiên) dạng lá tạm; không tính tay, hết lượt biến mất */
    mageTempSkill: true,
    /** Vết Thương Sâu (status "grievous"): hồi máu và Khiên nhận vào giảm bấy nhiêu */
    grievous: 0.5,
    chillBonus: 0.25,
    shredMult: 0.6,
    potion: {
        base: 100, pctMax: 0.1
    },
    buffCard: {
        dmg: 0.2, shield: 70
    },
    /** Hệ số chỉ số đồ RIÊNG chế độ thẻ bài (gói items dùng chung với chế độ cũ): máu tướng 300–500 nên máu của đồ thu nhỏ theo */
    itemScale: {
        hp: 0.4, atk: 1
    } as Record<string, number>,
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
  /** Lá Đồ: mảnh nào. Lá "legend" (đồ huyền thoại): id món */
  item?: string;
  /** Lá Bóng: sao chép lá chiêu nào (vd "zed_q") */
  copyOf?: string;
  /** Biến mất cuối lượt của người cầm nếu còn trên tay */
  temp?: boolean;
  /** Đang bị Hoá Băng: id tướng đã đóng băng. Lá băng nằm trên tay nhưng không đánh/ghép/nối chuỗi được; tan khi g.thawCards hoặc tướng đó rời sân. */
  frozen?: string;
  data?: Record<string, number | string>;
}

// ---------------- Tướng trên sân ----------------
export interface StatusInst {
  until: number; v: number;
  /** id tướng/token đã gắn trạng thái (nếu biết) */
  src?: string;
  /** lá/nguồn đã gắn: "<tướng>_<q|e|r>", "spell_<phép>", "basic", "<tướng>_p" (nội tại)... */
  card?: string;
  /** turnNo lúc gắn (hoặc lúc gia hạn): cùng `until` cho biết đã trôi bao nhiêu phần thời gian (đồng hồ quét trên icon) */
  at?: number;
  /** Cuối lượt của CHỦ trạng thái, v giảm bấy nhiêu; v <= 0 thì gỡ (Say Mê của Ahri...). Đặt bằng g.status(..., { decay }) */
  decay?: number;
}
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
  /** Chỉ pháp sư (undefined với vai khác và token). Công khai. Mana tối đa tính bằng g.maxMana(u). */
  mana?: number;
  /** V3: dấu trúng đòn (Nami Q, Braum Q): đồng minh của người đánh dấu đánh trúng thì tiêu 1 nấc và gây thêm sát thương */
  marks?: HitMark[];
  /** V3: hình dạng biến hình (Aatrox R). Công khai: client vẽ hình/khung khác. */
  transform?: Transform;
  /** V3: vòng mà từng món trong `items` được đeo (song song với items): Ornn tính "số vòng đã mặc" */
  itemSince?: number[];
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
  /** Úp mặt: đối thủ không thấy `secret`/`card` (server lọc) tới khi lật (g.flipToken, hoặc tự lật khi token rời sân) */
  hidden?: boolean;
  /** Dữ liệu bí mật của token úp (vd thùng thật/giả) */
  secret?: Record<string, string | number>;
  /** Lá bài gắn với token (vd lá dùng để tạo nó), bí mật nếu hidden */
  card?: Card;
  /** Tự biến mất sau N lượt của phe chủ (cuối lượt thứ N kể từ lúc gọi; lượt hiện tại tính là 1) */
  turns?: number;
}
export type TokenInfo = Required<Pick<TokenDef, "id" | "name" | "atk" | "armor" | "mr" | "damage" | "role" | "soak" | "overflow">> & {
  ownerId?: string;
  hidden?: boolean;
  secret?: Record<string, string | number>;
  card?: Card;
  /** turnNo mà token tự biến mất (cuối lượt đó), nếu có */
  expires?: number;
};
/** V3: dấu trúng đòn trên một tướng */
export interface HitMark {
  id: string;
  /** id tướng đã đánh dấu */
  src: string;
  hits: number;
  /** sát thương thêm mỗi đòn (đã tính sẵn lúc đánh dấu) */
  bonus: number;
  kind: DamageKind;
  /** turnNo mà dấu hết hạn (cuối lượt đó) */
  until: number;
}
/** V3: biến hình (g.transform) */
export interface Transform {
  id: string;
  /** turnNo mà biến hình hết hạn (cuối lượt đó) */
  until: number;
  at: number;
  src?: string;
  /** cộng vào g.stats */
  bonus: Partial<UnitStats>;
  /** máu tối đa đã cộng thêm (trừ lại khi hết) */
  hpBonus: number;
  /** nhân mọi hồi máu/Khiên nhận vào */
  healMult: number;
  /** có = hồi sinh 1 lần tại chỗ với chừng này máu khi sắp chết (rồi hết biến hình) */
  reviveHp?: number;
}
/** V3: hiệu ứng hẹn giờ (g.delay) bắn hook onDelayed của chủ vào đầu/cuối lượt của `side` */
export interface DelayedEffect {
  owner: string;
  key: string;
  at: "turnStart" | "turnEnd";
  side: Side;
  data?: Record<string, number | string>;
}
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
  /** Huỷ mắt xích ngay dưới (lá/đòn không có tác dụng; lá vẫn coi như đã dùng và vào mộ). Đặt qua g.chainFx().cancel = true (Janna Q, Soraka E, Blitz E) */
  cancel?: boolean;
  /** Cùng cancel: phe này "giật" lá bị huỷ (g.stealFromChain): lá chung về tay phe đó, lá chiêu bị đốt vào mộ chủ và bắn hook onSteal */
  stealBy?: Side;
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
  /** kind = "attack": "free" = đòn miễn phí từ buff, "cardless" = đòn không cần lá của Đấu sĩ (Quick, 66%) */
  mode?: "free" | "cardless";
  /** kind = "card", chiêu của pháp sư: mana đã trả khi kích hoạt */
  manaPaid?: number;
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
export interface TurnAttacks {
  /** số đòn đã tính (lá Đánh thường, đòn không cần lá, đòn miễn phí) */
  used: number;
  /** id các Đấu sĩ đã dùng đòn không cần lá trong lượt này */
  cardless: string[];
}
/** Bước gọi tướng úp: cả hai bên chọn cùng lúc, lật cùng lúc, tối đa `cap` tướng mỗi bên */
export interface BlindState {
  cap: number;
  /** Lựa chọn úp theo thứ tự (BÍ MẬT với phe kia tới khi lật) */
  picks: Record<Side, { hero: string; lane: number }[]>;
  /** Đã chốt (công khai) */
  ready: Record<Side, boolean>;
}
export interface GameState {
  seed: number; rng: number; nextUid: number;
  round: number; turnNo: number; active: Side;
  /** blind = gọi tướng úp đồng thời đầu vòng (GameState.blind; cả hai phe cùng hành động); summon = (cũ, không còn dùng); main = đánh bài; chain = đang chờ nối chuỗi */
  phase: "blind" | "summon" | "main" | "chain" | "over";
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
  /** Phe đã rút tay đầu (rút ngay khi tạo ván, trước bước gọi tướng đầu tiên) */
  opened?: Partial<Record<Side, boolean>>;
  /** Phe đã qua lượt đầu tiên của mình (lượt đầu không rút thêm bài đầu lượt) */
  firstTurnDone?: Partial<Record<Side, boolean>>;
  /** Bước GỌI TƯỚNG ÚP đồng thời (phase = "blind"): mỗi vòng, trước lượt của A. Server phải che picks của phe kia. */
  blind?: BlindState;
  /** Số đòn đã đánh của phe ĐANG CÓ LƯỢT (đặt lại ở beginTurn). Đọc qua g.turnAttacks() để khởi tạo lười. */
  turnAttacks?: TurnAttacks;
  /** Như turnAttacks nhưng cho phe KHÔNG có lượt (đòn không cần lá Quick đánh trong lượt đối thủ); đặt lại ở beginTurn */
  offTurnAttacks?: TurnAttacks;
  /** Tay của phe này đang LỘ cho đối thủ tới hết lượt turnNo đó (g.revealHand). Server gửi tay thật cho đối thủ khi còn hiệu lực. */
  handReveal?: Partial<Record<Side, number>>;
  /** V3: số lượt đã chơi của mỗi bên (tính cả lượt đang chạy); dùng cho quà tặng đều đặn (RULES.freeBasicEvery / freeItemEvery) */
  ownTurns?: Partial<Record<Side, number>>;
  /** V3: hiệu ứng hẹn giờ chưa bắn (g.delay) */
  delayed?: DelayedEffect[];
  /** Số đòn đã đánh của từng tướng trong lượt hiện tại (id -> n); đặt lại ở beginTurn. Đọc bằng g.attacksMadeBy(u). */
  attackCounts?: Record<string, number>;
  /** Tạm thời khi một lá chiêu địch giải quyết: id tướng miễn hiệu ứng của lá đó (xem hook onTargeted) */
  immune?: string[];
  /** Dấu mốc trên đường, công khai: markers[phe][đường 0..4] = danh sách id dấu (vd "dagger"). Thiếu = chưa có dấu nào. */
  markers?: Record<Side, string[][]>;
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
  /** Không có cardless = đòn miễn phí từ buff nextAttack (tính vào giới hạn 3). cardless = đòn không cần lá của Đấu sĩ (Quick: đánh được trong lượt mình hoặc nối chuỗi ở lượt đối thủ, 66%, 1 lần/lượt/Đấu sĩ, tính vào giới hạn 3) */
  | { t: "attack"; side: Side; actor: string; target: string; cardless?: true }
  /** Chốt bước gọi tướng úp (chỉ phase "blind"); summon trong phase "blind" là lựa chọn úp */
  | { t: "ready"; side: Side }
  /** Ghép 2 Đồ + 1 Vàng trên tay thành 1 lá ĐỒ HUYỀN THOẠI lên tay (support "legend", card.item = id món). `unit` cũ bị bỏ qua. */
  | { t: "craft"; side: Side; items: [string, string]; gold: string; unit?: string }
  /** Ghép tại chỗ: tướng `unit` đang mang 1 mảnh; `item` = uid lá mảnh thứ hai trên tay, `gold` = uid lá Vàng. Mảnh trong ô biến thành món theo bảng ghép (không tốn thêm ô). */
  | { t: "upgrade"; side: Side; unit: string; item: string; gold: string }
  | { t: "chain"; side: Side; uid: string; args?: PlayArgs }
  /** V3: tháo 1 món đồ khỏi tướng `unit` (id món): lá đồ về tay (tay đầy thì đốt). Hành động trong lượt mình. */
  | { t: "unequip"; side: Side; unit: string; item: string }
  /** Bỏ 1 lá trên tay xuống mộ (lượt mình, bước chính, miễn phí, không tính vào giới hạn hành động; không áp dụng cho lá tạm/đặc biệt; lá bị đóng băng vẫn bỏ được). Đi qua g.toGrave nên hook onDiscard chạy (reason "manual"). */
  | { t: "discard"; side: Side; uid: string }
  | { t: "pass"; side: Side }
  /** (Cũ) kết thúc bước gọi tướng rồi rút bài: không còn dùng, giữ để tương thích kiểu */
  | { t: "draw"; side: Side }
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
  | { t: "attack"; attacker: string; target: string; crit: boolean; miss: boolean; free: boolean; cardless?: boolean }
  | { t: "damage"; src?: string; target: string; amount: number; hpLost: number; absorbed: number; kind: DamageKind; tag: string; crit?: boolean; hp: number }
  | { t: "heal"; src?: string; target: string; amount: number; hp: number }
  | { t: "shield"; src?: string; target: string; amount: number; shield: number }
  | { t: "status"; target: string; id: string; turns: number; v: number; src?: string; card?: string }
  | { t: "statusEnd"; target: string; id: string }
  | { t: "stack"; unit: string; key: string; value: number }
  | { t: "move"; unit: string; from: number; to: number; with?: string }
  | { t: "kill"; src?: string; target: string }
  | { t: "lives"; side: Side; lives: number }
  | { t: "draw"; side: Side; card: Card; reason: string; by?: string }
  | { t: "drawAuto"; side: Side; card: Card }
  | { t: "discard"; side: Side; card: Card; reason: string }
  | { t: "burn"; side: Side; card: Card }
  /** Tay đầy: lá thừa bị đốt vào mộ (lá tạm/đặc biệt thì biến mất) */
  | { t: "cardBurned"; side: Side; card: Card; reason: "handFull" }
  /** Lá tạm bị gỡ khỏi tay cuối lượt của người cầm */
  | { t: "tempExpired"; side: Side; card: Card }
  /** Mắt xích bị huỷ bởi fx.cancel (lá vẫn vào mộ/biến mất như đã dùng) */
  | { t: "chainCancel"; n: number; side: Side; card?: Card }
  /** Lá trên tay `side` bị Hoá Băng / tan băng */
  | { t: "cardFrozen"; side: Side; card: Card; by: string }
  | { t: "cardThawed"; side: Side; card: Card }
  /** Tay của `side` hết bị lộ (bắt đầu lộ: sự kiện "reveal" có cards) */
  | { t: "revealEnd"; side: Side }
  | { t: "manaChange"; unit: string; mana: number; max: number; delta: number; reason: "summon" | "respawn" | "turn" | "spend" | "restore" | "effect" }
  /** Số đòn đã đánh / giới hạn của phe sau mỗi đòn tính */
  | { t: "attackCount"; side: Side; used: number; limit: number }
  /** Một phe đã chốt gọi tướng úp (không lộ chọn gì); tướng lộ ra bằng các sự kiện "summon" khi cả hai chốt */
  | { t: "blindLocked"; side: Side }
  /** Bắt đầu bước gọi tướng úp của vòng */
  | { t: "blindStart"; round: number; cap: number }
  | { t: "create"; side: Side; card: Card; zone: "hand" | "deck" | "grave" }
  | { t: "steal"; from: Side; to: Side; card: Card }
  | { t: "returnToHand"; side: Side; card: Card }
  | { t: "shuffle"; side: Side; what: "deck" | "graveIntoDeck"; count: number }
  /** Ghép xong (unit = undefined: món nằm trên tay dạng lá "legend"; unit có = rèn thẳng vào tướng, vd Ornn) */
  | { t: "craft"; side: Side; unit?: string; item: string; card?: Card }
  /** Đeo món đồ lên tướng (đánh lá "legend" hoặc hiệu ứng rèn thẳng) */
  | { t: "equip"; side: Side; unit: string; item: string }
  /** V3: tháo món `item` khỏi `unit`; `card` = lá đồ về tay (có thể bị đốt nếu tay đầy: sau đó có thêm cardBurned) */
  | { t: "unequip"; side: Side; unit: string; item: string; card: Card }
  /** V3: tặng lá đều đặn (không lấy từ bộ bài) */
  | { t: "freeCard"; side: Side; card: Card; kind: "basic" | "item" }
  /** V3: biến hình bật/tắt */
  | { t: "transform"; unit: string; id: string; on: boolean; reason?: string }
  /** V3: trạng thái ngẫu nhiên công khai của tướng (g.rollState) */
  | { t: "roll"; unit: string; key: string; value: number }
  /** Mảnh `from` trong ô của `unit` được ghép tại chỗ thành món `item` */
  | { t: "upgrade"; side: Side; unit: string; from: string; item: string }
  | { t: "chainAdd"; side: Side; n: number; card?: Card; kind: "card" | "attack"; actor?: string; targets: string[] }
  | { t: "chainWindow"; priority: Side; length: number }
  | { t: "chainResolve"; n: number; side: Side; card?: Card }
  | { t: "chainEnd"; length: number }
  | { t: "summonToken"; side: Side; unit: string; name: string; owner?: string }
  | { t: "tokenEnd"; unit: string; reason: "dead" | "owner" | "replaced" | "expired" }
  /** Token úp được lật: lộ lá/dữ liệu bí mật */
  | { t: "tokenFlip"; unit: string; card?: Card; secret?: Record<string, string | number> }
  | { t: "prize"; side: Side; card: Card; left: number }
  | { t: "pass"; side: Side }
  | { t: "reveal"; side: Side; to: Side; cards: Card[] }
  /** Dấu mốc trên đường (lane marker) được đặt (on) hoặc gỡ (!on): Dao Găm của Katarina... */
  | { t: "marker"; side: Side; lane: number; id: string; on: boolean }
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
  /** Mana đã trả để tung lá này (0 với tướng không phải pháp sư) */
  manaPaid: number;
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
  /** Chiêu enemy / enemies_upto được chọn cả vật triệu hồi ở ô phụ của địch (mặc định KHÔNG: chỉ đòn đánh của xạ thủ nhắm được token) */
  targetsTokens?: boolean;
  /** Không thể bị nối chuỗi (không ai được đáp lại lá này bằng lá Quick) */
  uncounterable?: boolean;
  /** Chi phí mana (chỉ pháp sư; số lẻ như 15, 25 được). Số hoặc hàm động. Thiếu = RULES.mage.defaultCost[key]. */
  mana?: number | "all" | ((c: OptCtx) => number);
  /** Với extra = "discard": bỏ tối đa N lá (liệt kê mọi tổ hợp 1..N lá khác nhau; mặc định 1 lá). args.discard là mảng uid. */
  discardMax?: number;
  resolve(ctx: Ctx): void;
}

export interface AttackInfo {
  attacker: Unit; target: Unit;
  raw: number; mult: number; kind: DamageKind;
  crit: boolean; miss: boolean; free: boolean;
  /** Đòn không cần lá của Đấu sĩ (free vẫn false) */
  cardless?: boolean;
  /** V3: hook onAttack đặt true = đòn này không thể chí mạng (Ashe) */
  noCrit?: boolean;
  /** Đòn thứ mấy (1, 2, 3...) của người đánh trong lượt hiện tại (Sát Thủ Kraken) */
  nth: number;
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
  /** Một lần hồi máu thật (mọi nguồn: chiêu, hút máu, đồ...). src = tướng gây hồi (có thể không có), amount = máu thật được hồi (> 0). */
  onHeal: { src?: Unit; target: Unit; amount: number };
  onShieldBreak: { target: Unit };
  onKill: { killer: Unit; victim: Unit };
  onDeath: { victim: Unit; killer?: Unit };
  /** Ghép xong 1 món (lá đồ huyền thoại lên tay; unit = undefined) */
  onCraft: { side: Side; unit?: Unit; item: string; gold: Card };
  /** Một món đồ được đeo lên tướng */
  onEquip: { side: Side; unit: Unit; item: string };
  onLifeLost: { side: Side; lives: number };
  /** `side` vừa cướp lá `card` (lá gốc) từ tay `from` bằng g.stealCard */
  onSteal: { side: Side; from: Side; card: Card };
  /** `target` vừa về 0 máu (chưa bị hạ). Hook có thể đặt target.hp > 0 để giữ nó sống. */
  /** hpLost = máu mục tiêu mất trong đòn này (nên hp = 0 lúc này); over = sát thương thừa; kind/tag = loại đòn. Hook có thể g.redirectLethal(d, người_khác) hoặc đặt target.hp > 0. */
  onLethal: { target: Unit; src?: Unit; hpLost: number; over: number; kind: DamageKind; tag: string };
  /** Đầu lượt của `side`: bắn cho tướng của side đang KHÔNG trên sân (dự bị hoặc đang chết). Hook của tướng tự lọc d.side === me.side. */
  onTurnStartAway: { side: Side };
  /** Tướng/đồ cộng dồn bộ đếm (g.stack) hoặc trạng thái cộng dồn (g.status add): d.n là lượng sắp cộng, hook được sửa d.n (Cuồng Đao: n + 1). src = id tướng gây (nếu biết). Không bắn với khoá kỹ thuật (item:, once:, aura:, itemT). */
  onHeroStack: { unit: Unit; key: string; n: number; src?: string };
  /** Sắp gắn trạng thái `id` lên `unit`: hook đặt d.cancel = true để huỷ (Khăn Giải Thuật: huỷ khống chế đầu tiên mỗi lượt) */
  onBeforeStatus: { unit: Unit; id: string; turns: number; v: number; cancel: boolean };
  /** Địch `src` sắp giải quyết lá chiêu `card` có `affected` (id tướng bị ảnh hưởng, đã gồm "mọi địch"). Hook đẩy id vào d.immune để tướng đó MIỄN mọi sát thương/trạng thái do lá này gây (Mũ Thích Nghi); lá vẫn bị tiêu. */
  onTargeted: { src: Unit; card: Card; skill: SkillDef; affected: string[]; immune: string[] };
  /** Pháp sư vừa trả mana để tung `card` */
  onManaSpent: { unit: Unit; amount: number; card: Card };
  /** Lá tạm của `side` bị gỡ khỏi tay cuối lượt */
  onTempExpired: { side: Side; card: Card };
  /** V3: một đòn đánh trúng tướng có dấu (g.addMark): dấu đã tiêu 1 nấc và gây thêm sát thương. Lọc d.mark.src === me.id. */
  onMarkHit: { mark: HitMark; attacker: Unit; target: Unit; info: AttackInfo; left: number };
  /** V3: hiệu ứng hẹn giờ (g.delay) tới hạn — CHỈ bắn cho tướng chủ */
  onDelayed: { key: string; owner: Unit; data?: Record<string, number | string> };
  /** V3: một món đồ được tháo khỏi tướng */
  onUnequip: { side: Side; unit: Unit; item: string };
  /** V3: biến hình kết thúc — CHỈ bắn cho tướng chủ */
  onTransformEnd: { unit: Unit; id: string; reason: "expire" | "revive" | "manual" | "death" };
  /** V3: `side` vừa nhận lá tặng đều đặn */
  onFreeCard: { side: Side; card: Card; kind: "basic" | "item" };
}
export type HookName = keyof HookData;
export type HeroHooks = { [K in HookName]?: (g: Game, me: Unit, d: HookData[K]) => void };

export interface HeroDef {
  id: string; name: string; role: Role;
  /** Loại sát thương của đòn đánh thường */
  damage: "physical" | "magic";
  hp: number; atk: number; armor: number; mr: number;
  /** Luật chủ 30/10: AP gốc luôn 0 (registry.ts ép về 0); AP chỉ đến từ đồ. Giữ trường để không vỡ API. */
  ap?: number;
  desc?: string;
  passive: { name: string; desc: string };
  skills: { Q: SkillDef; E: SkillDef; R: SkillDef };
  hooks?: HeroHooks;
  /** Đường được phép gọi vào (mặc định: ô trống đang mở). Zed ghi đè. */
  summonLanes?(g: Game, side: Side): number[];
  /** Mục tiêu tự đánh cuối lượt (đấu sĩ mặc định tướng đối diện; Kog E...). Trả undefined = không đánh. */
  autoAttack?(g: Game, me: Unit): Unit | undefined;
  /** Nhân sát thương cho MỌI sát thương trong trận khi tướng này đang trên sân (kể cả sát thương lên đồng đội/địch): trả hệ số (1 = giữ). Nội tại giảm sát thương, "lần đầu x2" (Braum, Malphite, Garen, Qiyana, Janna R...). Có thể có tác dụng phụ (đánh dấu). Không gọi g.damage bên trong. */
  modifyDamage?(g: Game, me: Unit, d: { src?: Unit; target: Unit; kind: DamageKind; tag: string; crit?: boolean }): number;
  /** V3: hào quang đồ (Ornn): với MỖI món đồ đang mặc của đồng minh (kể cả chính mình), trả % cộng thêm (0.12 = +12%) lên mọi chỉ số KHÔNG PHẢI máu của món đó. `roundsWorn` = số vòng món đã được mặc. Trong lúc tính, g.stats/atk/ap trả giá trị CHƯA có hào quang (an toàn khi đọc chỉ số của mình). */
  itemAura?(g: Game, me: Unit, wearer: Unit, item: string, roundsWorn: number): number;
  /** Chỉ số cộng thêm cho CHÍNH tướng này (cộng vào g.stats): Lux AP theo mana, Yorick ATK theo mộ, Ornn Rèn. Không gọi g.stats/atk/ap bên trong. */
  bonusStats?(g: Game, me: Unit): Partial<UnitStats>;
  /** Số lá rút thêm ở bước rút đầu lượt của chủ khi tướng này đang trên sân (Twisted Fate: 1) */
  drawBonus?(g: Game, me: Unit): number;
  /** Mục tiêu đánh thường THÊM (không qua khiêu khích), vd Thùng của chính mình cho Gangplank */
  extraAttackTargets?(g: Game, me: Unit): Unit[];
  /** Cách dùng thêm cho BẤT KỲ lá trên tay của chủ (đánh lá với args.pick = id): tốn 1 lượt đánh, không qua Chuỗi, lá rời tay (Gangplank: úp làm Thùng giả) */
  handUse?: {
    id: string;
    name: string;
    can(g: Game, me: Unit, card: Card): boolean;
    resolve(g: Game, me: Unit, card: Card): void;
  };
  /** Pháp sư: ghi đè mana (thiếu khoá = RULES.mage). Đơn vị đã nhân 10 */
  mana?: { max?: number; start?: number; regen?: number };
  /** @deprecated V2: engine bỏ qua (luôn 4Q/4E/1R). File tướng sẽ xoá trường này. */
  skillCopies?: Partial<Record<SkillKey, number>>;
  /** @deprecated V2: không còn lá hỗ trợ riêng của tướng. Engine bỏ qua. */
  supportCopies?: Partial<Record<SupportId, number>>;
  /** true = khung chưa viết, bot/selfplay bỏ qua */
  todo?: boolean;
  /** Gợi ý cho bot (botEval.ts): giá trị tương lai của thế cờ nhìn thấy trên bàn. Không ảnh hưởng luật. */
  bot?: HeroBotHint;
}
/**
 * Gợi ý chấm điểm cho bot "hard" (botEval.ts). Mọi số đo bằng "điểm ~ 1 máu": dấu/stack đáng bấy nhiêu máu sát thương
 * sẽ gây ra (hoặc giá trị tương đương) trong vài lượt tới. Chỉ đọc trạng thái NHÌN THẤY trên bàn.
 */
export interface HeroBotHint {
  /** Mỗi điểm stack (Unit.stacks[key]) trên chính tướng này */
  stackValue?: Record<string, number>;
  /** Mỗi điểm v của trạng thái (status id) tướng này gắn lên tướng ĐỊCH (dấu chờ kích nổ / tự cháy) */
  markValue?: Record<string, number>;
  /** Mỗi điểm v của trạng thái tướng này gắn lên tướng MÌNH (buff) */
  buffValue?: Record<string, number>;
  /** Vật triệu hồi của tướng này: giá trị cố định khi còn trên sân */
  tokenValue?: number;
  /** Mỗi điểm stack trên vật triệu hồi của tướng này (Thuốc Súng của thùng...) */
  tokenStackValue?: Record<string, number>;
  /** Mỗi lá chiêu của tướng này nằm trong mộ bài phe mình (Viktor bậc, Zed Bóng, Yorick Linh Hồn) */
  graveCardValue?: number;
  /** Xác suất tiên nghiệm token úp của tướng này là "thật" (đối thủ không được nhìn secret) */
  hiddenPrior?: number;
  /** Điểm trừ vào giá trị gọi tướng này ra sân lúc này (tướng lợi khi còn ngoài sân, vd Vayne nạp Đêm) */
  holdBack?: (g: Game, u: Unit) => number;
}
export interface SpecialCardDef {
  id: string; name: string; desc: string;
  /** Tự bật khi bị rút (Nấm). Lá chiếm lượt rút đó rồi biến mất. */
  onDraw?(g: Game, card: Card, side: Side): void;
  /** Lá đánh được như một chiêu (cần card.hero + card.side để biết tướng tung): lá lựa chọn tạm do tướng tạo (đặt Thùng thật/giả, chọn đồng minh Rèn...). Nên tạo kèm temp: true. */
  skill?: SkillDef;
}
