import { chromium, devices } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.AUDIT_URL || 'http://localhost:3100';
const output = process.env.AUDIT_OUTPUT || 'audit-artifacts/rendered';
await mkdir(output,{recursive:true});
const browser = await chromium.launch();
const results=[];
try {
  for(const width of [320,375,768,1024,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    for(const [name,path] of [['home','/'],['catalogue','/tyres'],['product','/tyres/ralson-rmr61-295-80r22-5'],['fallback','/tyres/greforce-gr881w-11r22-5'],['cart','/cart']]) {
      const response=await page.goto(base+path);
      await page.locator('main').waitFor();
      await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true});
      const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,title:document.title,canonical:document.querySelector('link[rel=canonical]')?.href,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),schemas:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent))}));
      results.push({width,path,status:response.status(),...state,errors:[...errors]});
    }
    await context.close();
  }
  const context=await browser.newContext({...devices['Pixel 7'],reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(base+'/');
  await page.screenshot({path:`${output}/pixel7.png`,fullPage:true});
  await context.close();
} finally { await browser.close(); }
await writeFile(`${output}/rendered.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify({pages:results.length,issues:results.filter(r=>r.overflow>1||r.status!==200||r.brokenImages.length||r.errors.length)}));
