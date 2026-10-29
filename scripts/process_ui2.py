# Gom ảnh Codex vẽ (.work/codex_ui2/<lô>) -> public/ui/nine (nút, ô nhập, thanh cuộn, tab) và public/ui/status (icon hiệu ứng).
# Ảnh UI: bỏ nền magenta, cắt sát, thu về cỡ hiển thị, ghi số px cắt 9-slice vào src/nineMeta.ts.
# Chạy: python scripts/process_ui2.py  (từ thư mục starci-league)
import json, pathlib, re, sys
import numpy as np
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORK = ROOT / ".work/codex_ui2"
GEN = pathlib.Path.home() / ".codex/generated_images"
PUB = ROOT / "packages/client/public/ui"
META = ROOT / "packages/client/src/nineMeta.ts"

# tên ảnh -> (chiều cao sau khi thu, tỉ lệ cắt [trên, phải, dưới, trái] theo chiều cao ảnh)
UI = {
    "btn_gold": (96, (.42, .62, .42, .62)), "btn_gold_hover": (96, (.42, .62, .42, .62)),
    "btn_blue": (96, (.42, .62, .42, .62)), "btn_blue_hover": (96, (.42, .62, .42, .62)),
    "btn_disabled": (96, (.42, .62, .42, .62)),
    "input": (72, (.4, .5, .4, .5)), "input_focus": (72, (.4, .5, .4, .5)),
    "tab_on": (80, (.4, .55, .4, .55)), "tab_off": (80, (.4, .55, .4, .55)),
}
# thanh cuộn dọc: theo chiều rộng
SCROLL = {"scroll_track": 28, "scroll_thumb": 24}


def find_session(batch: str):
    # phiên Codex ghi cwd vào ~/.codex/sessions/**/rollout-*.jsonl; tên thư mục ảnh = id phiên
    want = ("/" + "codex_ui2/" + batch).lower()
    for f in sorted((pathlib.Path.home() / ".codex/sessions").rglob("rollout-*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True):
        head = f.open(encoding="utf-8", errors="ignore").readline()
        try:
            meta = json.loads(head).get("payload", {})
        except json.JSONDecodeError:
            continue
        cwd = str(meta.get("cwd", "")).replace("\\", "/").lower()
        if cwd.endswith(want):
            for sid in (meta.get("id"), meta.get("session_id")):
                d = GEN / str(sid)
                if sid and d.is_dir():
                    return sorted(d.glob("*.png"), key=lambda p: p.stat().st_mtime)
    return []


def key_out(im: Image.Image) -> Image.Image:
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # độ "tím magenta": R và B cao, G thấp
    m = np.clip((np.minimum(r, b) - g - 60) / 80, 0, 1)
    alpha = (1 - m) * 255
    # khử viền hồng ở mép: kéo R/B về G theo độ trong suốt
    k = m[..., None]
    rgb = a * (1 - k) + np.stack([g, g, g], -1) * k
    out = np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def crop(im: Image.Image) -> Image.Image:
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 24)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def main():
    meta_src = META.read_text(encoding="utf-8")
    meta = json.loads(re.search(r"= (\{.*\}) as const", meta_src, re.S).group(1))
    (PUB / "nine").mkdir(exist_ok=True)
    (PUB / "status").mkdir(exist_ok=True)
    for batch in sorted(p.name for p in WORK.iterdir() if p.is_dir()):
        names = (WORK / batch / "order.txt").read_text().split()
        files = find_session(batch)
        print(batch, f"{len(files)}/{len(names)}")
        for f, name in zip(files, names):
            src = Image.open(f)
            if batch.startswith("icons"):
                im = src.convert("RGB")
                s = min(im.size)
                im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
                im.resize((128, 128), Image.LANCZOS).save(PUB / "status" / f"{name}.png", optimize=True)
                continue
            im = crop(key_out(src))
            if name in SCROLL:
                w = SCROLL[name]
                im = im.resize((w, max(w * 3, round(im.height * w / im.width))), Image.LANCZOS)
                cap = round(w * 1.1)
                sl = [cap, round(w * .45), cap, round(w * .45)]
            else:
                h, fr = UI[name]
                im = im.resize((max(h * 2, round(im.width * h / im.height)), h), Image.LANCZOS)
                sl = [round(h * fr[0]), round(h * fr[1]), round(h * fr[2]), round(h * fr[3])]
            im.save(PUB / "nine" / f"{name}.png", optimize=True)
            meta[name] = {"w": im.width, "h": im.height, "slice": sl}
    META.write_text("// Sinh tự động từ ảnh 9-slice Codex vẽ (public/ui/nine). slice = [trên, phải, dưới, trái] px trong ảnh gốc.\n"
                    f"export const NINE_META = {json.dumps(meta, indent=2)} as const;\n", encoding="utf-8")
    print("nineMeta:", ", ".join(meta))


if __name__ == "__main__":
    main()
