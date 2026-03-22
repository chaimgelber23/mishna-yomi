export interface TractateInfo {
  seder: string;
  tractate: string;
  chapters: number[]; // number of mishnayot per chapter
  totalMishnayot: number;
}

export interface SederInfo {
  name: string;
  tractates: TractateInfo[];
  totalMishnayot: number;
}

export const MISHNA_STRUCTURE_RAW = [
  // Seder Zeraim
  { seder: "Zeraim", tractate: "Berakhot",     chapters: [5,8,6,7,5,8,5,8,5] },
  { seder: "Zeraim", tractate: "Pe'ah",        chapters: [6,8,8,11,8,11,8,9] },
  { seder: "Zeraim", tractate: "Demai",        chapters: [4,5,6,7,11,12,8] },
  { seder: "Zeraim", tractate: "Kilayim",      chapters: [9,11,7,9,8,6,8,6,10] },
  { seder: "Zeraim", tractate: "Shevi'it",     chapters: [8,10,10,10,9,6,7,11,9,9] },
  { seder: "Zeraim", tractate: "Terumot",      chapters: [10,6,9,13,9,6,7,12,7,12,10] },
  { seder: "Zeraim", tractate: "Ma'asrot",     chapters: [8,8,10,6,8] },
  { seder: "Zeraim", tractate: "Ma'aser Sheni", chapters: [7,10,13,12,15] },
  { seder: "Zeraim", tractate: "Challah",      chapters: [9,8,10,11] },
  { seder: "Zeraim", tractate: "Orlah",        chapters: [9,17,9] },
  { seder: "Zeraim", tractate: "Bikkurim",     chapters: [11,11,12,5] },

  // Seder Moed
  { seder: "Moed", tractate: "Shabbat",        chapters: [11,7,6,2,4,10,4,7,7,5,6,6,7,4,3,8,8,3,6,5,3,6,5,5] },
  { seder: "Moed", tractate: "Eruvin",         chapters: [10,6,9,11,9,10,11,11,4,15] },
  { seder: "Moed", tractate: "Pesachim",       chapters: [7,8,8,9,10,6,13,8,11,9] },
  { seder: "Moed", tractate: "Shekalim",       chapters: [7,5,4,9,6,6,7,8] },
  { seder: "Moed", tractate: "Yoma",           chapters: [8,7,11,6,7,8,5,9] },
  { seder: "Moed", tractate: "Sukkah",         chapters: [11,9,15,10,8] },
  { seder: "Moed", tractate: "Beitzah",        chapters: [10,10,8,7,7] },
  { seder: "Moed", tractate: "Rosh Hashanah",  chapters: [9,8,8,9] },
  { seder: "Moed", tractate: "Ta'anit",        chapters: [7,10,9,8] },
  { seder: "Moed", tractate: "Megillah",       chapters: [11,6,6,10] },
  { seder: "Moed", tractate: "Mo'ed Katan",    chapters: [10,5,9] },
  { seder: "Moed", tractate: "Chagigah",       chapters: [8,7,8] },

  // Seder Nashim
  { seder: "Nashim", tractate: "Yevamot",      chapters: [15,10,10,13,13,6,6,6,6,9,7,6,13,9,10,7,13] },
  { seder: "Nashim", tractate: "Ketubot",      chapters: [12,10,9,12,9,7,10,8,9,6,6,4,11] },
  { seder: "Nashim", tractate: "Nedarim",      chapters: [4,5,12,8,6,10,9,7,10,8,12,13] },
  { seder: "Nashim", tractate: "Nazir",        chapters: [7,10,7,7,7,11,4,2,5] },
  { seder: "Nashim", tractate: "Sotah",        chapters: [9,6,8,5,5,4,8,7,15,9] },
  { seder: "Nashim", tractate: "Gittin",       chapters: [9,7,8,9,9,7,9,10,10] },
  { seder: "Nashim", tractate: "Kiddushin",    chapters: [10,10,12,14] },

  // Seder Nezikin
  { seder: "Nezikin", tractate: "Bava Kamma",  chapters: [4,6,11,9,7,6,7,7,12,10] },
  { seder: "Nezikin", tractate: "Bava Metzia", chapters: [8,11,12,12,11,8,11,9,13,6] },
  { seder: "Nezikin", tractate: "Bava Batra",  chapters: [6,14,8,9,11,8,4,8,10,8] },
  { seder: "Nezikin", tractate: "Sanhedrin",   chapters: [6,5,8,5,5,6,11,7,6,6,6,4] },
  { seder: "Nezikin", tractate: "Makkot",      chapters: [10,8,16] },
  { seder: "Nezikin", tractate: "Shevuot",     chapters: [7,5,11,13,5,7,8,6] },
  { seder: "Nezikin", tractate: "Eduyot",      chapters: [14,10,12,12,7,3,9,7] },
  { seder: "Nezikin", tractate: "Avodah Zarah", chapters: [9,7,10,12,12] },
  { seder: "Nezikin", tractate: "Avot",        chapters: [18,16,18,22,23,11] },
  { seder: "Nezikin", tractate: "Horayot",     chapters: [5,7,8] },

  // Seder Kodashim
  { seder: "Kodashim", tractate: "Zevachim",   chapters: [4,5,6,6,8,7,6,12,7,8,8,6,8,10] },
  { seder: "Kodashim", tractate: "Menachot",   chapters: [4,5,7,5,9,7,6,7,8,9,9,5] },
  { seder: "Kodashim", tractate: "Chullin",    chapters: [7,10,7,7,5,7,6,6,8,4,2,4] },
  { seder: "Kodashim", tractate: "Bekhorot",   chapters: [7,9,4,10,6,12,7,10,8] },
  { seder: "Kodashim", tractate: "Arakhin",    chapters: [4,6,5,4,6,5,5,7,8] },
  { seder: "Kodashim", tractate: "Temurah",    chapters: [6,3,4,4,6,5,6] },
  { seder: "Kodashim", tractate: "Keritot",    chapters: [7,6,10,3,8,9] },
  { seder: "Kodashim", tractate: "Me'ilah",    chapters: [4,9,8,6,5] },
  { seder: "Kodashim", tractate: "Tamid",      chapters: [4,5,9,3,6,3,4] },
  { seder: "Kodashim", tractate: "Middot",     chapters: [9,6,8,7,4] },
  { seder: "Kodashim", tractate: "Kinnim",     chapters: [4,5,6] },

  // Seder Taharot
  { seder: "Taharot", tractate: "Kelim",       chapters: [9,8,8,4,11,4,6,11,8,8,9,8,8,8,6,8,17,9,10,7,3,10,5,17,9,9,12,10,8,4] },
  { seder: "Taharot", tractate: "Ohalot",      chapters: [8,7,7,3,7,7,6,6,16,7,9,8,6,7,10,5,5,10,16] },
  { seder: "Taharot", tractate: "Nega'im",     chapters: [6,5,8,11,5,8,5,10,3,10,12,7,12,13] },
  { seder: "Taharot", tractate: "Parah",       chapters: [4,5,11,4,9,5,12,10,9,6,9,11] },
  { seder: "Taharot", tractate: "Tahorot",     chapters: [9,8,8,13,9,10,9,10,9,8] },
  { seder: "Taharot", tractate: "Mikva'ot",    chapters: [8,10,4,5,6,11,7,5,7,8] },
  { seder: "Taharot", tractate: "Niddah",      chapters: [7,7,7,7,9,14,5,4,11,8] },
  { seder: "Taharot", tractate: "Makhshirin",  chapters: [6,11,8,10,11,8] },
  { seder: "Taharot", tractate: "Zavim",       chapters: [6,4,3,7,12] },
  { seder: "Taharot", tractate: "Tevul Yom",   chapters: [5,8,6,7] },
  { seder: "Taharot", tractate: "Yadayim",     chapters: [5,4,5,8] },
  { seder: "Taharot", tractate: "Oktzin",      chapters: [6,10,12] },
];

