// Điểm vào của client Cocos: gắn component này vào node Canvas của scene Main.
// Nạp font, dựng nền menu chung (bg/menu, bản đồ chỉ dùng cho sân đấu), giữ phiên đăng nhập và kho lá, chuyển màn.
// Màn trận (ghép, cấm/chọn, đấu, kết quả) chuyển theo trạng thái phòng đấu ở net/game.ts.
import {
    _decorator, Color, Component, Graphics, Node, ResolutionPolicy, Tween, UIOpacity, Vec3, tween, view
} from "cc"
import {
    C, STAGE, withAlpha
} from "./dna/theme"
import {
    cardCatalog, restoreSession, signOut, type CardCatalog, type DeckRow, type Session
} from "./net/api"
import {
    gameActions, getGame, onGame, type Stage
} from "./net/game"
import "./vfx/sylas"
import {
    image, loadFonts
} from "./ui/assets"
import {
    box, clear, text
} from "./ui/kit"
import {
    buildAuth
} from "./screens/AuthScreen"
import {
    buildDeckList
} from "./screens/DeckListScreen"
import {
    buildDeckBuilder
} from "./screens/DeckBuilderScreen"
import {
    buildLobby
} from "./screens/LobbyScreen"
import {
    buildMatchmaking
} from "./screens/MatchmakingScreen"
import {
    buildDraft
} from "./screens/DraftScreen"
import {
    buildMatch
} from "./screens/match/MatchScreen"
import {
    buildResult
} from "./screens/match/ResultScreen"
import {
    buildVfxGallery
} from "./screens/VfxGalleryScreen"
import {
    buildHeroGallery
} from "./screens/HeroGalleryScreen"
import {
    settings
} from "./net/settings"
import type {
    MatchMode, Nav
} from "./screens/nav"

const { ccclass } = _decorator

type MatchScreen = "matchmaking" | "draft" | "match" | "result" | null

@ccclass("App")
export class App extends Component implements Nav {
    session: Session | null = null
    catalog: CardCatalog | null = null
    private screen!: Node
    private matchVeil!: Node
    private dispose: (() => void) | null = null
    private matchScreen: MatchScreen = null
    private lastMode: MatchMode = {
        kind: "quick"
    }
    private lastDeck: string[] | null = null
    private deckName = "Bộ mặc định"

    onLoad() {
        view.setDesignResolutionSize(STAGE.w,
            STAGE.h,
            ResolutionPolicy.SHOW_ALL)
        this.backdrop()
        this.screen = box("Screen",
            this.node,
            STAGE.w,
            STAGE.h)
        onGame((s) => this.followStage(s.stage))
        // Móc gỡ lỗi cho kiểm thử tự động (Playwright): đọc trạng thái phòng và gửi hành động như người chơi
        ;(globalThis as unknown as { starciDebug: unknown }).starciDebug = {
            gameActions, getGame
        }
    }

    async start() {
        await loadFonts()
        // ?vfx trên đường dẫn preview: mở màn xem thử VFX theo chiêu (cho dev chỉnh hiệu ứng từng chiêu)
        if (typeof location !== "undefined" && new URLSearchParams(location.search).has("vfx")) {
            this.matchVeil.active = true
            return this.swap((r) => buildVfxGallery(r,
                () => { this.matchVeil.active = false; void this.start() }))
        }
        text(this.screen,
            "Đang kết nối…",
            0,
            0,
            {
                size: 24, color: C.textMuted
            })
        try {
            this.catalog = await cardCatalog()
        } catch (e) {
            return this.showAuth((e as Error).message)
        }
        const session = await restoreSession()
        if (session) this.signedIn(session)
        else this.showAuth()
    }

    /** Dọn màn cũ (huỷ timer, listener) rồi dựng màn mới */
    private swap(build: (root: Node) => (() => void) | void, match: MatchScreen = null) {
        this.dispose?.()
        this.dispose = null
        clear(this.screen)
        this.matchScreen = match
        this.matchVeil.active = match === "match"
        this.dispose = build(this.screen) ?? null
        // Màn mới hiện dần
        const op = this.screen.getComponent(UIOpacity) ?? this.screen.addComponent(UIOpacity)
        Tween.stopAllByTarget(op)
        op.opacity = 0
        tween(op).to(0.25,
            {
                opacity: 255
            }).start()
    }

    showAuth(message = "") {
        this.swap((r) => buildAuth(r,
            this,
            message))
    }

    showLobby(message = "") {
        this.swap((r) => { void buildLobby(r, this, message) })
    }

    showDecks(message = "") {
        this.swap((r) => { void buildDeckList(r, this, message) })
    }

    showHeroes(hero?: string) {
        this.swap((r) => buildHeroGallery(r,
            this,
            hero))
    }

    showBuilder(deck: DeckRow | null) {
        this.swap((r) => buildDeckBuilder(r,
            this,
            deck))
    }

