import {
    useEffect, useLayoutEffect, useState, type CSSProperties
} from "react"
import {
    createRoot
} from "react-dom/client"
import "./modular-asset-preview.css"
import {
    ArtFrame as Frame
} from "./ArtFrame"

function Meter(p: { kind: "hp" | "mana"; value: number; max: number; showMask: boolean }) {
    return <Frame kind="meter" width={330} height={44} className={`mav-meter mav-${p.kind}`} showMask={p.showMask} label={p.kind === "hp" ? "Máu" : "Mana"} fill={<div className="mav-meter-track"><i style={{
        width: `${p.value / p.max * 100}%`
    }} /></div>}><span className="mav-meter-copy">{p.kind === "hp" ? "MÁU" : "MANA"}<strong>{p.value} / {p.max}</strong></span></Frame>
}

function ModularAssetPreview() {
    const fit = () => Math.min(window.innerWidth / 1920,
        window.innerHeight / 1080)
    const [scale,
            setScale] = useState(fit), [showMask,
            setShowMask] = useState(false), [hp,
            setHp] = useState(400), [mana,
            setMana] = useState(120)
    useLayoutEffect(() => { const resize = () => setScale(fit()); window.addEventListener("resize",
        resize); return () => window.removeEventListener("resize",
        resize) },
    [])
    useEffect(() => { document.title = "Starci · Khung rời và mask alpha"; document.body.classList.add("modular-asset-page"); return () => document.body.classList.remove("modular-asset-page") },
        [])
    return <div className="mav-viewport"><main className="mav-stage" style={{
        "--mav-scale": scale
    } as CSSProperties} data-modular-stage data-scale={scale}>
        <div className="mav-heading"><Frame kind="title" width={1000} height={130} showMask={showMask}><h1>STARCI · KHUNG RỜI</h1></Frame></div>
        <button className={`mav-mask-toggle ${showMask ? "active" : ""}`} aria-pressed={showMask} onClick={() => setShowMask(!showMask)}>◈ {showMask ? "Ẩn vùng mask" : "Hiện vùng mask"}</button>
        <div className="mav-main-panel"><Frame kind="panel" width={1770} height={850} showMask={showMask} fill={<div className="mav-panel-material" />}><div className="mav-inspector-layout">
            <section className="mav-champion" aria-label="Tướng Jayce">
                <Frame kind="portrait" width={245} height={300} image="/heroes/jayce.jpg" showMask={showMask} />
                <Frame kind="name" width={330} height={60} showMask={showMask}><h2>JAYCE</h2></Frame>
                <p className="mav-role">Pháo Thủy Ngân · Xạ thủ</p>
                <Meter kind="hp" value={hp} max={400} showMask={showMask} /><Meter kind="mana" value={mana} max={200} showMask={showMask} />
                <div className="mav-stats"><span>AD<b>92</b></span><span>AP<b>0</b></span><span>GIÁP<b>30</b></span><span>KHÁNG PHÉP<b>28</b></span></div>
            </section>
            <section className="mav-components" aria-label="Ghép từng thành phần">
                <Frame kind="title" width={560} height={70} showMask={showMask}><h2>TỪNG MẢNH GHÉP</h2></Frame>
                <div className="mav-component-row"><div className="mav-jinx-module"><Frame kind="portrait" width={210} height={256} image="/heroes/jinx.jpg" showMask={showMask} /><Frame kind="name" width={220} height={50} showMask={showMask}><h3>JINX · XƯƠNG CÁ</h3></Frame></div>
                    <div className="mav-item-modules"><div><Frame kind="icon" width={96} height={96} image="/card_support/gold.png" showMask={showMask} /><Frame kind="name" width={190} height={42} showMask={showMask}><h3>VÀNG ×1</h3></Frame></div><div><Frame kind="icon" width={96} height={96} image="/items_art/cung_go.jpg" showMask={showMask} /><Frame kind="name" width={190} height={42} showMask={showMask}><h3>CUNG GỖ</h3></Frame></div></div>
                </div>
                <div className="mav-design-copy"><h3>Chân dung, tên, chỉ số và trang bị</h3><p>Art được mask bên dưới, khung PNG ở trên; tên và chỉ số là chữ riêng.</p><span>Đây là phòng dựng giao diện, không phải trận đấu.</span></div>
                <div className="mav-demo-actions"><button onClick={() => setHp(Math.max(0,
                    hp - 80))}><Frame kind="name" width={180} height={52}><span>Thử sát thương</span></Frame></button><button onClick={() => setMana(Math.max(0,
                    mana - 25))}><Frame kind="name" width={180} height={52}><span>Thử tiêu mana</span></Frame></button><button onClick={() => { setHp(400); setMana(120) }}><Frame kind="name" width={150} height={52}><span>Hồi phục</span></Frame></button></div>
            </section>
        </div></Frame></div>
        <p className="mav-footer">1920 × 1080 · Khung ảnh nguyên bản · Mask lấy từ pixel alpha{showMask ? " · Vùng xanh lam là vùng nội dung thực" : ""}</p>
    </main></div>
}

export function mountModularAssetPreview() { document.getElementById("lobby")?.remove(); createRoot(document.getElementById("app")!).render(<ModularAssetPreview />) }

