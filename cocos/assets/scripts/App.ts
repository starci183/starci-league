// Điểm vào của client Cocos: gắn component này vào node Canvas của scene Main.
// Nạp font, dựng nền menu chung (bg/menu, bản đồ chỉ dùng cho sân đấu), giữ phiên đăng nhập và kho lá, chuyển màn.
import {
    _decorator, Component, Graphics, Node, ResolutionPolicy, view
} from "cc"
import {
    C, STAGE, withAlpha
} from "./dna/theme"
import {
    cardCatalog, restoreSession, signOut, type CardCatalog, type DeckRow, type Session
} from "./net/api"
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
import type {
    Nav
} from "./screens/nav"

const { ccclass } = _decorator

@ccclass("App")
export class App extends Component implements Nav {
    session: Session | null = null
    catalog: CardCatalog | null = null
    private screen!: Node

    onLoad() {
        view.setDesignResolutionSize(STAGE.w,
            STAGE.h,
            ResolutionPolicy.SHOW_ALL)
        this.backdrop()
        this.screen = box("Screen",
            this.node,
            STAGE.w,
            STAGE.h)
    }

    async start() {
        await loadFonts()
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

    showAuth(message = "") {
        clear(this.screen)
        buildAuth(this.screen,
            this,
            message)
    }

    showDecks(message = "") {
        clear(this.screen)
        void buildDeckList(this.screen,
            this,
            message)
    }

    showBuilder(deck: DeckRow | null) {
        clear(this.screen)
        buildDeckBuilder(this.screen,
            this,
            deck)
    }

    signedIn(session: Session) {
        this.session = session
        if (!this.catalog) void cardCatalog().then((c) => { this.catalog = c }).catch(() => undefined)
        this.showDecks()
    }

    signOut() {
        signOut()
        this.session = null
        this.showAuth()
    }

    /** Nền: màu than, tranh nền menu chung, lớp tối nhẹ để panel và chữ nổi lên */
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
    }
}
