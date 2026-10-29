# Công cụ chỉnh số cân bằng: chỉ số gốc + mana/hồi chiêu của tướng (không nằm trong mô tả), và thay chuỗi trong file đồ/tiếng Anh.
# Dùng: python scripts/_variants/tune.py <file kế hoạch .py>  (file kế hoạch gọi stat()/skill()/rep())
import re, sys, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "packages", "shared", "src")
H = os.path.join(ROOT, "heroes")

def _rw(p, f):
    s = open(p, encoding="utf-8").read(); s2 = f(s)
    open(p, "w", encoding="utf-8").write(s2)

def stat(hero, key, new):
    def f(s):
        m = re.search(r"\b%s: (\d+)," % key, s); assert m, (hero, key)
        print(f"{hero} {key} {m.group(1)} -> {new}")
        return s[:m.start()] + f"{key}: {new}," + s[m.end():]
    _rw(os.path.join(H, hero + ".ts"), f)

def skill(hero, key, mana=None, cd=None):
    def f(s):
        m = re.search(r'key: "%s", name: "[^"]+", mana: (\d+), cooldown: (\d+)' % key, s); assert m, (hero, key)
        seg = m.group(0)
        new = re.sub(r"mana: \d+", f"mana: {mana}", seg) if mana is not None else seg
        new = re.sub(r"cooldown: \d+", f"cooldown: {cd}", new) if cd is not None else new
        print(f"{hero} {key} mana {m.group(1)}->{mana or m.group(1)} cd {m.group(2)}->{cd or m.group(2)}")
        return s.replace(seg, new, 1)
    _rw(os.path.join(H, hero + ".ts"), f)

def rep(rel, a, b):
    def f(s):
        assert s.count(a) == 1, (rel, a[:60], s.count(a))
        return s.replace(a, b)
    _rw(os.path.join(ROOT, rel), f); print("rep", rel, a[:50])

exec(open(sys.argv[1], encoding="utf-8").read())
