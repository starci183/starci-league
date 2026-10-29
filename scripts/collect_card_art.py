# Gom tranh bài do Codex vẽ (~/.codex/generated_images/<phiên>) về client/public/cards/<id>.jpg (768x1152).
# Mỗi lô ở <work>/batchN có order.txt; phiên Codex của lô nhận ra qua cwd trong log phiên.
# Dùng: python scripts/collect_card_art.py .work/codex_cards
import json, pathlib, sys
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")

work = pathlib.Path(sys.argv[1]).resolve()
codex = pathlib.Path.home() / ".codex"
out = pathlib.Path(__file__).resolve().parent.parent / "packages/client/public/cards"

def session_cwd(session_id: str):
    for f in (codex / "sessions").rglob(f"*{session_id}*.jsonl"):
        with f.open(encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                if '"cwd"' in line:
                    try: return json.loads(line).get("payload", {}).get("cwd")
                    except Exception: pass
    return None

batches = {b.name: (b / "order.txt").read_text(encoding="utf-8").split() for b in sorted(work.glob("batch*"))}
done = 0
for sess in (codex / "generated_images").iterdir():
    cwd = (session_cwd(sess.name) or "").replace("\\", "/").rstrip("/")
    batch = next((n for n in batches if cwd.endswith(f"/{work.name}/{n}")), None)
    if not batch: continue
    files = sorted(sess.glob("*.png"), key=lambda f: f.stat().st_mtime)
    for f, card_id in zip(files, batches[batch]):
        img = Image.open(f).convert("RGB")
        img.thumbnail((768, 1152), Image.LANCZOS)
        img.save(out / f"{card_id}.jpg", quality=90)
        done += 1
    print(f"{batch}: {min(len(files), len(batches[batch]))}/{len(batches[batch])}")
print(f"Tổng: {done}/{sum(len(v) for v in batches.values())} tranh")
