# Gom art lớn của đồ do Codex vẽ (~/.codex/generated_images/<phiên>) về client/public/items_art/<id>.jpg.
# Mỗi lô ở <work>/batchN có refs.txt (thứ tự món); phiên Codex của lô nhận ra qua cwd trong log phiên.
# Dùng: python scripts/collect_item_art.py <work dir, vd .work/codex_itemart>
import json, pathlib, sys
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")

work = pathlib.Path(sys.argv[1]).resolve()
codex = pathlib.Path.home() / ".codex"
out = pathlib.Path(__file__).resolve().parent.parent / "packages/client/public/items_art"
out.mkdir(parents=True, exist_ok=True)

def session_cwd(session_id: str):
    for f in (codex / "sessions").rglob(f"*{session_id}*.jsonl"):
        with f.open(encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                if '"cwd"' in line:
                    try: return json.loads(line).get("payload", {}).get("cwd")
                    except Exception: pass
    return None

batches = {b.name: [l.strip()[4:-4] for l in (b / "refs.txt").read_text(encoding="utf-8").splitlines() if l.strip()]
           for b in sorted(work.glob("batch*"))}
done = 0
for sess in (codex / "generated_images").iterdir():
    cwd = session_cwd(sess.name) or ""
    # khớp đúng <thư mục làm việc>/<lô>: các lần vẽ khác cũng có lô tên batch1, batch2...
    norm = cwd.replace("\\", "/").rstrip("/")
    batch = next((name for name in batches if norm.endswith(f"{work.name}/{name}")), None)
    if not batch: continue
    files = sorted(sess.glob("*.png"), key=lambda f: f.stat().st_mtime)
    for f, item_id in zip(files, batches[batch]):
        img = Image.open(f).convert("RGB")
        img.thumbnail((768, 1152), Image.LANCZOS)
        img.save(out / f"{item_id}.jpg", quality=90)
        done += 1
    print(f"{batch}: {min(len(files), len(batches[batch]))}/{len(batches[batch])}")
print(f"Tổng: {done}/{sum(len(v) for v in batches.values())} art")
