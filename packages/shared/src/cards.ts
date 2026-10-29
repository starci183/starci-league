export type Side = "A" | "B";
/** Hàng trong nửa sân: tiền tuyến (sát hàng quái) → giữa → hậu tuyến (sát trụ) */
export type Row = "front" | "mid" | "back";
export const ROWS: Row[] = ["front",
    "mid",
    "back"]
/** 0 = tiền tuyến, 2 = hậu tuyến */
export const rowIndex = (r: string) => Math.max(0,
    ROWS.indexOf(r as Row))
export const ROW_NAME: Record<Row, string> = {
    front: "tiền tuyến", mid: "hàng giữa", back: "hậu tuyến"
}
export type Role = "tank" | "fighter" | "assassin" | "mage" | "marksman" | "support";

/** rows: hàng được đặt khi triệu hồi · range: tầm đánh thường (số ô, tính cả hàng quái) */
export const ROLE_INFO: Record<Role, { name: string; rows: Row[]; range: number; perk: string }> = {
    tank: {
        name: "Đỡ đòn", rows: ["front",
            "mid"], range: 2, perk: "Kiên Cố: đứng tiền tuyến nhận ít hơn 10% sát thương."
    },
    fighter: {
        name: "Đấu sĩ", rows: ["front",
            "mid"], range: 2, perk: "Tay Đôi: đánh thường gây thêm 15% sát thương lên mục tiêu đứng một mình trong đường của nó; khi không có đồng minh nào cùng đường, đấu sĩ nhận ít hơn 10% sát thương."
    },
    assassin: {
        name: "Sát thủ", rows: ["front",
            "mid",
            "back"], range: 3, perk: "Lướt: vai duy nhất được tự đi 1 ô mỗi lượt (vai khác cần Tốc Biến hoặc chiêu); đánh thường với tới mọi hàng trong cùng đường, ưu tiên xạ thủ/pháp sư và gây thêm 20% sát thương lên họ."
    },
    mage: {
        name: "Pháp sư", rows: ["mid",
            "back"], range: 4, perk: "Phép lan: đánh thường gây sát thương phép, lan 50% sang tướng địch đứng kề mục tiêu."
    },
    marksman: {
        name: "Xạ thủ", rows: ["mid",
            "back"], range: 4, perk: "Bắn Tỉa: đánh thường gây thêm 10% sát thương lên mục tiêu lượt trước không di chuyển."
    },
    support: {
        name: "Trợ thủ", rows: ["front",
            "mid",
            "back"], range: 3, perk: "Hỗ Trợ: khiên và hồi máu của trợ thủ mạnh hơn 15% lên đồng minh đứng kề."
    },
}

/** Các đường bình đẳng như nhau: không đường nào có hiệu ứng riêng */
export const LANES = [1,
    2,
    3,
    4,
    5].map((n) => ({
    name: `Đường ${n}`, effect: ""
}))
export const LANE_MID = 2

// ================= LUẬT VÁN =================
/** Nhà: phá Nhà là thắng */
export const NEXUS_HP = 1300
/** Trụ đứng trước Nhà ở mỗi đường: đường trống thì đánh trụ, trụ sập mới đánh được Nhà */
export const TOWER_HP = 650
/** Công trình nhận 100% sát thương đánh thường của tướng */
export const STRUCTURE_DAMAGE = 1
/** Trụ bắn trả kẻ đánh nó: gốc + mỗi lượt liên tiếp bị đánh */
export const TOWER_SHOT = 90, TOWER_SHOT_RAMP = 30
/** Phá trụ: thưởng vàng cho người phá */
export const TOWER_GOLD = 5
/** Lính đẩy đường: đầu mỗi vòng, đường chỉ có tướng một bên đứng thì trụ (sập rồi thì Nhà) bên kia mất LANE_PUSH × số tướng đứng đó */
export const LANE_PUSH = 60
/** Nhà được bảo hộ (không nhận sát thương) trước vòng này */
export const NEXUS_PROTECT_UNTIL_ROUND = 7
/** Mốc triệu hồi 1-2-1-1 (đủ 5 tướng): tới vòng `round` được thêm `count` tướng (chọn úp, lật cùng lúc) */
export const SUMMON_PHASES = [
    {
        round: 1, count: 1
    },
    {
        round: 4, count: 2
    },
    {
        round: 8, count: 1
    },
    {
        round: 11, count: 1
    },
]
/** Giai đoạn đấu đơn chỉ được đặt tướng ở lane này */
export const SOLO_PHASE_LANE = LANE_MID
/** Đường mở theo số tướng được ra sân: 1 tướng chỉ đường giữa · 3 tướng thêm 2 đường kề giữa · tướng thứ 4 thêm đường trái · đủ 5 mở hết.
 *  Đường khoá: không đặt, không đi vào được. */
