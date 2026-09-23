import { test, expect } from '@playwright/test';
import { isTablet, viewports } from './fixtures/viewports';
import {
  assertBoxHeightPx,
  assertFontSizePx,
  assertLabelFitsButton,
  assertNoHorizontalPageOverflow,
  assertNoOverlap,
  assertStackedVertically,
  assertWithinParent,
  getBox,
  normalizeText,
  settlePage,
} from './helpers/layout';

/** Phrases that must read with spaces once mobile-only <br>s are hidden (≥860 / tablet). */
const PRINCIPLES_SPACED_PHRASES = [
  'not a global safety net',
  'Do What Only Governments Can Do',
  'Public goods and systems change. Leave the rest',
  'markets where markets can deliver',
  'Not Failing States',
  "End What Doesn't Work",
  'goal, not permanent dependency',
];

const PRINCIPLES_GLUED_FORBIDDEN = [
  'nota global',
  'GovernmentsCan',
  'change.Leave',
  'wheremarkets',
  'NotFailing',
  "WhatDoesn't",
  'permanentdependency',
];

for (const vp of viewports) {
  test.describe(`homepage layout @ ${vp.id} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`layout geometry — ${vp.label}`, async ({ page }) => {
      await page.goto('/index.html');
      await settlePage(page);
      await expect(page.locator('#the-record')).toBeVisible();

      // --- Record articles: no pairwise overlap of main children ---
      const articles = page.locator('#the-record article');
      const articleCount = await articles.count();
      expect(articleCount).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < articleCount; i++) {
        const article = articles.nth(i);
        const children = article.locator(':scope > *');
        const childCount = await children.count();
        expect(childCount).toBeGreaterThanOrEqual(3);

        const main = [children.nth(0), children.nth(1), children.nth(2)];

        await assertNoOverlap(main[0], main[1]);
        await assertNoOverlap(main[0], main[2]);
        await assertNoOverlap(main[1], main[2]);

        if (isTablet(vp.width)) {
          const boxes = await Promise.all(main.map((l) => getBox(l)));
          const xs = boxes.map((b) => Math.round(b.x));
          expect(
            new Set(xs).size,
            `tablet+ Record article[${i}] children should have distinct x: ${xs.join(',')}`,
          ).toBe(3);
        } else {
          await assertStackedVertically(main);
        }
      }

      // --- Diagnosis tick patterns stay inside section ---
      const diagnosis = page.locator('#the-diagnosis');
      const ticks = page.locator('#the-diagnosis .tick-pattern');
      const tickCount = await ticks.count();
      expect(tickCount).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < tickCount; i++) {
        await assertWithinParent(ticks.nth(i), diagnosis);
      }

      // --- Principles / live-tracker seam ---
      await assertNoOverlap(page.locator('#principles'), page.locator('#live-tracker'));

      const principlesCta = page.locator('#principles a.btn-outline').filter({ visible: true });
      await expect(principlesCta).toBeVisible();
      await assertLabelFitsButton(principlesCta);

      // --- Glued Six Principles words (spaces around mobile-only breaks) ---
      const principlesText = normalizeText(await page.locator('#principles').innerText());
      for (const phrase of PRINCIPLES_SPACED_PHRASES) {
        expect(principlesText, `missing spaced phrase: ${phrase}`).toContain(phrase);
      }
      for (const glued of PRINCIPLES_GLUED_FORBIDDEN) {
        expect(principlesText, `glued words present: ${glued}`).not.toContain(glued);
      }

      // --- Contact / newsletter type (+ shapeshift mark from tablet up) ---
      const contactHeading = page.locator('#contact h2');
      const contactEmail = page.locator('#contact a[href^="mailto:"]');
      const newsletterHeading = page.locator('footer h3');
      await expect(contactHeading).toBeVisible();
      await expect(contactEmail).toBeVisible();
      await expect(newsletterHeading).toBeVisible();

      const contactPx = isTablet(vp.width) ? 34 : 26;
      const newsletterPx = isTablet(vp.width) ? 30 : 22;
      const emailPx = isTablet(vp.width) ? 34 : 16;
      await assertFontSizePx(contactHeading, contactPx);
      await assertFontSizePx(contactEmail, emailPx);
      await assertFontSizePx(newsletterHeading, newsletterPx);

      if (isTablet(vp.width)) {
        const mark = page.locator('img[alt="Powered by shapeshift"]');
        await expect(mark).toBeVisible();
        await assertBoxHeightPx(mark, 26);
      }

      // --- Hero + page overflow ---
      await expect(page.locator('#page-hero img').first()).toBeVisible();
      await assertNoHorizontalPageOverflow(page);

      // --- Nav band (tablet floor = 860) ---
      if (isTablet(vp.width)) {
        await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();
        await expect(page.locator('nav[aria-label="Primary"] a').first()).toBeVisible();
        await expect(page.locator('#menuToggle')).toBeHidden();
      } else {
        await expect(page.locator('#menuToggle')).toBeVisible();
        await expect(page.locator('nav[aria-label="Primary"]')).toBeHidden();
      }

      // --- Decorative month rail removed ---
      await expect(page.locator('.tracker-month')).toHaveCount(0);
    });
  });
}
