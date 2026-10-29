# Đổi mô tả chiêu sang "một công thức, một loại sát thương theo tướng":
#   "{A} sát thương vật lý và {B} sát thương phép" -> "{A + B} sát thương <loại của tướng>" (VI + EN),
#   rồi các chữ "sát thương vật lý/phép" còn lại trong mô tả chiêu/nội tại của tướng -> loại của tướng.
# Chạy: python scripts/_variants/merge_dmg_desc.py [--dry]
import re, sys, glob, os
DRY = "--dry" in sys.argv
ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "packages", "shared", "src")
PHYS = {"aatrox", "darius", "zed", "khazix", "vayne", "ashe", "jinx", "kogmaw"}
VI = {"physical": "sát thương vật lý", "magic": "sát thương phép"}
EN = {"physical": "physical damage", "magic": "magic damage"}

def merge(*exprs):
    flat, pct, other = 0.0, {}, []
    for e in exprs:
        for t in e.split("+"):
            t = t.strip()
            m = re.fullmatch(r"(\d+(?:[.,]\d+)?)", t)
            if m: flat += float(m.group(1).replace(",", ".")); continue
            m = re.fullmatch(r"(\d+(?:[.,]\d+)?)%\s*(AD|AP)", t)
            if m: pct[m.group(2)] = pct.get(m.group(2), 0) + float(m.group(1).replace(",", ".")); continue
            other.append(t)
    num = lambda x: str(int(x)) if x == int(x) else str(x)
    parts = ([num(flat)] if flat else []) + [f"{num(pct[k])}% {k}" for k in ("AD", "AP") if k in pct] + other
    return " + ".join(parts)

def fix(text, kind, lang):
    W = VI if lang == "vi" else EN
    if lang == "vi":
        pat = re.compile(r"\{([^{}]+)\}(\s*)sát thương vật lý\s*(?:và|cùng|,)\s*\{([^{}]+)\}\s*sát thương phép")
    else:
        pat = re.compile(r"\{([^{}]+)\}(\s*)physical damage\s*(?:and|plus|,)\s*\{([^{}]+)\}\s*magic damage")
    text = pat.sub(lambda m: "{" + merge(m.group(1), m.group(3)) + "} " + W[kind], text)
    other_kind = "magic" if kind == "physical" else "physical"
    return text.replace(W[other_kind], W[kind])

changed = 0
# VI: chuỗi desc trong file tướng (chiêu, nội tại, boost)
for f in glob.glob(os.path.join(ROOT, "heroes", "*.ts")):
    hid = os.path.basename(f)[:-3]
    if hid in ("kit", "index"): continue
    kind = "physical" if hid in PHYS else "magic"
    s = open(f, encoding="utf-8").read()
    def sub(m):
        global changed
        new = fix(m.group(0), kind, "vi")
        if new != m.group(0):
            changed += 1
            print(f"[{hid}] {m.group(0)[:110]}\n   -> {new[:110]}")
        return new
    s2 = re.sub(r'desc: "(?:[^"\\]|\\.)*"', sub, s)
    if s2 != s and not DRY: open(f, "w", encoding="utf-8").write(s2)
# EN
p = os.path.join(ROOT, "i18n", "text_en.ts")
s = open(p, encoding="utf-8").read()
def sub_en(m):
    global changed
    key, val = m.group(1), m.group(2)
    hm = re.match(r"(?:skill\.([a-z]+)_|hero\.([a-z]+)\.passive_desc)", key)
    if not hm: return m.group(0)
    hid = hm.group(1) or hm.group(2)
    new = fix(val, "physical" if hid in PHYS else "magic", "en")
    if new == val: return m.group(0)
    changed += 1
    print(f"[en {key}] -> {new[:110]}")
    return f'"{key}": "{new}"'
s2 = re.sub(r'"((?:skill|hero)\.[a-z_.0-9]+)": "((?:[^"\\]|\\.)*)"', sub_en, s)
if s2 != s and not DRY: open(p, "w", encoding="utf-8").write(s2)
print("changed:", changed, "(dry)" if DRY else "")
