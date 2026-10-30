import {
    applyLocale, type Lang
} from "@starci/shared"
import "@fontsource/nunito/400.css"
import "@fontsource/nunito/600.css"
import "@fontsource/nunito/700.css"
import "@fontsource/nunito/800.css"
import "@fontsource/alegreya/latin-700.css"
import "@fontsource/alegreya/vietnamese-700.css"
import "@fontsource/alegreya/latin-800.css"
import "@fontsource/alegreya/vietnamese-800.css"
import "@fontsource/alegreya-sans/latin-400.css"
import "@fontsource/alegreya-sans/vietnamese-400.css"
import "@fontsource/alegreya-sans/latin-700.css"
import "@fontsource/alegreya-sans/vietnamese-700.css"
import "./game-type.css"

let saved: string | null = null
try { saved = localStorage.getItem("lang") } catch { /* chế độ riêng tư */ }
applyLocale(saved === "en" ? "en" : ("vi" as Lang))

// Trang VFX xem độc lập, không đăng nhập và không cần server trận đấu.
if (location.pathname.startsWith("/vfx/examples")) {
    const { mountVfxExamples } = await import("./card/vfx/examples/ExamplesApp")
    mountVfxExamples()
} else if (location.pathname.replace(/\/$/,
    "") === "/vfx") {
    const { mountVfxGallery } = await import("./card/vfx/VfxGallery")
    mountVfxGallery()
} else {
    const [{ showLobby },
        { injectNineCss }] = await Promise.all([import("./lobby"),
        import("./nine")])
    injectNineCss()
    const picked = await showLobby()
    if (picked.mode.kind === "card") {
        const { startCardGame } = await import("./card/CardApp")
        startCardGame({
            name: picked.name, token: picked.token, bot: picked.mode.bot, roomId: picked.mode.roomId, deck: picked.mode.deck
        })
    } else {
        const { startBoard } = await import("./legacyBoard")
        await startBoard()
    }
}
