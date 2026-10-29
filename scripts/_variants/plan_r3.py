# Khung chỉ số gốc mới (thầy chốt): AP gốc = 0, mọi chỉ số gốc lệch nhau không quá 30%
FRAME = {
    "mage":     dict(hp=740, atk=62, armor=30, mr=30),
    "marksman": dict(hp=740, atk=72, armor=30, mr=30),
    "assassin": dict(hp=780, atk=80, armor=30, mr=30),
    "support":  dict(hp=800, atk=62, armor=32, mr=32),
    "fighter":  dict(hp=880, atk=78, armor=36, mr=34),
    "tank":     dict(hp=940, atk=66, armor=38, mr=36),
}
ROLE = {
    "ahri": "mage", "annie": "mage", "lissandra": "mage", "lux": "mage",
    "ashe": "marksman", "jinx": "marksman", "kogmaw": "marksman", "vayne": "marksman",
    "katarina": "assassin", "khazix": "assassin", "zed": "assassin",
    "janna": "support", "soraka": "support", "thresh": "support",
    "aatrox": "fighter", "darius": "fighter",
    "blitzcrank": "tank", "braum": "tank", "leona": "tank", "malphite": "tank",
}
import re, os
for h, role in ROLE.items():
    p = os.path.join(H, h + ".ts")
    s = open(p, encoding="utf-8").read()
    i = s.index("defineHero({")
    head, rest = s[:i], s[i:]
    f = dict(FRAME[role])
    if h == "katarina": f["atk"] = 76
    f["ap"] = 0
    for k, v in f.items():
        m = re.search(r"\b%s: (\d+)," % k, rest)
        assert m and m.start() < 400, (h, k)
        rest = rest[:m.start()] + f"{k}: {v}," + rest[m.end():]
    open(p, "w", encoding="utf-8").write(head + rest)
    print(h, role, f)