    startMatch(mode: MatchMode, deck: string[] | null, deckName?: string) {
        this.lastMode = mode
        this.lastDeck = deck
        if (deckName) this.deckName = deckName
        this.swap((r) => buildMatchmaking(r,
            this,
            mode,
            this.deckName,
            () => this.startMatch(mode,
                deck)),
        "matchmaking")
        void gameActions.connect({
            name: this.session?.user.name ?? "Khách",
            token: this.session?.token,
            deck: deck ?? undefined,
            bot: mode.kind === "bot" ? mode.level : undefined,
            roomId: mode.kind === "join" ? mode.roomId : undefined,
            create: mode.kind === "create",
            ranked: mode.kind === "ranked",
        })
    }

    leaveMatch() {
        void gameActions.leave()
        this.showLobby()
    }

    /** Màn trận đi theo stage của phòng đấu */
    private followStage(stage: Stage) {
        if (!this.matchScreen) return
        if (stage === "draft" && this.matchScreen !== "draft") this.swap((r) => buildDraft(r,
            this,
            this.deckName),
        "draft")
        else if (stage === "playing" && this.matchScreen !== "match") this.swap((r) => buildMatch(r,
            this),
        "match")
        else if (stage === "ended" && this.matchScreen === "match") {
            this.matchScreen = "result"
            // để VFX cuối trận chạy xong rồi mới sang màn kết quả
            this.scheduleOnce(() => this.swap((r) => buildResult(r,
                () => this.leaveMatch(),
                () => this.startMatch(this.lastMode,
                    this.lastDeck)),
            "result"),
            1.5)
        }
    }

    signedIn(session: Session) {
        this.session = session
        if (!this.catalog) void cardCatalog().then((c) => { this.catalog = c }).catch(() => undefined)
        this.showLobby()
    }

    signOut() {
        void gameActions.leave()
        signOut()
        this.session = null
        this.showAuth()
    }

    /** Hạt sáng lơ lửng chậm trên nền menu cho màn hình có sức sống (xanh ngọc và vàng) */
    private motes(parent: Node) {
        if (!settings().motes) return
        const layer = box("Motes",
            parent,
            STAGE.w,
            STAGE.h)
        for (let i = 0; i < 34; i++) {
            const r = 1.5 + Math.random() * 2.6
            const n = box("Mote",
                layer,
                r * 4,
                r * 4,
                (Math.random() - 0.5) * STAGE.w,
                (Math.random() - 0.5) * STAGE.h)
            const g = n.addComponent(Graphics)
            const warm = Math.random() < 0.35
            g.fillColor = warm ? new Color(240,
                200,
                120,
                70) : new Color(60,
                220,
                210,
                70)
            g.circle(0,
                0,
                r * 1.8)
            g.fill()
            g.fillColor = warm ? new Color(255,
                235,
                190,
                220) : new Color(170,
                255,
                250,
                220)
            g.circle(0,
                0,
                r)
            g.fill()
            const dur = 6 + Math.random() * 8
            const dx = (Math.random() - 0.5) * 120, dy = 30 + Math.random() * 70
            tween(n).by(dur,
                {
                    position: new Vec3(dx,
                        dy,
                        0)
                },
                {
                    easing: "sineInOut"
                }).by(dur,
                {
                    position: new Vec3(-dx,
                        -dy,
                        0)
                },
                {
                    easing: "sineInOut"
                }).union().repeatForever().start()
            const op = n.addComponent(UIOpacity)
            op.opacity = 60 + Math.random() * 120
            tween(op).to(2 + Math.random() * 3,
                {
                    opacity: 255
                },
                {
                    easing: "sineInOut"
                }).to(2 + Math.random() * 3,
                {
                    opacity: 40
                },
                {
                    easing: "sineInOut"
                }).union().repeatForever().start()
        }
    }

    /** Nền: màu than, tranh nền menu chung, lớp tối nhẹ; trong trận phủ thêm nền tối để bàn đấu nổi lên */
    private backdrop() {
        const root = box("Backdrop",
            this.node,
            STAGE.w,
            STAGE.h)
        const base = box("Base",
            root,
            STAGE.w,
            STAGE.h).addComponent(Graphics)
        base.fillColor = C.bg
        base.rect(-STAGE.w / 2,
            -STAGE.h / 2,
            STAGE.w,
            STAGE.h)
        base.fill()
        image(root,
            "bg/menu",
            STAGE.w,
            STAGE.h)
        const shade = box("Shade",
            root,
            STAGE.w,
            STAGE.h).addComponent(Graphics)
        shade.fillColor = withAlpha(C.bg,
            70)
        shade.rect(-STAGE.w / 2,
            -STAGE.h / 2,
            STAGE.w,
            STAGE.h)
        shade.fill()
        this.motes(root)
        this.matchVeil = box("MatchVeil",
            root,
            STAGE.w,
            STAGE.h)
        const veil = this.matchVeil.addComponent(Graphics)
        veil.fillColor = withAlpha(C.bg,
            245)
        veil.rect(-STAGE.w / 2,
            -STAGE.h / 2,
            STAGE.w,
            STAGE.h)
        veil.fill()
        this.matchVeil.active = false
    }
}
