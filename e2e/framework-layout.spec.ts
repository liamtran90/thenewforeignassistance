import { test, expect } from '@playwright/test';
import { isTablet, viewports } from './fixtures/viewports';
import {
  assertBoxHeightPx,
  assertFontSizePx,
  assertNoHorizontalPageOverflow,
  normalizeText,
  settlePage,
} from './helpers/layout';

for (const vp of viewports) {
  test.describe(`framework layout @ ${vp.id} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`layout — ${vp.label}`, async ({ page }) => {
      await page.goto('/framework.html');
      await settlePage(page);

      const heading = page.getByRole('heading', { name: 'The Framework', exact: true });
      await expect(heading).toBeVisible();
      await expect(page.locator('#framework-contents .eyebrow')).toHaveCount(0);
      await expect(page.getByText('Contents', { exact: true })).toHaveCount(0);

      const pullquote = page.locator('.fw-pullquote p').first();
      await expect(pullquote).toBeVisible();
      const align = await pullquote.evaluate((el) => getComputedStyle(el).textAlign);
      expect(['left', 'start'].includes(align), `text-align was ${align}`).toBe(true);

      await expect(page.locator('.fw-subsection-heading').first()).toBeVisible();

      // --- “of attempted reform” break (tablet+ history title; present in DOM at all widths) ---
      const historyHeading = page.locator('h2').filter({ hasText: 'attempted reform' }).first();
      await expect(historyHeading).toBeAttached();
      const historyText = normalizeText(await historyHeading.innerText());
      expect(historyText).toBe('A long story of attempted reform');
      expect(historyText).not.toMatch(/storyof/i);
      const breakBeforeOf = await historyHeading.evaluate((el) =>
        /<br[^>]*>\s*of\s+attempted/i.test(el.innerHTML),
      );
      expect(breakBeforeOf, 'line break should sit before “of”').toBe(true);
      if (isTablet(vp.width)) {
        await expect(historyHeading).toBeVisible();
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

      await assertNoHorizontalPageOverflow(page);

      if (isTablet(vp.width)) {
        await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();
        await expect(page.locator('#menuToggle')).toBeHidden();
      } else {
        await expect(page.locator('#menuToggle')).toBeVisible();
        await expect(page.locator('nav[aria-label="Primary"]')).toBeHidden();
      }
    });
  });
}
