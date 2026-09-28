// Keeps slurs and obvious profanity off the leaderboard.
//
// Written to avoid blocking real names, especially Nigerian ones: "Nigeria",
// "Shittu", "Dickson", "Nazir", "Kike" (Yoruba) and "Hancock" are all fine.
// So there are two kinds of check:
//   - SLURS: caught anywhere in the name, even disguised (n1gg@, n.i.g.g.a,
//     niiigga). Patterns are chosen so they can't match ordinary words.
//   - WORDS: only blocked as a whole word, so "Shittu" passes but "shit" doesn't.
// To add more, extend the lists below and add a case to nameFilter.test.ts.

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '3': 'e',
  '4': 'a',
  '@': 'a',
  '5': 's',
  $: 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
};

/** Checked anywhere in the name, with spaces and punctuation removed. */
const SLURS: RegExp[] = [
  /n+i+[gq]{2,}/, // n-word (a double g, so "Nigeria"/"Niger" are safe)
  /f+a+g+g+/, // faggot
  /t+r+a+n+n+(y|i+e)/,
  /r+e+t+a+r+d/,
  /f+u+c+k/,
  /m+o+t+h+e+r+f+/,
  /b+i+t+c+h/,
  /a+s+s+h+o+l+e/,
  /w+h+o+r+e/,
  /p+u+s+s+y/,
  /d+i+c+k+h+e+a+d/,
  /c+o+c+k+s+u+c+k/,
  /h+i+t+l+e+r/,
  /w+e+t+b+a+c+k/,
];

/** Blocked only as a whole word (repeated letters allowed: "shiiit"). */
const WORDS = [
  'fag', 'fags', 'chink', 'chinks', 'spic', 'spics', 'gook', 'gooks', 'coon', 'coons', 'dyke', 'dykes',
  'cunt', 'cunts', 'shit', 'shits', 'shitty', 'shithead', 'dick', 'dicks', 'cock', 'cocks', 'prick',
  'twat', 'slut', 'sluts', 'wank', 'wanker', 'bastard', 'rape', 'rapist', 'nazi', 'nazis', 'cum',
  'fuk', 'fck', 'fcuk', 'tits', 'penis', 'vagina', 'anal', 'anus', 'porn', 'sex', 'ashawo',
];

// "shit" → /^s+h+i+t+$/ so stretched spellings still match.
const WORD_PATTERNS = WORDS.map((w) => new RegExp(`^${[...w].map((ch) => `${ch}+`).join('')}$`));

function normalize(name: string) {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // é → e
    .toLowerCase()
    .replace(/[0-9!|@$]/g, (ch) => LEET[ch] ?? ch);
}

/** True if the name contains a slur or profanity and shouldn't be shown publicly. */
export function isOffensive(name: string) {
  const text = normalize(name);
  const joined = text.replace(/[^a-z]/g, '');
  if (SLURS.some((re) => re.test(joined))) return true;
  const words = text.split(/[^a-z]+/).filter(Boolean);
  // Also catch a word spelled out with gaps: "s h i t", "c.u.n.t".
  if (words.length > 1 && words.every((w) => w.length === 1)) words.push(joined);
  return words.some((w) => WORD_PATTERNS.some((re) => re.test(w)));
}
