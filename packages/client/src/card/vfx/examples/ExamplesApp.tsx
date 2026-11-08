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
import {
    runNamiShowcase
} from "./namiShowcase"
import {
    runRenataShowcase
} from "./renataShowcase"
import {
    runJannaShowcase
} from "./jannaShowcase"
import {
    runSorakaShowcase
} from "./sorakaShowcase"
import {
    runAhriShowcase
} from "./ahriShowcase"
import {
    runLuxShowcase
} from "./luxShowcase"
import {
    runBrandShowcase
} from "./brandShowcase"
import {
    runLissandraShowcase
} from "./lissandraShowcase"
import {
    dressQiyana, runQiyanaShowcase
} from "./qiyanaShowcase"
import {
    runKatarinaShowcase
} from "./katarinaShowcase"
import {
    runKhazixShowcase
} from "./khazixShowcase"
import {
    runTwistedFateShowcase
} from "./twistedfateShowcase"
import {
    runViktorShowcase
} from "./viktorShowcase"
import {
    runBlitzcrankShowcase
} from "./blitzcrankShowcase"
import {
    runBasicsShowcase
} from "./basicsShowcase"
import {
    runSylasShowcase
} from "./sylasShowcase"
import {
    runMelShowcase
} from "./melShowcase"
import {
    runAzirShowcase
} from "./azirShowcase"
import {
    runJayceShowcase
} from "./jayceShowcase"
import {
    dressRumble, runRumbleShowcase
} from "./rumbleShowcase"
import {
    runTristanaShowcase
} from "./tristanaShowcase"
import {
    runVelkozShowcase
} from "./velkozShowcase"
import {
    runMalphiteShowcase
} from "./malphiteShowcase"
import {
    runAnnieShowcase
} from "./annieShowcase"
import {
    runOrnnShowcase
} from "./ornnShowcase"
import {
    runBraumShowcase
} from "./braumShowcase"
import {
    runMissFortuneShowcase
} from "./missfortuneShowcase"
import {
    runGarenShowcase
} from "./garenShowcase"
import {
    runLeonaShowcase
} from "./leonaShowcase"
import {
    runDariusShowcase
} from "./dariusShowcase"
import {
    runJinxShowcase
} from "./jinxShowcase"
import {
    runKogmawShowcase
} from "./kogmawShowcase"
import {
    runAsheShowcase
} from "./asheShowcase"
import {
    runTeemoShowcase
} from "./teemoShowcase"
import {
    runAatroxShowcase
} from "./aatroxShowcase"
import {
    runGangplankShowcase
} from "./gangplankShowcase"
import {
    runYorickShowcase
} from "./yorickShowcase"
import {
    runZedShowcase
} from "./zedShowcase"
import {
    runVayneShowcase
} from "./vayneShowcase"
import "./examples.css"

declare global {
    interface Window { starciExamples?: LocalExampleGame }
}

