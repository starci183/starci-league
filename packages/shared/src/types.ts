import type {
    AreaShape, HeroStats, Row, Side, SkillDef, StatusId
} from "./cards"
import type {
    ICondition, PropInput
} from "./items/types"

/** Hình dạng một tướng trên bàn. Server (Colyseus schema) và client (state đã giải mã) đều khớp interface này. */
export interface UnitLike {
  id: string; owner: string; defId: string; lane: number; row: string;
  /** Đã đi 1 ô lượt này chưa */
  moved?: boolean;
  hp: number; maxHp: number; shield: number; atkBonus: number;
  /** Mana hoặc Nộ của tướng (dùng tung chiêu) */
  mana: number;
  /** "roster": trong Đội Hình chưa ra sân · "board": trên sân · "dead": đang treo · "rest": vừa rút về */
  status: string;
  /** Lượt (state.turn) sớm nhất được triệu hồi lại */
  readyTurn: number;
  attacked: boolean;
  /** Đã tung chiêu lượt này (kể cả bị câm lặng) */
  castThisTurn: boolean;
  /** Tung chiêu thành công lượt này: nội tại kiểu Yorn dựa vào cờ này */
  empowered: boolean;
  hidden: boolean;
  summonedTurn: number; markedTargetId: string;
  cooldowns: { get(key: string): number | undefined };
  /** Trạng thái  số lượt còn lại (giảm khi chủ tướng kết thúc lượt) */
  statuses: { get(key: string): number | undefined };
  /** id các món đồ đang đeo (tối đa 3 ô) */
  items: { length: number; forEach(cb: (id: string) => void): void };
  /** Bộ đếm của đồ: cộng dồn, cờ đã kích hoạt... Khoá bắt đầu bằng "t:" bị xoá khi chủ tướng kết thúc lượt. */
  stacks: { get(key: string): number | undefined };
}
export interface StateLike {
  turn: number;
  activeSide: string;
  /** Lượt này đã có tướng đánh Nhà chưa (mỗi lượt chỉ 1 tướng) */
  nexusHit?: boolean;
  units: { get(id: string): UnitLike | undefined; forEach(cb: (u: UnitLike, id: string) => void): void };
  /** Máu trụ từng đường của mỗi bên */
  players?: { get(side: string): { towers?: ArrayLike<number>; nexus?: number; maxMana?: number; traps?: ArrayLike<boolean> } | undefined };
  /** Vùng đang tồn tại trên bàn (Tibbers, bãi lửa...) */
  zones?: ArrayLike<ZoneLike>;
}
/** Vùng tồn tại nhiều lượt do chiêu đặt xuống: đầu mỗi lượt của phe `owner`, adapter tướng `defId` chạy zoneTick */
export interface ZoneLike {
  id: string; key: string; owner: string; defId: string;
  /** id tướng đặt vùng (vẫn tính chỉ số theo tướng này kể cả khi nó đã chết) */
  srcId: string;
  /** Vùng nằm trên nửa sân của phe nào */
  side: string; lane: number; row: number; shape: string;
  /** Số lượt (của phe owner) còn lại */
  turns: number;
  /** Vùng có máu (vd Tibbers): > 0 thì tướng phe `side` đứng trong vùng bị khiêu khích, đòn đánh thường đánh vào vùng; về 0 thì vùng biến mất */
  hp?: number; maxHp?: number;
}

/** Vật lý · phép · chuẩn */
export type DamageKind = "physical" | "magic" | "true";

export type Target = { kind: "unit"; id: string } | { kind: "tower"; side: Side; lane: number };

