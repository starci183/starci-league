# Vòng chỉnh 1 (theo sim_r1: 192 trận)
stat("jinx", "atk", 64); skill("jinx", "R", mana=70)
stat("soraka", "ap", 72); skill("soraka", "R", cd=6)
stat("annie", "ap", 80)
stat("lissandra", "ap", 78); skill("lissandra", "W", cd=4)
stat("darius", "atk", 105); stat("darius", "hp", 920)
stat("zed", "atk", 108); skill("zed", "Q", mana=15)
stat("aatrox", "atk", 96)
stat("thresh", "hp", 850); skill("thresh", "Q", mana=25)

L = "items/legendary.ts"; E = "i18n/text_en.ts"
rep(L, 'desc: "Chiêu +10%, đốt 2.5% máu tối đa của mục tiêu mỗi lượt, 2 lượt."', 'desc: "Chiêu +10%, đốt 1.8% máu tối đa của mục tiêu mỗi lượt, 2 lượt."')
rep(L, "burn(u, u.maxHp * 0.025)", "burn(u, u.maxHp * 0.018)")
rep(L, 'desc: "Đốt mạnh hơn: 3.5% máu tối đa."', 'desc: "Đốt mạnh hơn: 2.5% máu tối đa."')
rep(L, "burn(c.target, c.target.maxHp * 0.035)", "burn(c.target, c.target.maxHp * 0.025)")
rep(E, "Burn the target for 2.5% of its max HP per turn for 2 turns.", "Burn the target for 1.8% of its max HP per turn for 2 turns.")
rep(E, '"Stronger Burn: 3.5% max HP."', '"Stronger Burn: 2.5% max HP."')
rep(L, '{ name: "Thành Trì", desc: "Nhận ít hơn 15% sát thương.", condition: selfRow("front"), damageTakenMult: () => 0.85 },',
       '{ name: "Thành Trì", desc: "Nhận ít hơn 10% sát thương.", condition: selfRow("front"), damageTakenMult: () => 0.9 },')
rep(E, '"item.tim_bang.p2.desc": "Take 15% less damage."', '"item.tim_bang.p2.desc": "Take 10% less damage."')
rep(L, '{ name: "Tiền Phong", desc: "+10% ATK.", condition: selfRow("front"), stats: { atkMult: 0.1 } },',
       '{ name: "Tiền Phong", desc: "+15% ATK.", condition: selfRow("front"), stats: { atkMult: 0.15 } },')
rep(E, '"item.sterak.p2.desc": "+10% ATK."', '"item.sterak.p2.desc": "+15% ATK."')
rep(L, '{ name: "Rình Rập", desc: "+12% sát thương.", condition: targetRow("back"), damageMult: () => 1.12 },',
       '{ name: "Rình Rập", desc: "+18% sát thương.", condition: targetRow("back"), damageMult: () => 1.18 },')
rep(E, '"item.ao_choang_bong_toi.p2.desc": "+12% damage."', '"item.ao_choang_bong_toi.p2.desc": "+18% damage."')
rep(L, 'desc: "+10 giáp. Đòn đánh đầu tiên mỗi lượt hồi 6% máu đã mất."', 'desc: "+10 giáp. Đòn đánh đầu tiên mỗi lượt hồi 10% máu đã mất."')
rep(L, "heal(c.self, (c.self.maxHp - c.self.hp) * 0.06)", "heal(c.self, (c.self.maxHp - c.self.hp) * 0.1)")
rep(E, "The first attack each turn heals 6% of missing HP.", "The first attack each turn heals 10% of missing HP.")
