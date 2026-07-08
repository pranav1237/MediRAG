// Playwright test to verify admin document upload UI
// To run this test:
// 1. Install Playwright in the frontend folder: `npm i -D @playwright/test`
// 2. Install browsers: `npx playwright install`
// 3. Run: `npx playwright test tests/admin-upload.spec.ts`

import { test, expect } from '@playwright/test';

test('admin can upload document and see processing status', async ({ page }) => {
  // Edit base URL if your app runs on different host/port
  await page.goto('http://localhost:3000/login');

  // Quick-fill admin credentials
  await page.fill('input[type="email"]', 'admin@medirag.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Access Clinical Knowledge")');

  // Wait for redirect to main workspace
  await page.waitForURL('**/');
  await page.click('button:has-text("Ingest Document")');

  // Fill upload modal
  await page.fill('input[placeholder="e.g. WHO Hypertension Protocol 2026"]', 'E2E Test Guideline');
  const filePath = require('path').resolve(__dirname, '../tests/fixtures/sample_guideline.txt');
  await page.setInputFiles('input[type=file]', filePath);
  await page.click('button:has-text("Upload & Process")');

  // Expect to see an entry with status processing (polling may be required)
  await expect(page.getByText('Chunking & Embedding', { exact: false })).toBeVisible({ timeout: 15000 });
});
