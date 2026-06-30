import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser Console Error:', msg.text());
    } else {
      console.log('Browser Console:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.error('Page Error:', error.message);
  });

  try {
    await page.goto('http://localhost:4173/vocabulary', { waitUntil: 'networkidle2' });
  } catch (e) {
    console.error('Failed to go to page:', e.message);
  }

  await browser.close();
})();
