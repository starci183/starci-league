# Gom asset tướng + chiêu do Codex vẽ (~/.codex/generated_images/<phiên>) về client/public:
#   heroes_art/<id>.jpg (chân dung token) · skills_art/<id>_<p|q|w|e|r>.jpg (icon chiêu)
# Mỗi tướng là 1 thư mục <work>/<id> có order.txt; phiên Codex nhận ra qua cwd trong log phiên.
# Dùng: python scripts/collect_hero_art.py .work/codex_heroes
import json, pathlib, sys
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")

work = pathlib.Path(sys.argv[1]).resolve()
codex = pathlib.Path.home() / ".codex"
pub = pathlib.Path(__file__).resolve().parent.parent / "packages/client/public"
(pub / "heroes_art").mkdir(exist_ok=True)
(pub / "skills_art").mkdir(exist_ok=True)

def session_cwd(session_id: str):
    for f in (codex / "sessions").rglob(f"*{session_id}*.jsonl"):
        with f.open(encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                if '"cwd"' in line:
                    try: return json.loads(line).get("payload", {}).get("cwd")
                    except Exception: pass
    return None

heroes = {d.name: (d / "order.txt").read_text(encoding="utf-8").split() for d in work.iterdir() if (d / "order.txt").exists()}
done = 0
for sess in (codex / "generated_images").iterdir():
    cwd = (session_cwd(sess.name) or "").rstrip("\/")
    hid = next((h for h in heroes if "codex_heroes" in cwd and cwd.replace("\\", "/").endswith("/" + h)), None)
    if not hid: continue
    files = sorted(sess.glob("*.png"), key=lambda f: f.stat().st_mtime)
    for f, slot in zip(files, heroes[hid]):
        img = Image.open(f).convert("RGB")
        if slot == "hero":
            img.thumbnail((512, 512), Image.LANCZOS); img.save(pub / "heroes_art" / f"{hid}.jpg", quality=90)
        else:
            img.thumbnail((256, 256), Image.LANCZOS); img.save(pub / "skills_art" / f"{hid}_{slot}.jpg", quality=90)
        done += 1
    print(f"{hid}: {min(len(files), 6)}/6")
print(f"Tổng: {done}/{6 * len(heroes)} ảnh")
