import {
    useEffect, useMemo, useRef, useState
} from "react"
import {
    createRoot
} from "react-dom/client"
import {
    cg
} from "@starci/shared"
import {
    VFX_CATALOG, VFX_CATEGORIES, validateVfx, type VfxCategory, type VfxEntry
} from "./catalog"
import {
    vfxForStyle, type HitStyle
} from "./dispatch"
import {
    heroBasicVfxSequence, skillIcon, skillVfx, spellVfxEntries, type SkillKey
} from "./heroMap"
import {
    clearVfx, playVfx, VfxCanvas, vfxStats, whenVfxReady
} from "./VfxCanvas"
import type {
    Pt, SkillVfx
} from "./types"
import "./gallery.css"

type Mode = "effects" | "heroes" | "spells"
type Direction = "right" | "left" | "up" | "down"
interface Preview {
    id: string;
    label: string;
    style?: SkillVfx;
    sequence?: SkillVfx[];
    effect?: VfxEntry;
    icon?: string;
    self?: boolean;
}

const heroes = cg.implementedHeroes().sort((a, b) => a.name.localeCompare(b.name))
const issues = validateVfx()
const spellLabels: Record<string, string> = {
    heal: "Hồi Máu", flash: "Tốc Biến", ignite: "Thiêu Đốt", exhaust: "Kiệt Sức", barrier: "Lá Chắn", cleanse: "Thanh Tẩy", smite: "Trừng Phạt", teleport: "Dịch Chuyển", draw: "Rút bài"
}
const pretty = (n: number) => `#${n.toString(16).padStart(6,
    "0")}`
const effectPreview = (effect: VfxEntry): Preview => ({
    id: effect.id, label: effect.label, effect
})

