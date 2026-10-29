# Chỉ số gốc riêng từng tướng (thầy chốt): AP gốc = 0, mỗi chỉ số gốc giữa các tướng lệch nhau tối đa 45%
# (máu 700–1010, AD 58–84, giáp 26–37, kháng phép 26–37)
STATS = {
    # pháp sư
    "lux":       (700, 60, 26, 30),  # mỏng nhất, đánh xa nhất
    "ahri":      (720, 60, 28, 30),
    "annie":     (740, 58, 30, 30),
    "lissandra": (780, 58, 32, 34),  # pháp sư đứng gần, trâu hơn
    # xạ thủ
    "jinx":      (700, 74, 26, 26),
    "kogmaw":    (710, 68, 26, 28),
    "ashe":      (720, 70, 28, 28),
    "vayne":     (730, 76, 28, 26),
    # sát thủ
    "katarina":  (770, 74, 28, 30),
    "khazix":    (760, 82, 30, 26),
    "zed":       (780, 84, 30, 28),
    # trợ thủ
    "janna":     (760, 58, 28, 34),
    "soraka":    (790, 58, 30, 34),
    "thresh":    (860, 64, 34, 32),
    # đấu sĩ
    "aatrox":    (900, 80, 34, 32),
    "darius":    (940, 82, 36, 30),
    # đỡ đòn
    "blitzcrank": (960, 68, 36, 34),
    "leona":     (980, 64, 37, 35),
    "braum":     (1000, 62, 37, 37),
    "malphite":  (1010, 66, 37, 33),
}
import re, os
for k, idx in (("hp", 0), ("atk", 1), ("armor", 2), ("mr", 3)):
    vals = [v[idx] for v in STATS.values()]
    assert max(vals) / min(vals) <= 1.45, (k, max(vals) / min(vals))
for h, (hp, atk, armor, mr) in STATS.items():
    p = os.path.join(H, h + ".ts")
    s = open(p, encoding="utf-8").read()
    i = s.index("defineHero({")
    head, rest = s[:i], s[i:]
    for k, v in (("hp", hp), ("atk", atk), ("armor", armor), ("mr", mr), ("ap", 0)):
        m = re.search(r"\b%s: (\d+)," % k, rest)
        assert m and m.start() < 400, (h, k)
        rest = rest[:m.start()] + f"{k}: {v}," + rest[m.end():]
    open(p, "w", encoding="utf-8").write(head + rest)
    print(h, hp, atk, armor, mr)
