import puppeteer from 'puppeteer';
(async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox']});
    const page = await browser.newPage();
    page.on('pageerror', err => console.log('PAGE_ERROR:', err.toString()));
    page.on('console', msg => { if(msg.type() === 'error') console.log('CONSOLE_ERROR:', msg.text()); });
    await page.goto('http://localhost:4716', {waitUntil: 'networkidle0'}).catch(()=>page.goto('http://localhost:5173', {waitUntil: 'networkidle0'}));
    await new Promise(r => setTimeout(r, 1000));
    await page.click('button[title="Tasks"]');
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