/** Kết quả của mọi hành động. Luật chỉ tính ra Effect, server mới áp dụng vào state. */
export type Effect =
  | {
      type: "damage"; target: Target; amount: number; label: string;
      /** id tướng gây sát thương (để đồ phản đòn, hút máu...) */
      src?: string;
      /** đến từ đòn đánh thường hay chiêu */
      tag?: "attack" | "skill" | "item";
      crit?: boolean;
      /** Loại sát thương (để hiện màu: đỏ vật lý, xanh phép, trắng chuẩn) */
      kind?: DamageKind;
    }
  | { type: "shield"; unitId: string; amount: number }
  | { type: "heal"; unitId: string; amount: number }
  | { type: "mark"; unitId: string; targetId: string }
  | { type: "status"; unitId: string; status: StatusId; turns: number }
  /** Kéo tướng hậu tuyến lên tiền tuyến (đổi chỗ với tướng đang đứng trước) */
  | { type: "pull"; unitId: string }
  /** Dời tướng: dRow +1 = đẩy lùi về hậu tuyến, −1 = kéo lên; dLane ±1 = hất sang đường bên.
   *  Chỉ dời khi ô đích trong bàn và còn trống (bị chặn thì đứng yên: xem pushBlocked trong heroes/kit). */
  | { type: "displace"; unitId: string; dRow?: number; dLane?: number }
  /** Hai tướng CÙNG PHE đổi chỗ cho nhau (luôn đổi được, kể cả khác đường) */
  | { type: "swap"; unitId: string; otherId: string }
  /** Gỡ các trạng thái khỏi tướng (vd. cướp Cường Hoá) */
  | { type: "dispel"; unitId: string; statuses: StatusId[] }
  /** Cho tướng đánh thường thêm lần nữa trong lượt */
  | { type: "refresh"; unitId: string }
  /** Đặt một vùng tồn tại `turns` lượt của phe mình; tâm (lane, row = 0 tiền tuyến..2) trên nửa sân `side`.
   *  `key` để adapter phân biệt loại vùng trong zoneTick. Key bắt đầu bằng "wall" = **Tường Băng**: ô trong vùng
   *  không đi vào / bị dời vào được, tướng đang đứng trong vùng bị giam (không tự đi được) — xem isWallCell (helpers). */
  | { type: "zone"; key: string; srcId: string; side: string; lane: number; row: number; shape: AreaShape; turns: number;
      /** Máu của vùng (bỏ trống = vùng không có máu, không khiêu khích) */
      hp?: number }
  // ---- dùng cho đồ ----
  | { type: "stack"; unitId: string; key: string; add?: number; set?: number; max?: number }
  | { type: "gold"; side: string; amount: number }
  | { type: "mana"; side: string; amount: number }
  /** Giảm (delta < 0) hoặc làm mới (reset) hồi chiêu mọi chiêu */
  | { type: "cooldown"; unitId: string; delta?: number; reset?: boolean }
  | { type: "hide"; unitId: string }
  | { type: "cleanse"; unitId: string }
  /** Đốt: mất `amount` máu mỗi khi chủ tướng kết thúc lượt, trong `turns` lượt */
  | { type: "burn"; unitId: string; amount: number; turns: number }
  | { type: "maxhp"; unitId: string; amount: number }
  | { type: "breakShield"; unitId: string }
  /** Cộng/trừ mana của tướng */
  | { type: "heroMana"; unitId: string; amount: number }
  /** Lộ diện mọi tướng ẩn của phe `side` */
  | { type: "reveal"; side: string }
  // ---- dùng cho bài trong bộ bài (deck/) ----
  /** Gắn buff có hạn (IBuff) lên tướng: `turns` = số lượt của chính tướng đó */
  | { type: "buff"; unitId: string; buffId: string; turns: number }
  /** Tướng đang chờ trong Đội Hình được ra sân ngay */
  | { type: "ready"; unitId: string }
  /** Cho phe `side` xem các lá đang úp của đối thủ */
  | { type: "revealSets"; side: string }
  /** Tăng mana tối đa của người chơi */
  | { type: "maxMana"; side: string; amount: number }
  /** Tướng được đi thêm 1 ô lượt này */
  | { type: "freeMove"; unitId: string }
  /** Phe `side` rút thêm n lá */
  | { type: "draw"; side: string; n: number };

export interface HeroCtx { state: StateLike; unit: UnitLike }

// ================= ADAPTER =================
// Thêm tướng mới: tạo file trong heroes/, gọi defineHero({...}) và thêm import vào heroes/index.ts.

/** Điều kiện làm chiêu mạnh lên: thoả `condition` (với từng mục tiêu) thì nhân sát thương và/hoặc thêm hiệu ứng */
export interface ISkillBoost {
  condition: ICondition;
  desc: string;
  /** Nhân sát thương chiêu lên mục tiêu thoả điều kiện */
  mult?: number;
  /** Hiệu ứng thêm khi trúng mục tiêu thoả điều kiện */
  extra?: (ctx: HeroCtx & { target: UnitLike }) => Effect[];
}

export interface SkillAdapter {
  def: SkillDef;
  /** 0..N điều kiện tăng sức mạnh */
  boosts?: ISkillBoost[];
  /** Mục tiêu hợp lệ. Bỏ trống thì dùng mặc định theo def.target. */
  targets?(ctx: HeroCtx): string[];
  /** Chiêu `cell`: các ô được chọn làm tâm (bỏ trống: mọi ô đường đang mở bên nửa sân theo def.cellSide) */
  cells?(ctx: HeroCtx): { lane: number; row: Row }[];
  /** Tính hiệu ứng của chiêu. Chiêu `cell` nhận `cell` (ô tâm đã chọn; row là tên hàng) */
  resolve(ctx: HeroCtx & { targetId?: string; cell?: { lane: number; row: Row } }): Effect[];
}

export interface HeroAdapter extends HeroStats {
  skills?: SkillAdapter[];
  /** Nội tại viết bằng IProp (chạy chung engine với đồ): chỉ số, nội tại thường, nội tại điều kiện */
  props?: PropInput[];
  /** Ghi đè đòn đánh thường (vd. nội tại Liên Xạ). Trả undefined để dùng luật vai trò mặc định. */
  attack?(ctx: HeroCtx & { target: Target }): Effect[] | undefined;
  /** Thêm mục tiêu đánh thường ngoài luật vai trò (vd. dấu Truy Kích bắn xuyên lane) */
  extraTargets?(ctx: HeroCtx): Target[];
  /** Gọi khi tướng này hạ gục một tướng địch */
  onKill?(ctx: HeroCtx & { victim: UnitLike }): Effect[];
  /** Gọi khi tướng này chết (vd. nổ khi chết) */
  onDeath?(ctx: HeroCtx): Effect[];
  /** Vùng do tướng này đặt: chạy đầu mỗi lượt của phe chủ vùng. `targets` = tướng của phe zone.side đang đứng trong vùng */
  zoneTick?(ctx: HeroCtx & { zone: ZoneLike; targets: UnitLike[] }): Effect[];
}
