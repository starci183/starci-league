// Bản tiếng Anh của 32 lá bài: tên theo phép/chiêu/đồ LoL chính thức, mô tả và các dòng cường hóa (cùng thứ tự boosts).
export const CARDS_EN: Record<string, { name: string; desc: string; bonus?: string[] }> = {
    // ---- Spells
    cau_lua: {
        name: "Disintegrate", desc: "Choose 1 enemy champion. Deal 180 magic damage to it.",
        bonus: ["If that enemy is Burning: deal 50% more damage",
            "If that enemy is below 40% HP: deal 30% more damage"]
    },
    hoi_phuc: {
        name: "Heal", desc: "Choose 1 allied champion. Heal it for 120 HP plus 40% of its missing HP.",
        bonus: ["If that ally is below 30% HP: it also gains a 120 Shield"]
    },
    thieu_dot: {
        name: "Ignite", desc: "Choose 1 enemy champion. It Burns for 50 HP each round and suffers Grievous Wounds, for 3 rounds.",
        bonus: ["If that enemy is below 50% HP: Burn for 80 HP each round instead",
            "If that enemy is a fighter / tank / support: Grievous Wounds lasts 5 rounds instead"]
    },
    kiet_suc: {
        name: "Exhaust", desc: "Choose 1 enemy champion. It gains Exhaust and is Chilled for 1 round.",
        bonus: ["If that enemy is an assassin / marksman / fighter: it also suffers Armor Shred for 2 rounds"]
    },
    toc_bien: {
        name: "Flash", desc: "Choose 1 allied champion. This turn it may **move 1 tile** (only assassins move on their own; others need Flash or an ability), and it is Unstoppable for 1 round.",
        bonus: ["If that ally is below 35% HP: it also gains a 150 Shield"]
    },
    trung_phat: {
        name: "Smite", desc: "Choose 1 enemy champion. Deal 220 true damage to it.",
        bonus: ["If that enemy is below 30% HP: deal 420 true damage instead"]
    },
    la_chan: {
        name: "Barrier", desc: "Choose 1 allied champion. It gains a 150 Shield plus 30% of its missing HP.",
        bonus: ["If that ally is Stunned / Frozen / Chilled: the Shield is 50% larger"]
    },
    thanh_tay: {
        name: "Cleanse", desc: "Choose 1 allied champion. Remove all crowd control from it, then it is Unstoppable for 1 round.",
        bonus: ["If that ally is Stunned / Frozen: it also heals 150 HP and may basic attack again this turn"]
    },
    dich_chuyen: {
        name: "Teleport", desc: "Choose 1 allied champion that is waiting to respawn or was just recalled. It may be deployed this turn.",
        bonus: ["If that ally was taken down: it also gains 40 Mana/Rage"]
    },
    mat_kiem_soat: {
        name: "Control Ward", desc: "Look at all of your opponent's face-down cards. All hidden enemy champions are Revealed.",
        bonus: ["If your opponent has 2 or more face-down cards: you also draw 1 card"]
    },
    // ---- Traps
    cam_lang: {
        name: "Equinox", desc: "When an enemy champion in this lane casts an ability: cancel that ability.",
        bonus: ["If that enemy is a mage / support: it is also Stunned for 1 round"]
    },
    bay_gai: {
        name: "Rampant Growth", desc: "When an enemy champion in this lane basic attacks: before the attack, it takes 100 damage.",
        bonus: ["If that enemy is a fighter / assassin / tank: it takes 180 damage instead, and is Chilled for 1 round"]
    },
    nam_teemo: {
        name: "Noxious Trap", desc: "When an enemy champion in this lane attacks or casts: it is Poisoned for 40 HP each round for 3 rounds, and Chilled for 2 rounds.",
        bonus: ["If that enemy is below 50% HP: Poison for 70 HP each round instead"]
    },
    bay_yordle: {
        name: "Yordle Snap Trap", desc: "When an enemy champion in this lane basic attacks: cancel that attack, and it is Rooted for 1 round.",
        bonus: ["If that enemy is a marksman: it also takes 120 damage"]
    },
    hop_he: {
        name: "Jack In The Box", desc: "When an enemy champion in this lane casts an ability: cancel that ability, and it is Stunned for 1 round.",
        bonus: ["If that enemy stands in the back row: Stunned for 2 rounds instead"]
    },
    tuong_bang: {
        name: "Crystallize", desc: "When an enemy champion attacks the turret or Nexus in this lane: block that attack, and it is Chilled for 1 round.",
        bonus: ["If that enemy is a tank / fighter: it is Frozen for 1 round instead"]
    },
    hat_tung: {
        name: "Pulverize", desc: "When an enemy champion in this lane basic attacks: it is Knocked up for 1 round and takes 90 damage.",
        bonus: ["If that enemy stands in the front row: it takes 150 damage instead, and the attack is cancelled"]
    },
    moc_xich: {
        name: "Rocket Grab", desc: "When an enemy champion in this lane casts an ability: pull it forward 1 row, and it takes 80 damage.",
        bonus: ["If that enemy stands in the back row: it takes 150 damage instead, and is Stunned for 1 round"]
    },
    bai_moi: {
        name: "Hallucinate", desc: "When an enemy champion in this lane attacks or casts: it takes 80 damage and is Chilled for 1 round, then you draw 1 card.",
        bonus: ["If that enemy is below 50% HP: it takes 160 damage instead"]
    },
    // ---- Stat cards
    binh_mau: {
        name: "Health Potion", desc: "Choose 1 allied champion. Heal it for 80 HP plus 20% of its missing HP, then it gains Health Potion for 2 rounds.",
        bonus: ["If that ally is below 50% HP: the healing lasts 3 rounds instead"]
    },
    binh_nang_luong: {
        name: "Refillable Potion", desc: "Choose 1 allied champion. It gains 30 Mana or Rage.",
        bonus: ["If that ally uses Rage: it gains 50 Rage instead"]
    },
    thuoc_cuong_no: {
        name: "Elixir of Wrath", desc: "Choose 1 allied champion. It gains Elixir of Wrath for 3 rounds.",
        bonus: ["If that ally is a marksman / fighter / assassin: lasts 4 rounds instead"]
    },
    thuoc_phu_thuy: {
        name: "Elixir of Sorcery", desc: "Choose 1 allied champion. It gains Elixir of Sorcery for 3 rounds.",
        bonus: ["If that ally is a mage / support: lasts 4 rounds instead, and it gains 20 Mana"]
    },
    tui_vang: {
        name: "Gold Pouch", desc: "Gain 2 gold.",
        bonus: ["If your Nexus has less HP than your opponent's: gain 4 gold instead"]
    },
    pha_le_mana: {
        name: "Tear of the Goddess", desc: "Your maximum mana permanently increases by 1, and you gain 1 mana.",
        bonus: ["If your maximum mana is below 6: increase it by 2 instead"]
    },
    bua_baron: {
        name: "Hand of Baron", desc: "All allied champions on the board gain Hand of Baron for 2 rounds.",
        bonus: ["If you have 4 or more champions on the board: lasts 3 rounds instead"]
    },
    linh_hon_rong: {
        name: "Dragon Soul", desc: "Choose 1 allied champion. It permanently gains 150 maximum HP.",
        bonus: ["If that ally is a tank / fighter: gains 250 instead"]
    },
    // ---- Combat cards
    cuong_no: {
        name: "Guinsoo's Rageblade", desc: "Choose 1 allied champion that has basic attacked this turn. It may basic attack 1 more time.",
        bonus: ["If that ally is below 50% HP: it also heals 80 HP"]
    },
    chi_mang: {
        name: "Infinity Edge", desc: "Choose 1 allied champion. It gains Infinity Edge for 1 round.",
        bonus: ["If that ally is a marksman / assassin: lasts 2 rounds instead"]
    },
    ket_lieu: {
        name: "Noxian Guillotine", desc: "Choose 1 allied champion. It gains Noxian Guillotine for 1 round.",
        bonus: ["If that ally is an assassin / fighter: it also gains +25% AD this turn"]
    },
    nhip_do: {
        name: "Lethal Tempo", desc: "Choose 1 allied champion. It gains Lethal Tempo for 2 rounds.",
        bonus: ["If that ally is a marksman: lasts 3 rounds instead"]
    },
    dam_xuyen: {
        name: "Pierce", desc: "Choose 1 allied champion. It gains Pierce for 1 round.",
        bonus: ["If that ally is a marksman / fighter: lasts 2 rounds instead"]
    },
}
