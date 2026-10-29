// Interface cho bài trong bộ bài. Mỗi lá là một adapter: khai báo thông số + điều kiện cường hóa + resolve() trả về Effect[].
// 4 loại: phép (dùng ngay hoặc úp để hù) · bẫy (úp, tự kích hoạt) · chỉ số · đánh thường. Trang bị đến từ ghép mảnh (items/), không có chợ.
import type {
    PlayCard, Side, TrapCard, TrapTrigger
} from "../cards"
import type {
    PropInput
} from "../items/types"
import type {
    Effect, StateLike, UnitLike
} from "../types"

export interface PlayCtx {
  state: StateLike;
  /** Phe đánh lá bài */
  side: Side;
  /** Tướng được chọn (nếu lá cần chọn) */
  target?: UnitLike;
}

export interface TrapCtx {
  state: StateLike;
  /** Phe đặt bẫy */
  side: Side;
  lane: number;
  /** Tướng địch vừa ra tay trong đường đó */
  actor: UnitLike;
}

/** Điều kiện cường hóa của lá bài: thỏa thì lá mạnh hơn. `desc` hiện trên ô chi tiết ("Khi <desc>: <bonus>"). */
export interface ICardCondition<C> {
  desc: string;
  test(ctx: C): boolean;
}

/** Một dòng cường hóa: điều kiện + mô tả phần thưởng (tác dụng thật nằm trong resolve, đọc qua `met[i]`) */
export interface ICardBoost<C> {
  when: ICardCondition<C>;
  bonus: string;
}

/** Phép, bài chỉ số, bài đánh thường */
export interface ICardAdapter extends PlayCard {
  /** Lọc thêm mục tiêu hợp lệ (mặc định: theo `target`) */
  canTarget?(ctx: PlayCtx & { target: UnitLike }): boolean;
  boosts?: ICardBoost<PlayCtx>[];
  /** `met[i]` = điều kiện boosts[i] đang thỏa */
  resolve(ctx: PlayCtx & { met: boolean[] }): Effect[];
}

/** Bẫy: úp ở 1 đường, tự lật khi địch trong đường đó ra tay đúng kiểu `trigger` */
export interface ITrapAdapter extends TrapCard {
  trigger: TrapTrigger;
  boosts?: ICardBoost<TrapCtx>[];
  /** `cancel`: huỷ luôn hành động vừa làm (đòn đánh / chiêu / đánh trụ) */
  resolve(ctx: TrapCtx & { met: boolean[] }): { effects: Effect[]; cancel?: boolean };
}

/** Buff có hạn (từ bài chỉ số, bài đánh thường, Kiệt Sức...): một bộ IProp gắn tạm lên tướng, chạy chung engine với đồ */
export interface IBuff {
  id: string;
  name: string;
  /** Nhãn chữ ngắn hiện trên token tướng (không dùng icon) */
  short: string;
  desc: string;
  props: PropInput[];
}
