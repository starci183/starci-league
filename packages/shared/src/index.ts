import "./heroes" // đăng ký toàn bộ adapter tướng
import "./items" // đăng ký toàn bộ đồ
import "./deck" // đăng ký bài trong bộ bài (phép, bẫy, chỉ số, đánh thường)

export * from "./cards"
export * from "./types"
export * from "./registry"
export * from "./helpers"
export * from "./rules"
export * from "./items"
export * from "./deck"
export * from "./i18n"
export * from "./keywords"
export * from "./jungle"
export * from "./draft"
export * from "./formula"
export * from "./builds"
export * from "./damageTypes"
export * from "./roomState"

/** Tin nhắn client gửi lên server */
export type ClientMessages = {
  ready: {};
  /** Mốc triệu hồi: chọn úp các tướng + ô, lật cùng lúc khi cả hai đã chọn */
  summonPick: { placements: { unitId: string; lane: number; row: import("./cards").Row }[] };
  /** Đưa tướng trong Đội Hình ra sân (hồi sinh / thay người) khi sân chưa đủ số tướng */
  summon: { unitId: string; lane: number; row: import("./cards").Row };
  /** Đi 1 ô (8 hướng) trong nửa sân mình, mỗi lượt 1 lần */
  move: { unitId: string; lane: number; row: import("./cards").Row };
  /** Rút tướng về Đội Hình (mỗi lượt 1 lần) */
  /** Tháo món đồ thứ `index` của tướng: mảnh về kho, đồ huyền thoại về tay thành thẻ (để ghép lại) */
  unequip: { unitId: string; index: number };
  /** Đánh 1 lá phép / chỉ số / đánh thường từ tay (lá cần mục tiêu thì gửi targetId) */
  play: { uid: string; targetId?: string };
  /** Úp 1 lá phép hoặc bẫy xuống ô bài úp của lane (kiểu Yu-Gi-Oh: đối thủ không biết là gì) */
  set: { uid: string; lane: number };
  /** Lật lá PHÉP đang úp ở lane mình để dùng (trả nốt phần mana còn lại) */
  flip: { lane: number; targetId?: string };
  attack: { unitId: string; target: import("./types").Target };
  /** Dùng đòn đánh thường của lượt để đánh bãi quái ở hàng rừng (đường `lane`) */
  attackMonster: { unitId: string; lane: number };
  /** Trừng Phạt: 600 sát thương chuẩn lên quái, cần 1 tướng mình đứng gần bãi quái */
  smite: { lane: number };
  /** Chiêu `cell` gửi kèm `cell`: ô tâm (bên nửa sân theo def.cellSide) */
  skill: { unitId: string; skillId: string; targetId?: string; cell?: { lane: number; row: import("./cards").Row } };
  endTurn: {};
  /** Cấm hoặc chọn 1 tướng ở lượt cấm/chọn của mình */
  draft: { heroId: string };
  // ---- ghép đồ ----
  /** Ghép 2 thẻ mảnh trong kho (theo vị trí) -> thẻ đồ huyền thoại vào tay */
  craft: { a: number; b: number };
  /** Đánh thẻ đồ huyền thoại từ tay lên tướng */
  equip: { uid: string; unitId: string };
};
export interface HandCard { uid: string; defId: string }
export * as cg from "./cardgame" // chế độ thẻ bài thuần (lõi luật tách riêng)
