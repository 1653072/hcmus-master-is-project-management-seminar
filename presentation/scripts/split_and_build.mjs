#!/usr/bin/env node
/**
 * Split general_slide.html → html_slides/*.html + shared css/js
 * Rebuild general_slide.html from manifest.
 *
 * Usage:
 *   node scripts/split_and_build.mjs split   # one-time split from monolith
 *   node scripts/split_and_build.mjs build   # assemble general_slide.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SLIDES_DIR = path.join(ROOT, 'html_slides');
const CSS_PATH = path.join(ROOT, 'css', 'slides.css');
const JS_PATH = path.join(ROOT, 'js', 'deck.js');
const MANIFEST_PATH = path.join(SLIDES_DIR, 'slides.manifest.json');
const DECK_PATH = path.join(ROOT, 'general_slide.html');
const MONOLITH_PATH = path.join(ROOT, 'general_slide.html');

const HERO_BG =
  'radial-gradient(ellipse 90% 70% at 15% 95%, rgba(245, 124, 0, 0.4) 0%, transparent 55%), radial-gradient(ellipse 75% 55% at 85% 15%, rgba(21, 101, 192, 0.55) 0%, transparent 50%), radial-gradient(ellipse 45% 35% at 55% 45%, rgba(46, 125, 50, 0.2) 0%, transparent 60%), linear-gradient(150deg, #0c1020 0%, #151b2e 45%, #0a1628 100%)';

function readMonolith() {
  return fs.readFileSync(DECK_PATH, 'utf8');
}

function extractBetween(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`Markers not found: ${startMarker}`);
  return html.slice(start + startMarker.length, end).trim();
}

function splitFromMonolith() {
  const html = readMonolith();

  // Extract CSS if still inline
  if (html.includes('<style>')) {
    const css = extractBetween(html, '<style>', '</style>');
    fs.mkdirSync(path.dirname(CSS_PATH), { recursive: true });
    fs.writeFileSync(CSS_PATH, css + '\n');
    console.log('Wrote', CSS_PATH);
  }

  // Extract deck JS if still inline (second script block after reveal.js)
  const revealScriptTag = '<script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>';
  const scriptIdx = html.indexOf(revealScriptTag);
  if (scriptIdx !== -1) {
    const afterReveal = html.slice(scriptIdx + revealScriptTag.length);
    const inlineStart = afterReveal.indexOf('<script>');
    const inlineEnd = afterReveal.indexOf('</script>', inlineStart);
    if (inlineStart !== -1 && inlineEnd !== -1) {
      const js = afterReveal.slice(inlineStart + '<script>'.length, inlineEnd).trim();
      fs.mkdirSync(path.dirname(JS_PATH), { recursive: true });
      fs.writeFileSync(JS_PATH, js + '\n');
      console.log('Wrote', JS_PATH);
    }
  }

  const slidesStart = html.indexOf('<div class="slides">');
  const slidesInnerStart = html.indexOf('>', slidesStart) + 1;
  const slidesEnd = html.indexOf('</div>\n  </div>\n\n  <nav class="slide-nav"');
  const slidesBlock = html.slice(slidesInnerStart, slidesEnd);

  const sectionRegex = /<!--[\s\S]*?-->\s*<section[\s\S]*?<\/section>/g;
  const sections = [...slidesBlock.matchAll(sectionRegex)].map((m) => m[0].trim());

  if (sections.length === 0) {
    throw new Error('No slide sections found. Check HTML structure.');
  }

  fs.mkdirSync(SLIDES_DIR, { recursive: true });

  const manifest = [];
  sections.forEach((section, i) => {
    const num = String(i + 1).padStart(2, '0');
    const filename = `slide_${num}.html`;
    const commentMatch = section.match(/<!--\s*(.+?)\s*-->/);
    const title = commentMatch ? commentMatch[1] : `Slide ${num}`;
    const content = `<!-- ${title} -->\n${section.replace(/^<!--[\s\S]*?-->\s*/, '').trim()}\n`;
    fs.writeFileSync(path.join(SLIDES_DIR, filename), content);
    manifest.push({ file: filename, title });
    console.log('Wrote', filename, '-', title);
  });

  fs.writeFileSync(
    MANIFEST_PATH,
    JSON.stringify({ total: manifest.length, heroBackground: HERO_BG, slides: manifest }, null, 2) + '\n'
  );
  console.log('Wrote', MANIFEST_PATH, `(${manifest.length} slides)`);
}

function buildDeck() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error('Missing slides.manifest.json — run: node scripts/split_and_build.mjs split');
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const slideParts = manifest.slides.map(({ file }) => {
    const body = fs.readFileSync(path.join(SLIDES_DIR, file), 'utf8').trim();
    return `      ${body}`;
  });

  const deck = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SO SÁNH VENDOR PM &amp; IN-HOUSE PM</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/white.css">
  <link rel="stylesheet" href="css/slides.css">
</head>
<body>
  <div class="reveal">
    <div class="slides">

${slideParts.join('\n\n')}

    </div>
  </div>

  <nav class="slide-nav" aria-label="Điều hướng slide">
    <button type="button" id="nav-prev" aria-label="Slide trước" title="Slide trước (←)">‹</button>
    <span class="nav-counter" id="nav-counter">1 / ${manifest.total}</span>
    <button type="button" id="nav-next" aria-label="Slide sau" title="Slide sau (→)">›</button>
  </nav>

  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script src="js/deck.js"></script>
</body>
</html>
`;

  fs.writeFileSync(DECK_PATH, deck);
  console.log('Built', DECK_PATH, `(${manifest.total} slides)`);
}

const cmd = process.argv[2] || 'build';
if (cmd === 'split') {
  splitFromMonolith();
  buildDeck();
} else if (cmd === 'build') {
  buildDeck();
} else {
  console.error('Usage: node split_and_build.mjs [split|build]');
  process.exit(1);
}
