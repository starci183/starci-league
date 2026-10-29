# Tải tên, tên chiêu (vi_VN), tranh dọc và icon chiêu của 10 tướng từ Riot Data Dragon.
import json, pathlib, shutil, sys, urllib.request
sys.stdout.reconfigure(encoding="utf-8")

OUT = pathlib.Path(sys.argv[1])          # thư mục tải về (trống, riêng)
PUBLIC = pathlib.Path(sys.argv[2])       # packages/client/public
BASE = "https://ddragon.leagueoflegends.com"
# id trong game -> key Data Dragon
CHAMPS = {
    "kogmaw": "KogMaw", "ashe": "Ashe", "lux": "Lux", "lissandra": "Lissandra", "blitzcrank": "Blitzcrank",
    "braum": "Braum", "khazix": "Khazix", "aatrox": "Aatrox", "janna": "Janna", "katarina": "Katarina",
    "ahri": "Ahri", "darius": "Darius", "leona": "Leona", "jinx": "Jinx", "thresh": "Thresh",
    "zed": "Zed", "annie": "Annie", "vayne": "Vayne", "malphite": "Malphite", "soraka": "Soraka",
    "qiyana": "Qiyana", "nami": "Nami", "teemo": "Teemo", "twistedfate": "TwistedFate", "viktor": "Viktor",
}
# tuỳ chọn: chỉ tải các tướng liệt kê ở tham số thứ 3 (cách nhau dấu phẩy)
if len(sys.argv) > 3:
    CHAMPS = {k: v for k, v in CHAMPS.items() if k in sys.argv[3].split(",")}

def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()

def is_image(b: bytes):
    return b[:3] == b"\xff\xd8\xff" or b[:8] == b"\x89PNG\r\n\x1a\n"

version = json.loads(get(f"{BASE}/api/versions.json"))[0]
summary = {"version": version, "champions": {}}
OUT.mkdir(parents=True, exist_ok=True)
for gid, key in CHAMPS.items():
    data = json.loads(get(f"{BASE}/cdn/{version}/data/vi_VN/champion/{key}.json"))["data"][key]
    files = {
        f"heroes/{gid}.jpg": f"{BASE}/cdn/img/champion/loading/{key}_0.jpg",
        f"icons/{gid}_p.png": f"{BASE}/cdn/{version}/img/passive/{data['passive']['image']['full']}",
    }
    for slot, sp in zip("QWER", data["spells"]):
        files[f"icons/{gid}_{slot.lower()}.png"] = f"{BASE}/cdn/{version}/img/spell/{sp['image']['full']}"
    for rel, url in files.items():
        b = get(url)
        if not is_image(b):
            raise SystemExit(f"Không phải ảnh: {url}")
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(b)
    summary["champions"][gid] = {
        "name": data["name"], "title": data["title"],
        "passive": data["passive"]["name"],
        "spells": {slot: sp["name"] for slot, sp in zip("QWER", data["spells"])},
    }
    print(gid, data["name"], "|", data["passive"]["name"], "|", " / ".join(summary["champions"][gid]["spells"].values()))

(OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
# đã kiểm tra là ảnh: chép vào public
for sub in ("heroes", "icons"):
    (PUBLIC / sub).mkdir(parents=True, exist_ok=True)
    for f in (OUT / sub).iterdir():
        shutil.copy2(f, PUBLIC / sub / f.name)
total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
print(f"Data Dragon {version}: {sum(1 for _ in OUT.rglob('*.*'))} file, {total // 1024} KB")
