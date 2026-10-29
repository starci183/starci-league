// Thư viện điều kiện cho lá bài (ICardCondition). Dùng chung cho phép/chỉ số/đánh thường (đọc `target`)
// và bẫy (đọc `actor` = tướng địch vừa ra tay).
import type {
    Role, Row, StatusId
} from "../cards"
import {
    ROW_NAME, STATUS_INFO
} from "../cards"
import {
    heroOf, hpPct, roleOf
} from "../helpers"
import type {
    UnitLike
} from "../types"
import type {
    ICardCondition, PlayCtx, TrapCtx
} from "./types"

type Ctx = Partial<PlayCtx & TrapCtx>;
const who = (c: Ctx): UnitLike | undefined => c.actor ?? c.target
const cond = <C extends Ctx>(desc: string, test: (c: C) => boolean): ICardCondition<C> => ({
    desc, test
})
const pct = (p: number) => `${Math.round(p * 100)}%`
const ROLE_VN: Record<Role, string> = {
    tank: "đỡ đòn", fighter: "đấu sĩ", assassin: "sát thủ", mage: "pháp sư", marksman: "xạ thủ", support: "trợ thủ"
}

/** Tướng (mục tiêu hoặc kẻ dính bẫy) còn dưới p máu */
export const hpBelow = <C extends Ctx>(p: number) => cond<C>(`tướng còn dưới ${pct(p)} máu`,
    (c) => { const u = who(c); return !!u && hpPct(u) < p })
export const role = <C extends Ctx>(...roles: Role[]) => cond<C>(`tướng là ${roles.map((r) => ROLE_VN[r]).join(" / ")}`,
    (c) => { const u = who(c); return !!u && roles.includes(roleOf(u)) })
export const rowIs = <C extends Ctx>(row: Row) => cond<C>(`tướng đứng ${ROW_NAME[row]}`,
    (c) => who(c)?.row === row)
export const has = <C extends Ctx>(...st: StatusId[]) => cond<C>(`tướng đang bị ${st.map((s) => STATUS_INFO[s].name).join(" / ")}`,
    (c) => { const u = who(c); return !!u && st.some((s) => (u.statuses?.get(s) ?? 0) > 0) })
export const usesRage = <C extends Ctx>() => cond<C>("tướng dùng Nộ",
    (c) => { const u = who(c); return !!u && (heroOf(u).resource ?? "mana") === "rage" })
/** Số tướng phe mình trên sân ≥ n */
export const alliesAtLeast = (n: number) => cond<PlayCtx>(`có từ ${n} tướng mình trên sân`,
    (c) => {
        let k = 0; c.state.units.forEach((u) => { if (u.owner === c.side && u.lane >= 0) k++ }); return k >= n
    })
/** Máu Nhà phe mình thấp hơn đối thủ */
export const behindOnNexus = () => cond<PlayCtx>("Nhà của bạn ít máu hơn Nhà đối thủ",
    (c) => {
        const me = c.state.players?.get(c.side)?.nexus ?? 0, foe = c.state.players?.get(c.side === "A" ? "B" : "A")?.nexus ?? 0
        return me < foe
    })
/** Đối thủ đang úp ≥ n lá */
export const oppSetsAtLeast = (n: number) => cond<PlayCtx>(`đối thủ đang úp từ ${n} lá`,
    (c) => {
        const t = c.state.players?.get(c.side === "A" ? "B" : "A")?.traps
        let k = 0; for (let i = 0; i < (t?.length ?? 0); i++) if (t![i]) k++; return k >= n
    })
/** Mana tối đa của bạn còn dưới n */
export const maxManaBelow = (n: number) => cond<PlayCtx>(`mana tối đa của bạn dưới ${n}`,
    (c) => (c.state.players?.get(c.side)?.maxMana ?? 99) < n)
/** Tướng mình đang chờ vì vừa bị hạ gục (không phải tự rút về) */
export const isDead = () => cond<PlayCtx>("tướng đang treo vì bị hạ gục",
    (c) => (c.target as UnitLike & { status?: string })?.status === "dead")