export const openLanes = (round: number): number[] => {
    const cap = SUMMON_PHASES.filter((p) => round >= p.round).reduce((s, p) => s + p.count,
        0)
    return cap <= 2 ? [LANE_MID] : cap === 3 ? [1,
        2,
        3] : cap === 4 ? [0,
        1,
        2,
        3] : [0,
        1,
        2,
        3,
        4]
}
/** Số tướng tối đa được có trên sân ở vòng `round` */
export const boardCapAt = (round: number) => SUMMON_PHASES.filter((p) => round >= p.round).reduce((s, p) => s + p.count,
    0)
/** 1 vòng = lượt Xanh + lượt Đỏ */
export const roundOf = (turn: number) => Math.max(1,
    Math.ceil(turn / 2))
/** Chết: treo bao nhiêu lượt (tính cả lượt hai bên) */
export const RESPAWN_TURNS = 6
/** Rút tướng về: phải chờ bao nhiêu lượt mới ra lại */
export const SWAP_LOCK_TURNS = 4
/** Mỗi bên pick bao nhiêu tướng vào Đội Hình */
export const ROSTER_SIZE = 5
/** Kéo dài: từ vòng này Nhà hai bên tự mất máu mỗi vòng */
export const OVERTIME_ROUND = 32
export const OVERTIME_DAMAGE = 100

export const MAX_MANA = 10
export const START_HAND = 3
export const HAND_LIMIT = 6
/** Mỗi tướng đeo tối đa bao nhiêu món (đè sớm = nhiều đồ) */
export const MAX_ITEMS = 5
/** Hạ gục: thưởng vàng + 1 thẻ mảnh ngẫu nhiên vào kho */
export const KILL_GOLD = 2
/** Dùng bài (đánh, úp, lật, đeo đồ) không tốn mana */
export const SET_MANA = 0

// ================= TÀI NGUYÊN TƯỚNG (Mana / Nộ) =================
export type ResourceKind = "mana" | "rage";
export interface IResource {
  name: string;
  /** Bắt đầu trận / sau hồi sinh */
  start: number;
  max: number;
  /** Hồi đầu mỗi lượt của chủ tướng */
  regen: number;
  onAttack: number;
  onHit: number;
  /** Mất đi cuối lượt nếu lượt đó không đánh thường */
  decay: number;
  color: number;
}
export const RESOURCES: Record<ResourceKind, IResource> = {
    mana: {
        name: "Mana", start: 30, max: 100, regen: 10, onAttack: 10, onHit: 5, decay: 0, color: 0x3a8cff
    },
    rage: {
        name: "Nộ", start: 0, max: 100, regen: 0, onAttack: 25, onHit: 15, decay: 15, color: 0xe0482f
    },
}

/** Chỉ số tướng (không có cấp): AD, AP, máu, giáp, giáp phép (giảm sát thương theo 100/(100+x)) */
export interface HeroStats {
  id: string; name: string; role: Role;
  atk: number; ap: number; hp: number;
  /** Giáp vật lý (số phẳng) */
  armor: number;
  /** Giáp phép (số phẳng) */
  mr: number;
  /** Mana (mặc định) hay Nộ */
  resource?: ResourceKind;
  desc: string;
  inspiredBy?: string;
  /** Điểm mạnh duy nhất */
  strength: string;
  /** Khắc chế kiểu tướng nào… */
  counter?: string;
  /** …hoặc tạo ra khái niệm / lối chơi gì */
  concept?: string;
  passive?: { name: string; desc: string };
}
export interface HeroCard extends HeroStats { kind: "hero"; skills: string[] }
/** Lá đánh từ tay cần chọn gì: không chọn · tướng địch · tướng mình trên sân · tướng mình đang chờ trong Đội Hình */
export type CardTarget = "none" | "enemy" | "ally" | "allyRoster";
/** Bẫy kích hoạt khi tướng địch trong đường đó: đánh thường · tung chiêu · ra tay bất kỳ · đánh trụ/Nhà · không bao giờ (bài mồi) */
export type TrapTrigger = "attack" | "cast" | "any" | "structure" | "never";
/** 4 loại bài trong bộ bài: phép (dùng ngay hoặc úp) · bẫy (úp, tự nổ) · chỉ số · đánh thường. Trang bị đến từ chợ. */
/** Cường hoá ("stat") gồm cả lá chỉ số lẫn lá đánh thường */
export type DeckKind = "spell" | "trap" | "stat" | "item";
/** Phép / bài chỉ số / bài đánh thường. `lol`: hiệu ứng LoL mà lá này mô phỏng */
/** `bonus`: các dòng cường hóa có điều kiện, dạng "Khi …: …" (tự điền từ boosts của adapter) */
export interface PlayCard { kind: "spell" | "stat"; id: string; name: string; mana: number; desc: string; target: CardTarget; lol?: string; bonus?: string[] }
export interface TrapCard { kind: "trap"; id: string; name: string; mana: number; desc: string; trigger: TrapTrigger; lol?: string; bonus?: string[] }
/** Thẻ đồ huyền thoại: ghép 2 thẻ mảnh trong chợ mà ra, đánh từ tay lên tướng */
export interface ItemCard { kind: "item"; id: string; name: string; mana: number; itemId: string; desc: string }
export type Card = HeroCard | ItemCard | PlayCard | TrapCard;

