import { test, expect } from '@playwright/test';

test('transaction pages are noindex with their own canonical', async ({ page }) => {
  for (const path of ['/cart', '/checkout']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://adelaidewholesaletyres.com.au${path}`);
  }
});

test('submission APIs reject oversized bodies without notification', async ({ request }) => {
  for (const path of ['/api/orders', '/api/enquiries']) {
    const response = await request.post(path, { headers: { origin: 'http://localhost:3100', 'x-forwarded-for': path.endsWith('orders') ? '192.0.2.91' : '192.0.2.92' }, data: { message: 'x'.repeat(33000) } });
    expect(response.status()).toBe(413);
  }
});

test('undelivered order preserves cart and details without claiming receipt', async ({ page }) => {
  await page.route('**/api/orders', route => route.fulfill({json: {reference:'TEST', mode:'test', notified:false}}));
  await page.goto('/tyres/greforce-gr881w-11r22-5');
  await page.getByRole('button',{name:'Add & go to cart'}).click();
  await page.getByRole('link',{name:'Continue to checkout'}).click();
  await page.getByRole('button',{name:'Continue to delivery'}).click();
  await page.getByRole('radio',{name:/Warehouse pickup/}).check();
  await page.getByLabel('Business / name').fill('Audit test');
  await page.getByLabel('Phone', {exact:false}).fill('0400000000');
  await page.getByLabel('Email', {exact:false}).fill('audit@example.invalid');
  await page.getByRole('button',{name:'Continue to payment'}).click();
  await page.getByRole('button',{name:'Place bulk order'}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('could not be delivered');
  await expect(page.getByText('Order received',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.getByLabel('Business / name')).toHaveValue('Audit test');
  await page.goto('/cart');
  await expect(page.getByRole('spinbutton')).toHaveValue('1');
});