/** Tình huống có nút phát demo VFX đủ bộ chiêu */
const SHOWCASES: Record<string, { label: string; run: (say: (text: string) => void) => Promise<void>; dress?: () => () => void }> = {
    "basic-attacks": {
        label: "Phát 33 đòn đánh thường", run: runBasicsShowcase
    },
    "nami-kit": {
        label: "Phát VFX Nami", run: runNamiShowcase
    },
    "renata-kit": {
        label: "Phát VFX Renata", run: runRenataShowcase
    },
    "janna-kit": {
        label: "Phát VFX Janna", run: runJannaShowcase
    },
    "soraka-kit": {
        label: "Phát VFX Soraka", run: runSorakaShowcase
    },
    "brand-kit": {
        label: "Phát VFX Brand", run: runBrandShowcase
    },
    "lissandra-kit": {
        label: "Phát VFX Lissandra", run: runLissandraShowcase
    },
    "ahri-kit": {
        label: "Phát VFX Ahri", run: runAhriShowcase
    },
    "viktor-kit": {
        label: "Phát VFX Viktor", run: runViktorShowcase
    },
    "lux-kit": {
        label: "Phát VFX Lux", run: runLuxShowcase
    },
    "teemo-kit": {
        label: "Phát VFX Teemo", run: runTeemoShowcase
    },
    "qiyana-kit": {
        label: "Phát VFX Qiyana", run: runQiyanaShowcase, dress: dressQiyana
    },
    "katarina-kit": {
        label: "Phát VFX Katarina", run: runKatarinaShowcase
    },
    "khazix-kit": {
        label: "Phát VFX Kha'Zix", run: runKhazixShowcase
    },
    "twistedfate-kit": {
        label: "Phát VFX Twisted Fate", run: runTwistedFateShowcase
    },
    "annie-kit": {
        label: "Phát VFX Annie", run: runAnnieShowcase
    },
    "malphite-kit": {
        label: "Phát VFX Malphite", run: runMalphiteShowcase
    },
    "sylas-kit": {
        label: "Phát VFX Sylas", run: runSylasShowcase
    },
    "mel-kit": {
        label: "Phát VFX Mel", run: runMelShowcase
    },
    "azir-kit": {
        label: "Phát VFX Azir", run: runAzirShowcase
    },
    "jayce-kit": {
        label: "Phát VFX Jayce", run: runJayceShowcase
    },
    "velkoz-kit": {
        label: "Phát VFX Vel'Koz", run: runVelkozShowcase
    },
    "braum-kit": {
        label: "Phát VFX Braum", run: runBraumShowcase
    },
    "missfortune-kit": {
        label: "Phát VFX Miss Fortune", run: runMissFortuneShowcase
    },
    "blitzcrank-kit": {
        label: "Phát VFX Blitzcrank", run: runBlitzcrankShowcase
    },
    "aatrox-kit": {
        label: "Phát VFX Aatrox", run: runAatroxShowcase
    },
    "ornn-kit": {
        label: "Phát VFX Ornn", run: runOrnnShowcase
    },
    "kogmaw-kit": {
        label: "Phát VFX Kog'Maw", run: runKogmawShowcase
    },
    "ashe-kit": {
        label: "Phát VFX Ashe", run: runAsheShowcase
    },
    "vayne-kit": {
        label: "Phát VFX Vayne", run: runVayneShowcase
    },
    "garen-kit": {
        label: "Phát VFX Garen", run: runGarenShowcase
    },
    "darius-kit": {
        label: "Phát VFX Darius", run: runDariusShowcase
    },
    "leona-kit": {
        label: "Phát VFX Leona", run: runLeonaShowcase
    },
    "jinx-kit": {
        label: "Phát VFX Jinx", run: runJinxShowcase
    },
    "tristana-kit": {
        label: "Phát VFX Tristana", run: runTristanaShowcase
    },
    "yorick-kit": {
        label: "Phát VFX Yorick", run: runYorickShowcase
    },
    "gangplank-kit": {
        label: "Phát VFX Gangplank", run: runGangplankShowcase
    },
    "zed-kit": {
        label: "Phát VFX Zed", run: runZedShowcase
    },
    "rumble-kit": {
        label: "Phát VFX Rumble", run: runRumbleShowcase, dress: dressRumble
    }
}

function ExampleGame({ game }: { game: LocalExampleGame }) {
    const snap = useCard()
    const tools = useRef<HTMLDetailsElement>(null)
    useSyncExternalStore(game.subscribe,
        game.version)
    const [chapter,
        setChapter] = useState(0)
    const [beat,
        setBeat] = useState("")
    const spec = game.scenario.spec
    const kit = SHOWCASES[spec.slug]
    const isNami = spec.slug === "nami-kit"
    const showcase = () => {
        if (kit && !beat) void kit.run(setBeat).finally(() => setBeat(""))
    }
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
    useEffect(() => kit?.dress?.(),
        [kit])
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
                        {kit && <button data-showcase={spec.slug} data-nami-showcase={isNami || undefined} disabled={!!beat} onClick={showcase}>{kit.label}</button>}
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
        {beat && <div className="example-beat" data-beat data-nami-beat={isNami || undefined} aria-live="polite">{beat}</div>}
        {getCard().error && <div role="alert" className="example-error">{getCard().error}</div>}
    </div>
}

export function mountVfxExamples() {
    injectNineCss()
    document.getElementById("lobby")?.remove()
    const fireDemo = location.pathname.replace(/\/$/,
        "") === "/vfx/demo"
    const path = fireDemo ? "brand-kit" : scenarioSlug(location.pathname)
    const raw = Number(new URLSearchParams(location.search).get("seed") ?? 710)
    const seed = Number.isInteger(raw) && raw > 0 ? raw : 710
    const game = new LocalExampleGame(path,
        seed)
    if (fireDemo) {
        game.setPaused(true)
        const player = game.state.players.A
        const cards = [...player.hand,
            ...player.deck]
        player.hand = ["brand_q",
            "brand_e",
            "brand_r"].map(id => cards.find(card => card.id === id)!).filter(Boolean)
        const ids = new Set(player.hand.map(card => card.uid))
        player.deck = cards.filter(card => !ids.has(card.uid))
        game.state.teamMana.A = 200
    }
    game.prepare()
    createRoot(document.getElementById("app")!).render(<ExampleGame game={game} />)
    if (fireDemo) void import("../BrandBoardDemo").then(({ mountBrandBoardDemo }) => mountBrandBoardDemo(game))
}
