import puppeteer from 'puppeteer';
(async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox']});
    const page = await browser.newPage();
    await page.goto('http://localhost:1420', {waitUntil: 'networkidle0'});
    await page.click('button[title="Tasks"]');
    await new Promise(r => setTimeout(r, 1000));
    const html = await page.evaluate(() => document.body.innerHTML);
    if (html.includes('vite-error-overlay')) {
        const err = await page.evaluate(() => document.querySelector('vite-error-overlay').shadowRoot.innerHTML);
        console.log('VITE ERROR:', err);
    } else {
        const text = await page.evaluate(() => document.body.innerText);
        console.log('PAGE TEXT:', text.substring(0, 500));
    }
    await browser.close();
})();