export function VfxGallery() {
    const [mode,
        setMode] = useState<Mode>("effects")
    const [query,
        setQuery] = useState("")
    const [category,
        setCategory] = useState<VfxCategory | "all">("all")
    const [heroId,
        setHeroId] = useState("ashe")
    const [selected,
        setSelected] = useState<Preview>(effectPreview(VFX_CATALOG.find((e) => e.id === "fireball")!))
    const [multiple,
        setMultiple] = useState(false)
    const [direction,
        setDirection] = useState<Direction>("right")
    const [intensity,
        setIntensity] = useState(1)
    const [crit,
        setCrit] = useState(false)
    const [playing,
        setPlaying] = useState(false)
    const [progress,
        setProgress] = useState("")
    const [stats,
        setStats] = useState(vfxStats)
    const stage = useRef<HTMLDivElement>(null)
    const generation = useRef(0)
    const hero = cg.getHero(heroId)!
    const effectList = useMemo(() => VFX_CATALOG.filter((e) => (category === "all" || e.category === category) && `${e.id} ${e.label}`.toLowerCase().includes(query.toLowerCase())),
        [category,
            query])
    const heroList = heroes.filter((h) => `${h.id} ${h.name}`.toLowerCase().includes(query.toLowerCase()))

    useEffect(() => {
        document.title = "VFX · StarCi League"
        document.body.classList.add("vfx-page")
        const poll = window.setInterval(() => setStats(vfxStats()),
            160)
        return () => {
            generation.current++
            clearVfx()
            window.clearInterval(poll)
            document.body.classList.remove("vfx-page")
        }
    },
    [])

    const stop = () => {
        generation.current++
        clearVfx()
        setPlaying(false)
        setProgress("")
    }

    const positions = (): { from: Pt; to: Pt[] } => {
        const r = stage.current!.getBoundingClientRect()
        const place = (x: number, y: number) => ({
            x: r.left + r.width * x, y: r.top + r.height * y
        })
        const horizontal = direction === "left" || direction === "right"
        const reverse = direction === "left" || direction === "up"
        const start = reverse ? .77 : .23
        const end = 1 - start
        return {
            from: horizontal ? place(start,
                .55) : place(.5,
                start),
            to: (multiple ? [.3,
                .55,
                .8] : [.55]).map((offset) => horizontal ? place(end,
                offset) : place(offset,
                end))
        }
    }

    const run = async (preview: Preview) => {
        if (!stage.current || !await whenVfxReady()) return
        const { from, to } = positions()
        if (preview.effect) {
            const e = preview.effect
            const opts = {
                color: e.color, color2: e.color2, intensity: crit ? Math.max(2,
                    intensity) : intensity,
                icon: "/card_skills/lux_q.png"
            }
            if (e.mode === "impact") await Promise.all(to.map((at) => playVfx(e.id,
                at,
                [],
                opts)))
            else await playVfx(e.id,
                from,
                e.mode === "travel" ? to : [],
                opts)
        } else if (preview.style) {
            const id = generation.current
            for (const entry of preview.sequence ?? [preview.style]) {
                if (generation.current !== id) return
                const style: HitStyle = {
                    ...entry,
                    intensity: Math.max(intensity,
                        entry.intensity ?? 1,
                        crit ? 2 : 1),
                    crit,
                    icon: preview.icon
                }
                await vfxForStyle(style,
                    from,
                    preview.self ? [from] : to)
            }
        }
        setStats(vfxStats())
    }

    const play = async (preview = selected) => {
        stop()
        const id = generation.current
        setSelected(preview)
        setPlaying(true)
        await run(preview)
        if (id === generation.current) setPlaying(false)
    }

    const heroPreview = (key: "basic" | SkillKey): Preview => {
        const skill = key === "basic" ? null : key === "p" ? hero.passive : hero.skills[key.toUpperCase() as "Q" | "E" | "R"]
        const recipe = key === "basic" ? heroBasicVfxSequence(hero.id,
            hero.damage,
            hero.role) : [skillVfx(hero.id,
            key)]
        return {
            id: `${hero.id}_${key}`,
            label: `${hero.name} · ${key === "basic" ? "Đánh thường" : `${key.toUpperCase()} · ${skill!.name}`}`,
            style: recipe[0], sequence: recipe,
            icon: key === "basic" ? undefined : skillIcon(hero.id,
                key),
            self: key === "p" || key !== "basic" && ["none",
                "self",
                "all_allies"].includes(hero.skills[key.toUpperCase() as "Q" | "E" | "R"].target as string)
        }
    }

    const spellList = spellVfxEntries().map(([id,
        style]): Preview => ({
        id: `spell_${id}`, label: spellLabels[id] ?? id, style,
        self: ["heal",
            "barrier",
            "cleanse",
            "teleport",
            "draw"].includes(id)
    }))
    const sequence = mode === "effects" ? effectList.map(effectPreview) : mode === "heroes" ? (["basic",
        "p",
        "q",
        "e",
        "r"] as const).map(heroPreview) : spellList

    const playAll = async () => {
        stop()
        const id = generation.current
        setPlaying(true)
        for (let i = 0; i < sequence.length; i++) {
            if (id !== generation.current) break
            setSelected(sequence[i])
            setProgress(`${i + 1} / ${sequence.length}`)
            await run(sequence[i])
        }
        if (id === generation.current) { setPlaying(false); setProgress("") }
    }

    const markers = (isSource: boolean) => {
        const horizontal = direction === "left" || direction === "right"
        const reverse = direction === "left" || direction === "up"
        const start = reverse ? .77 : .23
        return (isSource ? [horizontal ? .55 : .5] : multiple ? [.3,
            .55,
            .8] : [.55]).map((offset, i) => {
            const line = isSource ? start : 1 - start
            return <div key={i} className={`vfx-marker ${isSource ? "source" : "target"}`} style={{
                left: `${(horizontal ? line : offset) * 100}%`, top: `${(horizontal ? offset : line) * 100}%`
            }}>
                <img src={`/heroes/${isSource ? heroId : "braum"}.jpg`} alt="" />
                <span>{isSource ? hero.name : `Mục tiêu ${i + 1}`}</span>
            </div>
        })
    }

    return <div className="vfx-shell">
        <VfxCanvas />
        <header className="vfx-header">
            <div><span className="vfx-eyebrow">STARCI LEAGUE</span><h1>Thư viện hiệu ứng</h1></div>
            <div className="vfx-head-meta"><span>{VFX_CATALOG.length} mẫu · {heroes.length} tướng</span><a href="/vfx/examples">Chơi tình huống ↗</a><a href="/">Về game ↗</a></div>
        </header>
        <div className="vfx-layout">
            <aside className="vfx-browser">
                <div className="vfx-tabs" role="tablist" aria-label="Nhóm xem thử">
                    {([ ["effects",
                        "Hiệu ứng"],
                    ["heroes",
                        "Tướng"],
                    ["spells",
                        "Bổ trợ"] ] as const).map(([id,
                        label]) => <button key={id} role="tab" aria-selected={mode === id} onClick={() => { stop(); setMode(id); setQuery("") }}>{label}</button>)}
                </div>
                <label className="vfx-search">Tìm kiếm<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === "heroes" ? "Tên tướng…" : "Lửa, băng, poison…"} /></label>
                {mode === "effects" ? <>
                    <label className="vfx-select">Loại hiệu ứng<select value={category} onChange={(e) => setCategory(e.target.value as VfxCategory | "all")}><option value="all">Tất cả ({VFX_CATALOG.length})</option>{Object.entries(VFX_CATEGORIES).map(([id,
                        label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                    <div className="vfx-list">{effectList.map((e) => <button key={e.id} data-effect={e.id} className={selected.id === e.id ? "selected" : ""} onClick={() => void play(effectPreview(e))}>
                        <i style={{
                            background: pretty(e.color)
                        }} /><span>{e.label}<small>{e.id}</small></span><em>▶</em>
                    </button>)}{!effectList.length && <p className="vfx-empty">Không có hiệu ứng phù hợp.</p>}</div>
                </> : mode === "heroes" ? <div className="vfx-heroes">{heroList.map((h) => <button key={h.id} data-hero={h.id} className={heroId === h.id ? "selected" : ""} onClick={() => { stop(); setHeroId(h.id) }}><img src={`/heroes/${h.id}.jpg`} alt="" /><span>{h.name}</span></button>)}</div> : <div className="vfx-list">{spellList.filter((s) => s.label.toLowerCase().includes(query.toLowerCase())).map((p) => <button key={p.id} className={selected.id === p.id ? "selected" : ""} onClick={() => void play(p)}><span>{p.label}<small>{p.id}</small></span><em>▶</em></button>)}</div>}
            </aside>
            <main className="vfx-workspace">
                <div className="vfx-preview-heading"><div><span className="vfx-eyebrow">XEM TRÊN BÀN GỐC</span><h2>{selected.label}</h2></div><span className={`vfx-runtime ${stats.ready ? "ready" : ""}`}>{stats.ready ? "Sẵn sàng" : stats.error ? "Lỗi khởi tạo" : "Đang khởi tạo…"}</span></div>
                <div className="vfx-stage" ref={stage} data-vfx-active={stats.active} data-vfx-failed={stats.failed}>
                    <div className="vfx-board-shade" />{markers(true)}{markers(false)}
                    <span className="vfx-stage-label">{playing ? `Đang phát ${progress}` : "Bản xem thử · không thay đổi trận đấu"}</span>
                </div>
                <section className="vfx-controls" aria-label="Điều khiển phát">
                    <div className="vfx-play-buttons"><button className="primary" data-play onClick={() => void play()} disabled={!stats.ready || stats.reducedMotion}>▶ Phát lại</button><button data-stop onClick={stop}>■ Dừng</button><button data-play-all onClick={() => void playAll()} disabled={!stats.ready || stats.reducedMotion || !sequence.length}>Phát lần lượt ({sequence.length})</button></div>
                    <div className="vfx-options">
                        <label>Hướng<select value={direction} onChange={(e) => { stop(); setDirection(e.target.value as Direction) }}><option value="right">Trái → phải</option><option value="left">Phải → trái</option><option value="up">Dưới → trên</option><option value="down">Trên → dưới</option></select></label>
                        <label>Mục tiêu<select value={multiple ? "3" : "1"} onChange={(e) => { stop(); setMultiple(e.target.value === "3") }}><option value="1">1 mục tiêu</option><option value="3">3 mục tiêu</option></select></label>
                        <label>Cường độ <b>{intensity.toFixed(1)}×</b><input aria-label="Cường độ" type="range" min="0.5" max="3" step="0.5" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} /></label>
                        <label className="vfx-check"><input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} />Chí mạng</label>
                    </div>
                </section>
                {mode === "heroes" && <section className="vfx-skill-panel"><h3>{hero.name} · đòn đánh & bộ chiêu</h3><div className="vfx-skills">{(["basic",
                    "p",
                    "q",
                    "e",
                    "r"] as const).map((key) => {
                    const p = heroPreview(key)
                    return <button key={key} data-skill={key} onClick={() => void play(p)} className={selected.id === p.id ? "selected" : ""}>{key === "basic" ? <img src="/card_support/basic.png" alt="" /> : <img src={p.icon} alt="" />}<span>{key === "basic" ? "Đánh thường" : key.toUpperCase()}</span></button>
                })}</div></section>}
                <div className="vfx-sequence"><span>Niệm</span><b>{selected.style?.cast ?? "—"}</b><i>→</i><span>Bay</span><b>{selected.style?.travel ?? (selected.effect?.mode === "travel" ? selected.id : "—")}</b><i>→</i><span>Trúng</span><b>{selected.style?.impact ?? (selected.effect?.mode !== "travel" ? selected.id : "—")}</b></div>
                <footer className="vfx-diagnostics" aria-live="polite"><span>{stats.active} đang chạy · {stats.particles} phần tử · {stats.completed} lần phát xong</span><span>{issues.length ? `${issues.length} mapping cần sửa` : `Đủ ${heroes.length} bộ Đánh/P/Q/E/R · không thiếu hiệu ứng`}</span></footer>
                {stats.reducedMotion && <p role="status" className="vfx-warning">Thiết bị đang bật giảm chuyển động. Tắt tùy chọn này trong cài đặt hệ thống để xem hiệu ứng.</p>}
                {stats.error && <p role="alert" className="vfx-error">{stats.error}</p>}
                {issues.length > 0 && <ul className="vfx-error">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
            </main>
        </div>
    </div>
}

export function mountVfxGallery() {
    document.getElementById("lobby")?.remove()
    const host = document.getElementById("app")!
    createRoot(host).render(<VfxGallery />)
}