// Compute totals and build enriched structure
export const MISHNA_STRUCTURE: TractateInfo[] = MISHNA_STRUCTURE_RAW.map(t => ({
  ...t,
  totalMishnayot: t.chapters.reduce((sum, c) => sum + c, 0),
}));

// Group by seder
export const SEDARIM: SederInfo[] = (() => {
  const sederMap = new Map<string, TractateInfo[]>();
  const sederOrder = ['Zeraim', 'Moed', 'Nashim', 'Nezikin', 'Kodashim', 'Taharot'];

  for (const t of MISHNA_STRUCTURE) {
    if (!sederMap.has(t.seder)) sederMap.set(t.seder, []);
    sederMap.get(t.seder)!.push(t);
  }

  return sederOrder.map(name => {
    const tractates = sederMap.get(name) || [];
    return {
      name,
      tractates,
      totalMishnayot: tractates.reduce((sum, t) => sum + t.totalMishnayot, 0),
    };
  });
})();

export const TOTAL_MISHNAYOT = MISHNA_STRUCTURE.reduce((sum, t) => sum + t.totalMishnayot, 0);

export const SEDER_HEBREW: Record<string, string> = {
  Zeraim:   'זְרָעִים',
  Moed:     'מוֹעֵד',
  Nashim:   'נָשִׁים',
  Nezikin:  'נְזִיקִין',
  Kodashim: 'קֳדָשִׁים',
  Taharot:  'טָהֳרוֹת',
};

