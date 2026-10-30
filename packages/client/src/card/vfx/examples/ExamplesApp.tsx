import {
    useEffect, useRef, useState, useSyncExternalStore
} from "react"
import {
    createRoot
} from "react-dom/client"
import {
    CardApp
} from "../../CardApp"
import {
    getCard, useCard
} from "../../store"
import {
    clearVfx
} from "../VfxCanvas"
import {
    LocalExampleGame
} from "./localGame"
import {
    EXAMPLES, scenarioSlug
} from "./scenarios"
import {
    injectNineCss
} from "../../../nine"
import "./examples.css"

declare global {
    interface Window { starciExamples?: LocalExampleGame }
}

function ExampleGame({ game }: { game: LocalExampleGame }) {
    const snap = useCard()
    const tools = useRef<HTMLDetailsElement>(null)
    useSyncExternalStore(game.subscribe,
        game.version)
    const [chapter,
        setChapter] = useState(0)
    const spec = game.scenario.spec
    const active = snap.view?.active === "A" ? "Xanh" : "Đỏ"
    const action = game.recommended()
    const ready = !snap.presenting && game.state.phase !== "over"
    const moments = game.history.filter((frame) => frame.n === 0 || frame.events.some((e) => ["chainAdd",
        "chainResolve",
        "craft",
        "kill",
        "respawn",
        "roundStart"].includes(e.t)))

    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || !tools.current?.open) return
            e.preventDefault()
            tools.current.open = false
            tools.current.querySelector<HTMLElement>("summary")?.focus()
        }
        window.addEventListener("keydown",
            key)
        return () => window.removeEventListener("keydown",
            key)
    },
    [])
    useEffect(() => {
        window.starciExamples = game
        document.body.classList.add("vfx-example-page")
        document.title = `${spec.title} · StarCi Sandbox`
        game.start()
        return () => {
            game.stop()
            clearVfx()
            if (window.starciExamples === game) delete window.starciExamples
            document.body.classList.remove("vfx-example-page")
        }
    },
    [game,
        spec.title])

    return <div className="example-root" data-example={spec.slug} data-presenting={snap.presenting} data-phase={snap.view?.phase}>
        <div className="example-host cg-host"><CardApp /></div>
        <details className="example-tools" ref={tools} data-example-tools>
            <summary aria-controls="example-tools-panel">Tình huống</summary>
            <div className="example-tools-panel" id="example-tools-panel" role="region" aria-label="Công cụ tình huống">
                <header className="example-toolbar">
                    <div className="example-brand"><a href="/vfx">STARCI <small>VFX</small></a><span>GAME SANDBOX · KHÔNG CẦN ĐĂNG NHẬP</span></div>
                    <label className="example-picker">Tình huống<select aria-label="Tình huống" value={spec.slug} onChange={(e) => { location.href = `/vfx/examples/${e.target.value}` }}>{EXAMPLES.map((x) => <option key={x.slug} value={x.slug}>{x.title}</option>)}</select></label>
                    <div className="example-buttons">
                        <button onClick={() => location.reload()}>Chơi lại</button>
                        <button data-recommended disabled={!ready || !action || !snap.legal.some((a) => JSON.stringify(a) === JSON.stringify(action))} onClick={() => game.playRecommended()}>Chơi lá gợi ý</button>
                        <button data-autoplay aria-pressed={game.auto} onClick={() => game.setAuto(!game.auto)}>{game.auto ? "Bạn chơi tiếp" : "Máy tự đấu cả trận"}</button>
                        <button data-pause onClick={() => game.setPaused(!game.paused)}>{game.paused ? "Chạy tiếp máy" : "Dừng máy"}</button>
                        <label className="example-dual"><input type="checkbox" checked={game.bothSides} disabled={!ready} onChange={(e) => game.setBothSides(e.target.checked)} />2 phe</label>
                    </div>
                </header>
                <section className="example-caption"><div><h1>{spec.title}</h1><p>{spec.caption}</p></div><span>{snap.presenting ? "Đang giải quyết…" : game.paused ? "Máy đã dừng" : game.state.phase === "over" ? "Trận đã kết thúc" : `Lượt ${active} · bạn được chơi tự do`}</span></section>
                <footer className="example-footer">
                    <span className="example-current" aria-live="polite">{game.label} <small>· Seed {game.state.seed} · {game.history.length - 1} hành động</small></span>
                    <div className="example-chapters"><label>Chơi nhánh từ<select aria-label="Mốc trận đấu" value={chapter} onChange={(e) => setChapter(Number(e.target.value))}>{moments.map((frame) => <option key={frame.n} value={frame.n}>#{frame.n} · Vòng {frame.state.round} · {frame.title}</option>)}</select></label><button disabled={snap.presenting || !game.history[chapter]} onClick={() => game.fork(chapter)}>Mở nhánh</button></div>
                </footer>
            </div>
        </details>
        {getCard().error && <div role="alert" className="example-error">{getCard().error}</div>}
    </div>
}

export function mountVfxExamples() {
    injectNineCss()
    document.getElementById("lobby")?.remove()
    const path = scenarioSlug(location.pathname)
    const raw = Number(new URLSearchParams(location.search).get("seed") ?? 710)
    const seed = Number.isInteger(raw) && raw > 0 ? raw : 710
    const game = new LocalExampleGame(path,
        seed)
    game.prepare()
    createRoot(document.getElementById("app")!).render(<ExampleGame game={game} />)
}
