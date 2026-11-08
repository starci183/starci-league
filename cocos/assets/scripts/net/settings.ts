// Cài đặt người chơi lưu cục bộ (sys.localStorage "sc.settings"): bật tắt hiệu ứng chiêu, hạt nền, âm thanh.
import {
    sys
} from "cc"

export interface Settings { vfx: boolean; motes: boolean; sound: boolean; skipBanners: boolean }

const KEY = "sc.settings"
const DEFAULTS: Settings = {
    vfx: true, motes: true, sound: true, skipBanners: false
}

let cache: Settings | null = null

export function settings(): Settings {
    if (cache) return cache
    let saved: Partial<Settings> = {
    }
    try { saved = JSON.parse(sys.localStorage.getItem(KEY) ?? "{}") as Partial<Settings> } catch { /* dữ liệu hỏng thì dùng mặc định */ }
    cache = {
        ...DEFAULTS, ...saved
    }
    return cache
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    cache = {
        ...settings(), [key]: value
    }
    try { sys.localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* không lưu được thì giữ trong phiên */ }
}
