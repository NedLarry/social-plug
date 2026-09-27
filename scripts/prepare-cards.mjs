// Turns the card photos in src/assets/cards into small, cropped web images in
// src/assets/cards/web, which is what the app loads. Runs before `dev` and `build`;
// photos that haven't changed since their web copy was made are skipped.
import { access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'src/assets/cards';
const OUT = path.join(SRC, 'web');
// Remembers each photo's size and timestamp, so unchanged photos are skipped.
// (File dates alone aren't reliable: photos copied off a phone can be future-dated.)
const MANIFEST = path.join(OUT, 'manifest.json');
const WIDTH = 360;
const HEIGHT = 504; // 5:7, same as the cards on screen
const WORK_SIZE = 1000;

// Accept the Nigerian shape names as well as the ones used in code.
const ALIASES = { angle: 'triangle', ball: 'circle', carpet: 'square' };
const SHAPES = ['circle', 'triangle', 'cross', 'square', 'star', 'whot'];
// Every distinct card in the 54-card deck (keep in sync with src/games/whot/deck.ts).
const DECK = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
  whot: [20],
};

function canonicalName(file) {
  const base = path.parse(file).name.toLowerCase().trim();
  if (base === 'back') return base;
  const m = base.match(/^([a-z]+)-(\d+)$/);
  if (!m) return null;
  const shape = ALIASES[m[1]] ?? m[1];
  return SHAPES.includes(shape) ? `${shape}-${Number(m[2])}` : null;
}

/**
 * Finds the card in a photo of it lying on a table. The tabletop is yellowish
 * (green well above blue); the white card and its maroon ink are not. Rows and
 * columns that are mostly card make up the box, which also shaves off slightly
 * skewed corners.
 */
function findCard(data, width, height, channels) {
  const rows = new Array(height).fill(0);
  const cols = new Array(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const [g, b] = [data[i + 1], data[i + 2]];
      if (g - b <= 12) {
        rows[y]++;
        cols[x]++;
      }
    }
  }
  const span = (counts) => {
    const cut = Math.max(...counts) * 0.5;
    const first = counts.findIndex((n) => n >= cut);
    const last = counts.findLastIndex((n) => n >= cut);
    return [first, last - first + 1];
  };
  const [top, h] = span(rows);
  const [left, w] = span(cols);
  return shaveShadows(data, width, channels, { left, top, width: w, height: h });
}

/**
 * The card's shadow on the table is grey, so it can end up inside the box as a
 * dark strip along an edge. On white-faced cards, drop edge rows/columns that are
 * much darker than the card overall. (The back is dark all over, so it's left alone.)
 */
function shaveShadows(data, width, channels, box) {
  const lum = (x, y) => {
    const i = (y * width + x) * channels;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  };
  const mean = (x0, y0, w, h) => {
    let sum = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) sum += lum(x, y);
    return sum / (w * h);
  };
  let { left, top, width: w, height: h } = box;
  const overall = mean(left, top, w, h);
  if (overall < 150) return box;
  const dark = overall * 0.8;
  const maxShave = Math.round(Math.min(w, h) * 0.2);
  for (let n = 0; n < maxShave && mean(left, top, 1, h) < dark; n++) (left++, w--);
  for (let n = 0; n < maxShave && mean(left + w - 1, top, 1, h) < dark; n++) w--;
  for (let n = 0; n < maxShave && mean(left, top, w, 1) < dark; n++) (top++, h--);
  for (let n = 0; n < maxShave && mean(left, top + h - 1, w, 1) < dark; n++) h--;
  return { left, top, width: w, height: h };
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

await mkdir(OUT, { recursive: true });
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8').catch(() => '{}'));
const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
let made = 0;
const found = new Set();

for (const file of files) {
  const name = canonicalName(file);
  if (!name) {
    console.warn(`cards: skipping "${file}" (expected e.g. circle-1.jpg, angle-7.jpg, whot-20.jpg, back.jpg)`);
    continue;
  }
  found.add(name);
  const src = path.join(SRC, file);
  const out = path.join(OUT, `${name}.webp`);
  const { size, mtimeMs } = await stat(src);
  const stamp = `${size}:${mtimeMs}`;
  if (manifest[file] === stamp && (await exists(out))) continue;

  // Apply the camera rotation and shrink first; the full-size photos are slow to work with.
  const work = await sharp(src).rotate().resize(WORK_SIZE).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = work.info;
  await sharp(work.data, { raw: { width, height, channels } })
    .extract(findCard(work.data, width, height, channels))
    .resize(WIDTH, HEIGHT, { fit: 'fill' })
    .webp({ quality: 80 })
    .toFile(out);
  manifest[file] = stamp;
  made++;
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`cards: ${made} image(s) prepared, ${files.length - made} unchanged or skipped`);
const missing = [
  ...Object.entries(DECK).flatMap(([shape, numbers]) => numbers.map((n) => `${shape}-${n}`)),
  'back',
].filter((name) => !found.has(name));
if (missing.length) console.warn(`cards: no photo yet for ${missing.join(', ')} (placeholder shown instead)`);
