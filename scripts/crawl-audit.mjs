import { chromium } from '@playwright/test';
import { catalogue } from '../lib/catalogue.ts';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.AUDIT_URL || 'http://localhost:3198';
const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];
try {
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  for (const url of urls) {
    const path = new URL(url).pathname;
    const response = await page.goto(base + path);
    const data = await page.evaluate(() => ({
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      h1: document.querySelectorAll('h1').length,
      schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)),
    }));
    const product = catalogue.find(p => `/tyres/${p.slug}` === path);
    const schema = data.schemas.find(s => s['@type'] === 'Product');
    const issues = [];
    if (response.status() !== 200 || data.canonical !== url || !data.description || data.h1 !== 1) issues.push('route metadata');
    if (product && (!schema || schema.sku !== product.id || schema.offers.price !== product.price || schema.offers.priceCurrency !== 'AUD' || Boolean(schema.image) !== Boolean(product.image))) issues.push('product schema');
    results.push({path,status:response.status(),...data,issues});
  }
  await page.goto(base + '/tyres/greforce-gr881w-11r22-5');
  await page.getByRole('button', {name:'Add & go to cart'}).click();
  await page.screenshot({path:'audit-artifacts/final/cart-populated.png',fullPage:true});
  await page.goto(base + '/');
  await page.keyboard.press('Tab');
  const firstFocus = await page.locator(':focus').textContent();
  await mkdir('audit-artifacts', {recursive:true});
  await writeFile('audit-artifacts/crawl.json', JSON.stringify({base,firstFocus,results},null,2));
  console.log(JSON.stringify({urls:results.length,firstFocus,issues:results.filter(r => r.issues.length)}));
} finally { await browser.close(); }
