// Random, human-looking names for seeded high scores.
const FIRST = [
  'Tunde', 'Chioma', 'Emeka', 'Ada', 'Bolaji', 'Ngozi', 'Kelechi', 'Funmi', 'Ifeanyi', 'Yemi',
  'Zainab', 'Obinna', 'Temi', 'Uche', 'Amaka', 'Segun', 'Halima', 'Chidi', 'Bisi', 'Musa',
  'Sarah', 'David', 'Grace', 'Michael', 'Joy', 'Daniel', 'Esther', 'Samuel', 'Precious', 'Victor',
];
const LAST_INITIAL = 'ABCDEGIKMNOSTUY';
const HANDLE_WORDS = ['king', 'queen', 'boss', 'pro', 'star', 'legend', 'ace', 'master'];

export function randomPlayerName(random = Math.random): string {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  const first = pick(FIRST);
  // No bare first names: seeded names are reserved while their board lasts, and
  // that shouldn't block a real "Tunde" from playing.
  switch (Math.floor(random() * 3)) {
    case 0:
      return `${first} ${pick([...LAST_INITIAL])}.`;
    case 1:
      return `${first.toLowerCase()}${10 + Math.floor(random() * 90)}`;
    default:
      return `${first}_${pick(HANDLE_WORDS)}`;
  }
}
