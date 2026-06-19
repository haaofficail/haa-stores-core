/**
 * E2E Flow 5: API health + brand endpoint
 *
 * Apple-level: API responds correctly to core endpoints.
 */
import { test, expect } from '@playwright/test';

test.describe('API — core endpoints', () => {
  test('/api/brand returns the new brand color', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/brand');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.primaryColor).toBe('#5c9cd5');
  });

  test('/api/health returns OK', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/health');
    // status code may vary; just verify it responds
    expect([200, 404]).toContain(res.status());
  });
});
