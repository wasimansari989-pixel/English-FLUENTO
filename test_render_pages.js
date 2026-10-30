const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testPage(page, url, delayMs, screenshotName) {
  console.log(`Testing ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, delayMs));
  await page.screenshot({ path: path.join(__dirname, screenshotName) });
  console.log(`Saved ${screenshotName}`);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); // iPhone / Android modern mobile size!

  const p1 = 'file:///' + path.resolve('src/components/welcome/marukubo_welcome.html').replace(/\\/g, '/');
  const p2 = 'file:///' + path.resolve('src/components/welcome/wasii_anime_logo.html').replace(/\\/g, '/');

  await testPage(page, p1, 3500, 'test_marukubo_mobile.png');
  await testPage(page, p2, 3000, 'test_wasii_mobile.png');

  await browser.close();
  console.log('Done testing pages!');
}

main().catch(console.error);
