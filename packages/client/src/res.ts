// Độ phân giải thích ứng: bố cục luôn tính theo 1280×800, canvas lấy đúng pixel vật lý của màn hình
// (cửa sổ × devicePixelRatio, màn 4K là 3840×2160) và camera zoom cho vừa.
export const VIEW_W = 1280, VIEW_H = 800

/** Số pixel thật ứng với 1 đơn vị bố cục (cập nhật khi đổi kích thước cửa sổ) */
export const view = {
    zoom: 1
}

export const screenSize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1,
        3)
    return {
        w: Math.round(window.innerWidth * dpr), h: Math.round(window.innerHeight * dpr)
    }
}
export const fitZoom = (w: number, h: number) => Math.min(w / VIEW_W,
    h / VIEW_H)
/** Hệ số cho texture vẽ bằng canvas (nền bản đồ): 1..3, màn 4K là 3 */
export const texRes = () => Math.min(3,
    Math.max(1,
        Math.ceil(view.zoom)))
