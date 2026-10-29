# Vòng chỉnh 2 (theo sim_r2: 200 trận)
stat("soraka", "ap", 64); skill("soraka", "W", mana=20)
stat("jinx", "atk", 60); stat("jinx", "hp", 690)
stat("annie", "ap", 76)
stat("lux", "ap", 98); skill("lux", "Q", cd=2)
stat("ahri", "ap", 95); skill("ahri", "E", mana=25)

L = "items/legendary.ts"; E = "i18n/text_en.ts"
rep(L, 'desc: "Đầu mỗi lượt: bản thân, đồng minh cùng lane và đồng minh đứng kề hồi 10% máu đã mất."',
       'desc: "Đầu mỗi lượt: bản thân, đồng minh cùng lane và đồng minh đứng kề hồi 6% máu đã mất."')
rep(L, "return list.map((u) => heal(u, (u.maxHp - u.hp) * 0.1));", "return list.map((u) => heal(u, (u.maxHp - u.hp) * 0.06));")
rep(E, "allies standing next to you heal 10% of missing HP.", "allies standing next to you heal 6% of missing HP.")
rep(L, '{ name: "Thân Tàu", desc: "+100 máu. Đòn đánh gây thêm {8% máu cộng thêm} sát thương vật lý."',
       '{ name: "Thân Tàu", desc: "+100 máu. Đòn đánh gây thêm {5% máu cộng thêm} sát thương vật lý."')
rep(L, "physical(0.08 * bonusHpOf(c.self), c.target, c.self)", "physical(0.05 * bonusHpOf(c.self), c.target, c.self)")
rep(E, "Attacks deal an extra {8% bonus HP} physical damage.", "Attacks deal an extra {5% bonus HP} physical damage.")
