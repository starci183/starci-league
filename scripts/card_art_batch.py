# Phóng toàn bộ icon LMHT cho bản thẻ bài trong MỘT lần chạy Real-ESRGAN (GPU).
# Real-ESRGAN (ncnn/Vulkan) mất ~45s để biên dịch shader mỗi lần khởi động, nên gom hết ảnh vào một thư mục
# rồi gọi 1 lần cho cả thư mục thay vì từng ảnh.
# Nguồn: chiêu + nội tại 30 tướng và vật triệu hồi (bảng trong card_skill_art.py), phép bổ trợ + icon đồ (card_support_art.py).
# Ra: public/card_skills/<tướng>_<q|e|r|p>.png, public/card_tokens/<token>.png, public/card_support/spell_<phép>.png, public/card_items/<đồ>.png
# Dùng: python scripts/card_art_batch.py [--size 512] [--force]
import argparse, importlib.util, io, json, pathlib, shutil, subprocess, sys, tempfile, urllib.request
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXE = ROOT / ".work/tools/realesrgan/realesrgan-ncnn-vulkan.exe"
PUB = ROOT / "packages/client/public"
BASE = "https://ddragon.leagueoflegends.com"

ap = argparse.ArgumentParser()
ap.add_argument("--size", type=int, default=512)
ap.add_argument("--force", action="store_true", help="làm lại cả file đã có")
args = ap.parse_args()


def load_table(name: str, attr: str):
    """Đọc bảng HEROES / TOKENS / SPELLS / COMPONENTS từ script cũ mà không chạy phần thân của nó"""
    src = (ROOT / "scripts" / name).read_text(encoding="utf-8")
    start = src.index(f"{attr} = ")
    depth, i = 0, src.index("{" if src[start:].lstrip(f"{attr} = ")[0] == "{" else "[", start)
    for j in range(i, len(src)):
        if src[j] in "{[":
            depth += 1
        elif src[j] in "}]":
            depth -= 1
            if depth == 0:
                return eval(src[i:j + 1])  # bảng hằng số trong repo, không phải dữ liệu ngoài
    raise ValueError(attr)


def get(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()


HEROES = load_table("card_skill_art.py", "HEROES")
TOKENS = load_table("card_skill_art.py", "TOKENS")
SPELLS = load_table("card_support_art.py", "SPELLS")
COMPONENTS = load_table("card_support_art.py", "COMPONENTS")

version = json.loads(get(f"{BASE}/api/versions.json"))[0]
jobs: list[tuple[bytes, pathlib.Path]] = []  # (ảnh gốc, file đích)


def want(dst: pathlib.Path) -> bool:
    return args.force or not dst.exists()


champ_cache: dict[str, dict] = {}


def champ(key: str) -> dict:
    if key not in champ_cache:
        champ_cache[key] = json.loads(get(f"{BASE}/cdn/{version}/data/en_US/champion/{key}.json"))["data"][key]
    return champ_cache[key]


for gid, (key, slots) in HEROES.items():
    targets = {s: PUB / "card_skills" / f"{gid}_{s}.png" for s in [*slots, "p"]}
    if not any(want(t) for t in targets.values()):
        continue
    data = champ(key)
    spells = dict(zip("QWER", data["spells"]))
    passive = f"{BASE}/cdn/{version}/img/passive/{data['passive']['image']['full']}"
    for s, dst in targets.items():
        if not want(dst):
            continue
        src = slots.get(s, "P")
        url = passive if src == "P" else f"{BASE}/cdn/{version}/img/spell/{spells[src]['image']['full']}"
        jobs.append((get(url), dst))
for tid, (key, slot) in TOKENS.items():
    dst = PUB / "card_tokens" / f"{tid}.png"
    if want(dst):
        jobs.append((get(f"{BASE}/cdn/{version}/img/spell/{dict(zip('QWER', champ(key)['spells']))[slot]['image']['full']}"), dst))
summ = json.loads(get(f"{BASE}/cdn/{version}/data/en_US/summoner.json"))["data"]
for gid, key in SPELLS.items():
    dst = PUB / "card_support" / f"spell_{gid}.png"
    if want(dst):
        jobs.append((get(f"{BASE}/cdn/{version}/img/spell/{summ[key]['image']['full']}"), dst))
for f in sorted((PUB / "items").glob("*.png")):
    dst = PUB / "card_items" / f"{f.stem}.png"
    if want(dst):
        jobs.append((f.read_bytes(), dst))

print(f"{len(jobs)} ảnh cần phóng (Data Dragon {version})")
if not jobs:
    sys.exit(0)
with tempfile.TemporaryDirectory() as tmp:
    t = pathlib.Path(tmp)
    (t / "in").mkdir()
    (t / "out").mkdir()
    for i, (png, _) in enumerate(jobs):
        Image.open(io.BytesIO(png)).convert("RGB").resize((64, 64), Image.LANCZOS).save(t / "in" / f"{i:04d}.png")
    # 1 lần cho cả thư mục: 64 -> 256 (×4), sau đó nội suy lên cỡ đích
    subprocess.run([str(EXE), "-i", str(t / "in"), "-o", str(t / "out"), "-n", "realesrgan-x4plus", "-f", "png"], check=True, capture_output=True)
    for i, (_, dst) in enumerate(jobs):
        dst.parent.mkdir(parents=True, exist_ok=True)
        Image.open(t / "out" / f"{i:04d}.png").convert("RGB").resize((args.size, args.size), Image.LANCZOS).save(dst)
print("xong", len(jobs), "ảnh")