export const TRACTATE_HEBREW: Record<string, string> = {
  "Berakhot":     "בְּרָכוֹת",
  "Pe'ah":        "פֵּאָה",
  "Demai":        "דְּמַאי",
  "Kilayim":      "כִּלְאַיִם",
  "Shevi'it":     "שְׁבִיעִית",
  "Terumot":      "תְּרוּמוֹת",
  "Ma'asrot":     "מַעַשְׂרוֹת",
  "Ma'aser Sheni":"מַעֲשֵׂר שֵׁנִי",
  "Challah":      "חַלָּה",
  "Orlah":        "עָרְלָה",
  "Bikkurim":     "בִּכּוּרִים",
  "Shabbat":      "שַׁבָּת",
  "Eruvin":       "עֵרוּבִין",
  "Pesachim":     "פְּסָחִים",
  "Shekalim":     "שְׁקָלִים",
  "Yoma":         "יוֹמָא",
  "Sukkah":       "סֻכָּה",
  "Beitzah":      "בֵּיצָה",
  "Rosh Hashanah":"רֹאשׁ הַשָּׁנָה",
  "Ta'anit":      "תַּעֲנִית",
  "Megillah":     "מְגִלָּה",
  "Mo'ed Katan":  "מוֹעֵד קָטָן",
  "Chagigah":     "חֲגִיגָה",
  "Yevamot":      "יְבָמוֹת",
  "Ketubot":      "כְּתוּבוֹת",
  "Nedarim":      "נְדָרִים",
  "Nazir":        "נָזִיר",
  "Sotah":        "סוֹטָה",
  "Gittin":       "גִּטִּין",
  "Kiddushin":    "קִדּוּשִׁין",
  "Bava Kamma":   "בָּבָא קַמָּא",
  "Bava Metzia":  "בָּבָא מְצִיעָא",
  "Bava Batra":   "בָּבָא בַּתְרָא",
  "Sanhedrin":    "סַנְהֶדְרִין",
  "Makkot":       "מַכּוֹת",
  "Shevuot":      "שְׁבוּעוֹת",
  "Eduyot":       "עֵדוּיּוֹת",
  "Avodah Zarah": "עֲבוֹדָה זָרָה",
  "Avot":         "אָבוֹת",
  "Horayot":      "הוֹרָיּוֹת",
  "Zevachim":     "זְבָחִים",
  "Menachot":     "מְנָחוֹת",
  "Chullin":      "חֻלִּין",
  "Bekhorot":     "בְּכוֹרוֹת",
  "Arakhin":      "עֲרָכִין",
  "Temurah":      "תְּמוּרָה",
  "Keritot":      "כְּרִיתוֹת",
  "Me'ilah":      "מְעִילָה",
  "Tamid":        "תָּמִיד",
  "Middot":       "מִדּוֹת",
  "Kinnim":       "קִנִּים",
  "Kelim":        "כֵּלִים",
  "Ohalot":       "אֳהָלוֹת",
  "Nega'im":      "נְגָעִים",
  "Parah":        "פָּרָה",
  "Tahorot":      "טָהֳרוֹת",
  "Mikva'ot":     "מִקְוָאוֹת",
  "Niddah":       "נִדָּה",
  "Makhshirin":   "מַכְשִׁירִין",
  "Zavim":        "זָבִים",
  "Tevul Yom":    "טְבוּל יוֹם",
  "Yadayim":      "יָדַיִם",
  "Oktzin":       "עוּקְצִין",
};

// Build a flat ordered list of all mishnayot for sequential numbering
export interface MishnaReference {
  seder: string;
  tractate: string;
  chapter: number;
  mishna: number;
  globalIndex: number; // 1-based
}

export const ALL_MISHNAYOT: MishnaReference[] = (() => {
  const list: MishnaReference[] = [];
  let idx = 1;
  for (const t of MISHNA_STRUCTURE) {
    for (let c = 0; c < t.chapters.length; c++) {
      for (let m = 1; m <= t.chapters[c]; m++) {
        list.push({
          seder: t.seder,
          tractate: t.tractate,
          chapter: c + 1,
          mishna: m,
          globalIndex: idx++,
        });
      }
    }
  }
  return list;
})();

// Build day → [mishna1, mishna2] pairs (the Mishna Yomit schedule)
// Each day covers exactly 2 mishnayot
export const DAY_TO_MISHNAYOT: MishnaReference[][] = (() => {
  const days: MishnaReference[][] = [];
  for (let i = 0; i < ALL_MISHNAYOT.length; i += 2) {
    days.push(ALL_MISHNAYOT.slice(i, i + 2));
  }
  return days;
})();

export function getTractateInfo(tractate: string): TractateInfo | undefined {
  return MISHNA_STRUCTURE.find(t => t.tractate === tractate);
}

export function getMishnaLabel(ref: MishnaReference): string {
  return `${ref.tractate} ${ref.chapter}:${ref.mishna}`;
}
