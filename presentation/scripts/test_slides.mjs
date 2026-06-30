#!/usr/bin/env node
/**
 * Test all slides for clipping and invisible text.
 * Usage: node scripts/test_slides.mjs [baseUrl]
 * Default: http://127.0.0.1:8777/general_slide.html
 */
import { chromium } from 'playwright';

const PAGE_URL = process.argv[2] || 'http://127.0.0.1:8777/general_slide.html';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const failures = [];
const total = await page.evaluate(() => document.querySelectorAll('.slides > section').length);

for (let i = 1; i <= total; i++) {
  if (i > 1) {
    await page.click('#nav-next');
    await page.waitForTimeout(350);
  }
  const r = await page.evaluate(() => {
    const slide = document.querySelector('section.present');
    const sr = slide.getBoundingClientRect();
    const h = slide.querySelector('h1, h2, h3, blockquote');
    const heading = h ? h.textContent.trim().slice(0, 50) : slide.innerText.trim().slice(0, 50);
    const isContent = slide.classList.contains('content-slide');
    const issues = [];
    let clipRight = 0;
    let clipBottom = 0;
    slide.querySelectorAll('h1,h2,h3,p,li,td,.card,.highlight-box,.key-message,.pros,.cons,blockquote,.s02-card,.s02-quote,.s09-panel,.s09-foot,.s09-row').forEach((el) => {
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return;
      if (box.right > sr.right + 8) clipRight++;
      if (box.left < sr.left - 8) issues.push('clip-left');
      if (box.bottom > sr.bottom + 4) clipBottom++;
    });
    if (clipRight > 0) {
      const isSection = slide.classList.contains('section-slide');
      const onlyH1 = clipRight === 1 && slide.querySelectorAll('h1').length === 1;
      if (!(isSection && onlyH1)) issues.push(`clip-right:${clipRight}`);
    }
    if (clipBottom > 0) issues.push(`clip-bottom:${clipBottom}`);
    if (isContent && h) {
      const rgb = getComputedStyle(h).color.match(/\d+/g).map(Number);
      const lum = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
      if (lum > 200) issues.push('invisible-text');
    }
    if (slide.innerText.trim().length < 5 && !slide.classList.contains('section-slide')) {
      issues.push('empty');
    }

    if (slide.classList.contains('slide-two-worlds')) {
      const cards = [...slide.querySelectorAll('.s02-card')];
      if (cards.length === 2) {
        const h0 = Math.round(cards[0].getBoundingClientRect().height);
        const h1 = Math.round(cards[1].getBoundingClientRect().height);
        if (Math.abs(h0 - h1) > 4) issues.push(`s2-unequal-cards:${h0}/${h1}`);
      }
      const quote = slide.querySelector('.s02-quote');
      const grid = slide.querySelector('.s02-grid');
      if (quote && grid) {
        const gap = quote.getBoundingClientRect().top - grid.getBoundingClientRect().bottom;
        if (gap < -2) issues.push('s2-quote-overlap');
      }
    }

    if (slide.classList.contains('slide-09-inhouse-dual')) {
      slide.querySelectorAll('.s09-panel').forEach((panel) => {
        const facts = panel.querySelector('.s09-facts');
        const foot = panel.querySelector('.s09-foot');
        if (!facts || !foot) {
          issues.push('s09-missing-parts');
          return;
        }
        const lastRow = facts.querySelector('.s09-row:last-child');
        if (lastRow) {
          const lf = lastRow.getBoundingClientRect();
          const ft = foot.getBoundingClientRect();
          if (lf.bottom > ft.top - 2) issues.push('s09-overlap');
        }
        panel.querySelectorAll('.s09-row dd').forEach((dd) => {
          if (dd.getBoundingClientRect().height < 6) issues.push('s09-text-hidden');
        });
      });
      const panels = [...slide.querySelectorAll('.s09-panel')];
      if (panels.length === 2) {
        const h0 = Math.round(panels[0].getBoundingClientRect().height);
        const h1 = Math.round(panels[1].getBoundingClientRect().height);
        if (Math.abs(h0 - h1) > 4) issues.push(`s09-unequal-height:${h0}/${h1}`);
      }
      const feet = [...slide.querySelectorAll('.s09-foot')];
      if (feet.length === 2) {
        const fh0 = Math.round(feet[0].getBoundingClientRect().height);
        const fh1 = Math.round(feet[1].getBoundingClientRect().height);
        if (Math.abs(fh0 - fh1) > 4) issues.push(`s09-unequal-foot:${fh0}/${fh1}`);
      }
      panels.forEach((panel) => {
        const dds = [...panel.querySelectorAll('.s09-row dd')];
        if (dds.length < 2) return;
        const left0 = Math.round(dds[0].getBoundingClientRect().left);
        const left1 = Math.round(dds[1].getBoundingClientRect().left);
        if (Math.abs(left0 - left1) > 2) issues.push('s09-dd-misalign');
      });
      if (panels.length === 2) {
        const dd0 = panels[0].querySelector('.s09-row dd');
        const dd1 = panels[1].querySelector('.s09-row dd');
        if (dd0 && dd1) {
          const rel0 = Math.round(dd0.getBoundingClientRect().left - panels[0].getBoundingClientRect().left);
          const rel1 = Math.round(dd1.getBoundingClientRect().left - panels[1].getBoundingClientRect().left);
          if (Math.abs(rel0 - rel1) > 4) issues.push(`s09-col-misalign:${rel0}/${rel1}`);
        }
      }
    }

    return { heading, issues };
  });
  const ok = !r.issues.length;
  console.log(`${ok ? 'OK' : 'FAIL'} ${String(i).padStart(2)}  ${r.heading.slice(0, 40)}  ${r.issues.join(' ') || ''}`);
  if (!ok) failures.push({ slide: i, ...r });
}

console.log(`\nFailures: ${failures.length}/${total}`);
await browser.close();
process.exit(failures.length ? 1 : 0);
