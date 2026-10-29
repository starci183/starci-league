// Interface của hệ thống đồ. Mọi thứ một món đồ mang lại (chỉ số, nội tại thường, nội tại điều kiện)
// đều là một IProp = điều kiện (ICondition) + tác dụng. Engine chỉ làm việc qua các interface này.
import type {
    Effect, StateLike, Target, UnitLike
} from "../types"

/** Chỉ số đồ cộng vào tướng */
export interface Stats {
  atk: number;          // + AD
  ap: number;           // + AP
  manaRegen: number;    // + hồi mana tướng mỗi vòng
  atkMult: number;      // + % ATK
  hp: number;           // + máu tối đa (cộng khi đeo)
  armor: number;        // + giáp (số phẳng)
  mr: number;           // + giáp phép (số phẳng)
  lethality: number;    // sát lực: bỏ qua bấy nhiêu giáp của mục tiêu
  magicPen: number;     // xuyên giáp phép
  crit: number;         // tỉ lệ chí mạng
  critDmg: number;      // + sát thương chí mạng (gốc ×1.5)
  extraAtk: number;     // Tốc đánh cộng thêm (gốc 100%): 0.4 = +40%
  lifesteal: number;    // hút máu đòn đánh
  omnivamp: number;     // hút máu mọi nguồn
  spellAmp: number;     // + % sát thương chiêu
  dmgAmp: number;       // + % mọi sát thương
  manaDiscount: number; // chiêu rẻ hơn N mana
}
export const STAT_NAMES: Record<keyof Stats, (v: number) => string> = {
    atk: (v) => `+${v} AD`, ap: (v) => `+${v} AP`, manaRegen: (v) => `+${v} hồi mana/vòng`, atkMult: (v) => `+${Math.round(v * 100)}% ATK`, hp: (v) => `+${v} máu`,
    armor: (v) => `+${v} giáp`, mr: (v) => `+${v} giáp phép`, lethality: (v) => `+${v} sát lực`, magicPen: (v) => `+${v} xuyên phép`,
    crit: (v) => `+${Math.round(v * 100)}% chí mạng`, critDmg: (v) => `+${Math.round(v * 100)}% sát thương chí mạng`,
    extraAtk: (v) => `+${Math.round(v * 100)}% Tốc đánh`, lifesteal: (v) => `hút máu ${Math.round(v * 100)}%`,
    omnivamp: (v) => `hút máu mọi nguồn ${Math.round(v * 100)}%`, spellAmp: (v) => `chiêu +${Math.round(v * 100)}%`,
    dmgAmp: (v) => `+${Math.round(v * 100)}% sát thương`, manaDiscount: (v) => `chiêu −${v} mana`,
}

/** Mảnh (mua ở chợ) hoặc huyền thoại (ghép 2 mảnh theo bảng 8×8) */
export type Tier = "component" | "legendary";

/** Ngữ cảnh truyền vào điều kiện và tác dụng */
export interface PropCtx {
  state?: StateLike;
  self: UnitLike;
  /** Mục tiêu của đòn đánh/chiêu (nếu là tướng); với onKill là kẻ vừa bị hạ */
  target?: UnitLike;
  /** Kẻ gây sát thương (khi mình bị đánh) */
  source?: UnitLike;
  isSkill?: boolean;
  isAttack?: boolean;
  /** Sát thương vừa nhận */
  amount?: number;
  /** Hiệu ứng đòn đánh/chiêu vừa tính xong */
  effects?: Effect[];
  skillId?: string;
  /** true khi client tính trước để hiển thị: không tung xúc xắc */
  preview: boolean;
}

/** Điều kiện của một prop. `kind: "none"` = luôn bật (chỉ số, nội tại thường). */
export interface ICondition {
  readonly kind: string;
  readonly desc: string;
  test(ctx: PropCtx): boolean;
}

export type Hook = (ctx: PropCtx) => Effect[];
export type HookName = "onAttack" | "onSkill" | "onDamaged" | "onTurnStart" | "onEquip" | "onKill" | "onCast" | "onCrit" | "onShieldBreak" | "preventDeath";

/** Một prop của món đồ: điều kiện + các tác dụng (tác dụng nào cũng tuỳ chọn) */
export interface IProp {
  readonly name: string;
  readonly desc: string;
  readonly condition: ICondition;
  /** Chỉ kích hoạt một lần mỗi trận */
  readonly once?: boolean;

  // ---- tác dụng thụ động ----
  readonly stats?: Partial<Stats>;
  /** Nhân sát thương đi ra (lên tướng địch) */
  readonly damageMult?: (ctx: PropCtx) => number;
  /** Nhân sát thương nhận vào */
  readonly damageTakenMult?: (ctx: PropCtx) => number;
  readonly critChance?: number;
  /** Chiêu cũng chí mạng được */
  readonly skillCrit?: boolean;
  /** Miễn choáng / đóng băng */
  readonly blockCC?: boolean;
  readonly extraTargets?: (ctx: PropCtx) => Target[];

  // ---- tác dụng theo sự kiện ----
  readonly onAttack?: Hook;
  readonly onSkill?: Hook;
  readonly onDamaged?: Hook;
  readonly onTurnStart?: Hook;
  readonly onEquip?: Hook;
  readonly onKill?: Hook;
  readonly onCast?: Hook;
  readonly onCrit?: Hook;
  readonly onShieldBreak?: Hook;
  /** Trả về hiệu ứng (khác rỗng) thì tướng không chết: hồi sinh */
  readonly preventDeath?: Hook;
}

/** Một món đồ: chỉ là danh sách prop (prop đầu tiên là chỉ số, điều kiện NONE) */
export interface IItem {
  readonly id: string;
  readonly name: string;
  readonly tier: Tier;
  /** Biểu tượng dự phòng khi chưa có icon */
  readonly emoji: string;
  /** 2 mảnh để ghép (chỉ đồ huyền thoại) */
  readonly recipe?: string[];
  /** id món đồ LMHT tương ứng để tải icon (thử lần lượt) */
  readonly lolIds?: number[];
  readonly props: IProp[];
}

/** Khai báo prop khi viết đồ: thiếu `condition` thì là NONE */
export type PropInput = Omit<IProp, "condition"> & { condition?: ICondition };