export interface SkillDef {
  id: string; key: string; name: string;
  /** Mana/Nộ của TƯỚNG (không phải mana người chơi) */
  mana: number;
  /** Hồi chiêu tính theo vòng (1 vòng = lượt mình + lượt đối thủ) */
  cooldown: number;
  /** Công thức hiển thị, vd "60 + 80% AD + 40% AP (vật lý)" */
  formula?: string;
  /** Mô tả các điều kiện tăng sức mạnh (điền tự động từ boosts) */
  boosts?: string[];
  /** (cũ, không dùng: mọi chiêu mở từ đầu) */
  unlock?: number;
  /** none: không cần chọn · enemyAny: tướng địch bất kỳ · allyLane: đồng minh cùng lane · cell: chọn tâm là 1 ô tuỳ thích (kể cả ô trống) */
  target: "none" | "enemyAny" | "allyLane" | "cell"; desc: string;
  /** Hình vùng của chiêu (để vẽ ô trúng khi chọn tâm). Chiêu `cell` bắt buộc có. */
  area?: AreaShape;
  /** Chiêu `cell`: tâm đặt bên nửa sân địch (mặc định) hay nửa sân mình */
  cellSide?: "enemy" | "ally";
}



/** Hình vùng chiêu. Toạ độ trên nửa sân của một phe: đường 0..4, hàng 0 = tiền tuyến .. 2 = hậu tuyến */
export type AreaShape = "1x1" | "2x2" | "3x3" | "cross" | "row" | "col" | "front3";
export type StatusId = "stun" | "freeze" | "chill" | "shred" | "barrage" | "wounds" | "burn" | "invuln" | "unstoppable" | "focus" | "guard" | "empower" | "silence";
export const STATUS_INFO: Record<StatusId, { name: string; short: string; blocksAction: boolean; damageTaken: number; desc: string }> = {
    stun: {
        name: "Choáng", short: "Choáng", blocksAction: true, damageTaken: 1, desc: "Không đánh, không tung chiêu"
    },
    freeze: {
        name: "Đóng băng", short: "Băng", blocksAction: true, damageTaken: 1, desc: "Không đánh, không tung chiêu"
    },
    chill: {
        name: "Buốt", short: "Buốt", blocksAction: false, damageTaken: 1.25, desc: "Nhận thêm 25% sát thương từ mọi nguồn"
    },
    shred: {
        name: "Rã giáp", short: "Rã giáp", blocksAction: false, damageTaken: 1, desc: "Giáp và giáp phép −40%"
    },
    barrage: {
        name: "Cao Xạ", short: "Cao xạ", blocksAction: false, damageTaken: 1, desc: "Đánh thường với xa hơn, thêm sát thương phép"
    },
    wounds: {
        name: "Vết Thương Sâu", short: "Thương", blocksAction: false, damageTaken: 1, desc: "Hồi máu giảm 50%"
    },
    burn: {
        name: "Đốt", short: "Đốt", blocksAction: false, damageTaken: 1, desc: "Mất máu mỗi lượt"
    },
    invuln: {
        name: "Bất Tử", short: "Bất tử", blocksAction: false, damageTaken: 0, desc: "Không nhận sát thương"
    },
    unstoppable: {
        name: "Không Cản Phá", short: "Miễn KC", blocksAction: false, damageTaken: 1, desc: "Miễn khống chế"
    },
    focus: {
        name: "Chú Tâm", short: "Chú tâm", blocksAction: false, damageTaken: 1, desc: "Đòn đánh bắn thêm tên"
    },
    guard: {
        name: "Kiên Cường", short: "Kiên", blocksAction: false, damageTaken: 0.7, desc: "Nhận ít hơn 30% sát thương"
    },
    empower: {
        name: "Cường Hoá", short: "Cường", blocksAction: false, damageTaken: 1, desc: "Được tăng sức mạnh (theo chiêu)"
    },
    silence: {
        name: "Câm Lặng", short: "Câm", blocksAction: false, damageTaken: 1, desc: "Không tung chiêu được (vẫn đánh thường, đi lại)"
    },
}

export const cardCost = (c: Card) => ({
    gold: 0, mana: c.kind === "hero" ? 0 : c.mana
})

// ================= GHÉP ĐỒ =================
/** Không có chợ: thẻ mảnh chỉ đến từ bộ bài và phần thưởng hạ gục; ghép 2 mảnh tốn vàng */
export const BENCH_SIZE = 8
export const CRAFT_PRICE = 3
/** Mana người chơi để đánh thẻ đồ huyền thoại lên tướng */
export const LEGEND_EQUIP_MANA = 2
/** Lãi kiểu ĐTCL: cứ 5 vàng để dành được +1, tối đa +3 */
export const interestOf = (gold: number) => Math.min(3,
    Math.floor(gold / 5))
