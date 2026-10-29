# Tướng nửa người do Codex vẽ trên nền magenta (.work/codex_cutout/batchN) -> public/heroes_cut/<id>.png (nền trong suốt).
# Trên bàn đấu, ảnh này đứng trên đáy khung tướng và trồi lên khỏi mép trên.
# Chạy: python scripts/process_cutouts.py  (từ thư mục starci-league)
import json, pathlib, sys
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from process_ui2 import GEN, ROOT, crop, key_out  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
WORK = ROOT / ".work/codex_cutout"
OUT = ROOT / "packages/client/public/heroes_cut"
HEIGHT = 256


def session_images(batch: str):
    want = f"/codex_cutout/{batch}"
    for f in sorted((pathlib.Path.home() / ".codex/sessions").rglob("rollout-*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            m = json.loads(f.open(encoding="utf-8", errors="ignore").readline()).get("payload", {})
        except json.JSONDecodeError:
            continue
        if str(m.get("cwd", "")).replace("\\", "/").lower().endswith(want):
            for sid in (m.get("id"), m.get("session_id")):
                d = GEN / str(sid)
                if sid and d.is_dir():
                    return sorted(d.glob("*.png"), key=lambda p: p.stat().st_mtime)
    return []


OUT.mkdir(exist_ok=True)
sheet = Image.new("RGBA", (10 * 130, 2 * 200), (30, 34, 42, 255))
i = 0
for batch in sorted(p.name for p in WORK.iterdir() if p.is_dir()):
    ids = (WORK / batch / "order.txt").read_text().split()
    files = session_images(batch)
    print(batch, f"{len(files)}/{len(ids)}")
    for f, hid in zip(files, ids):
        im = crop(key_out(Image.open(f)))
        im = im.resize((round(im.width * HEIGHT / im.height), HEIGHT), Image.LANCZOS)
        im.save(OUT / f"{hid}.png", optimize=True)
        t = im.copy(); t.thumbnail((125, 190))
        sheet.paste(t, ((i % 10) * 130 + 2, (i // 10) * 200 + 5), t); i += 1
sheet.save(WORK / "sheet.png")
print("xong", i)
