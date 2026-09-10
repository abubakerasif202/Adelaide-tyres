import { test, expect } from '@playwright/test';

test('transaction pages are noindex with their own canonical', async ({ page }) => {
  for (const path of ['/cart', '/checkout']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://adelaidewholesaletyres.com.au${path}`);
  }
});

test('submission APIs reject oversized bodies without notification', async ({ request, baseURL }) => {
  for (const path of ['/api/orders', '/api/enquiries']) {
    const response = await request.post(path, { headers: { origin: baseURL!, 'x-forwarded-for': path.endsWith('orders') ? '192.0.2.91' : '192.0.2.92' }, data: { message: 'x'.repeat(33000) } });
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

test('card checkout stays hidden unless the server confirms it is fully configured', async ({ page }) => {
  await page.route('**/api/checkout/status', route => route.fulfill({ json: { enabled: false } }));
  await page.goto('/tyres/greforce-gr881w-11r22-5');
  await page.getByRole('button', { name: 'Add & go to cart' }).click();
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await page.getByRole('button', { name: 'Continue to delivery' }).click();
  await page.getByRole('radio', { name: /Warehouse pickup/ }).check();
  await page.getByLabel('Business / name').fill('Audit test');
  await page.getByLabel('Phone', { exact: false }).fill('0400000000');
  await page.getByLabel('Email', { exact: false }).fill('audit@example.invalid');
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await expect(page.getByRole('button', { name: /Pay .* by card/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Place bulk order' })).toBeVisible();
});

test('card checkout redirects to Stripe when the server confirms it is enabled', async ({ page }) => {
  await page.route('**/api/checkout/status', route => route.fulfill({ json: { enabled: true } }));
  await page.route('**/api/checkout', route =>
    route.fulfill({ json: { url: 'https://checkout.stripe.com/test-session', reference: 'AWT-TEST-1' } }),
  );
  // Stub Stripe's hosted page so the assertion tests our redirect, not network egress.
  await page.route('https://checkout.stripe.com/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html><body>stub</body></html>' }),
  );
  await page.goto('/tyres/greforce-gr881w-11r22-5');
  await page.getByRole('button', { name: 'Add & go to cart' }).click();
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await page.getByRole('button', { name: 'Continue to delivery' }).click();
  await page.getByRole('radio', { name: /Warehouse pickup/ }).check();
  await page.getByLabel('Business / name').fill('Audit test');
  await page.getByLabel('Phone', { exact: false }).fill('0400000000');
  await page.getByLabel('Email', { exact: false }).fill('audit@example.invalid');
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  const payButton = page.getByRole('button', { name: /Pay .* by card/ });
  await expect(payButton).toBeVisible();
  await Promise.all([
    page.waitForURL('https://checkout.stripe.com/test-session', { timeout: 5000 }).catch(() => {}),
    payButton.click(),
  ]);
  expect(page.url()).toContain('checkout.stripe.com/test-session');
});

test('a cancelled Stripe checkout shows a banner and leaves the cart intact', async ({ page }) => {
  await page.route('**/api/checkout/status', route => route.fulfill({ json: { enabled: true } }));
  await page.goto('/tyres/greforce-gr881w-11r22-5');
  await page.getByRole('button', { name: 'Add & go to cart' }).click();
  await page.waitForURL('**/cart');
  // The cart persists to localStorage on a short debounce; a full navigation
  // (as a Stripe redirect back to the site would be) must not race it away.
  await page.waitForFunction(() => {
    try {
      return JSON.parse(localStorage.getItem('awt.cart.v1') || '{}').lines?.length > 0;
    } catch {
      return false;
    }
  });
  await page.goto('/checkout?cancelled=1');
  await expect(page.getByRole('status')).toContainText('Payment was cancelled');
  await expect(page.getByRole('spinbutton')).toHaveValue('1');
});
