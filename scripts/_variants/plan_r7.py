# Vòng chỉnh 7 (theo sim_r6: 1000 trận, ±2.2%)
# --- quá mạnh ---
skill("annie", "Q", cd=2)
stat("braum", "hp", 900); skill("braum", "W", cd=3)
stat("jinx", "atk", 64); skill("jinx", "R", cd=5)
skill("lissandra", "W", mana=35)
stat("aatrox", "atk", 76)
skill("leona", "R", mana=55)
skill("soraka", "E", mana=30)
# --- quá yếu ---
skill("thresh", "W", mana=15)
skill("ahri", "Q", mana=20)
stat("darius", "hp", 980); stat("darius", "atk", 84)
stat("vayne", "atk", 82); skill("vayne", "E", mana=15)
skill("blitzcrank", "Q", mana=25)
skill("katarina", "E", mana=15); skill("katarina", "W", mana=15)
skill("kogmaw", "W", mana=25); skill("kogmaw", "E", mana=20)
stat("zed", "hp", 820); skill("zed", "E", mana=15); skill("zed", "R", mana=40)
# Kha'Zix: Q mạnh hơn, chiêu rẻ hơn
skill("khazix", "Q", mana=15); skill("khazix", "E", mana=20); skill("khazix", "R", mana=40)
K = "heroes/khazix.ts"; E = "i18n/text_en.ts"; L = "items/legendary.ts"
rep(K, 'Gây {15 + 45% AD + 25% AP} sát thương vật lý cho tướng đó."', 'Gây {30 + 70% AD + 30% AP} sát thương vật lý cho tướng đó."')
rep(K, 'mixed(unit, t, "Nếm Mùi Sợ Hãi", { physical: 15 + 0.45 * atkOf(unit), magic: 0.25 * apOf(unit) })', 'mixed(unit, t, "Nếm Mùi Sợ Hãi", { physical: 30 + 0.7 * atkOf(unit), magic: 0.3 * apOf(unit) })')
rep(E, '"skill.khazix_q.desc": "Choose 1 enemy in the 3 lanes around you. Deal {15 + 45% AD + 25% AP} physical damage to it."',
       '"skill.khazix_q.desc": "Choose 1 enemy in the 3 lanes around you. Deal {30 + 70% AD + 30% AP} physical damage to it."')
# --- đồ đỡ đòn ---
rep(L, 'desc: "Chiêu +10%, đốt 1.8% máu tối đa của mục tiêu mỗi lượt, 2 lượt."', 'desc: "Chiêu +10%, đốt 1.4% máu tối đa của mục tiêu mỗi lượt, 2 lượt."')
rep(L, "burn(u, u.maxHp * 0.018)", "burn(u, u.maxHp * 0.014)")
rep(E, "Burn the target for 1.8% of its max HP per turn for 2 turns.", "Burn the target for 1.4% of its max HP per turn for 2 turns.")
rep(L, '{ name: "Tái Sinh", desc: "Đầu lượt hồi {8% máu tối đa}.", condition: selfHpBelow(0.5), onTurnStart: (c) => [heal(c.self, c.self.maxHp * 0.08)] },',
       '{ name: "Tái Sinh", desc: "Đầu lượt hồi {5% máu tối đa}.", condition: selfHpBelow(0.5), onTurnStart: (c) => [heal(c.self, c.self.maxHp * 0.05)] },')
rep(E, '"item.giap_warmog.p2.desc": "Heal {8% max HP} at the start of the turn."', '"item.giap_warmog.p2.desc": "Heal {5% max HP} at the start of the turn."')
rep(L, 'desc: "+10 giáp phép. Đầu mỗi lượt: làm mới khiên lên tới {6% máu tối đa}."', 'desc: "+10 giáp phép. Đầu mỗi lượt: làm mới khiên lên tới {4% máu tối đa}."')
rep(E, "At the start of each turn: shield refreshed up to {6% max HP}.", "At the start of each turn: shield refreshed up to {4% max HP}.")
rep(L, 'desc: "Đầu mỗi lượt: mọi đồng minh đứng kề được làm mới khiên lên tới {30 + 4% máu tối đa} (không cộng dồn)."',
       'desc: "Đầu mỗi lượt: mọi đồng minh đứng kề được làm mới khiên lên tới {20 + 3% máu tối đa} (không cộng dồn)."')
rep(E, "has its shield refreshed up to {30 + 4% max HP} (does not stack).", "has its shield refreshed up to {20 + 3% max HP} (does not stack).")
rep(L, '{ name: "Vây Hãm", desc: "Nhận ít hơn 15% sát thương.", condition: laneEnemiesAtLeast(2), damageTakenMult: () => 0.85 },',
       '{ name: "Vây Hãm", desc: "Nhận ít hơn 10% sát thương.", condition: laneEnemiesAtLeast(2), damageTakenMult: () => 0.9 },')
rep(E, '"item.giap_gargoyle.p3.desc": "Take 15% less damage."', '"item.giap_gargoyle.p3.desc": "Take 10% less damage."')
rep(L, "nearAllies(c).flatMap((u) => shieldUpTo(u, 30 + 0.04 * c.self.maxHp))", "nearAllies(c).flatMap((u) => shieldUpTo(u, 20 + 0.03 * c.self.maxHp))")
rep(L, "onTurnStart: (c) => shieldUpTo(c.self, c.self.maxHp * 0.06) },", "onTurnStart: (c) => shieldUpTo(c.self, c.self.maxHp * 0.04) },")
