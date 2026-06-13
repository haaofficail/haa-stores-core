import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const STORE_SLUG = __ENV.STORE_SLUG || 'demo-store';

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export const options = {
  scenarios: {
    storefront_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      exec: 'storefrontBrowse',
    },
    checkout_probe: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1m',
      duration: '5m',
      preAllocatedVUs: 10,
      exec: 'checkoutProbe',
    },
    webhook_burst: {
      executor: 'constant-arrival-rate',
      rate: 60,
      timeUnit: '1m',
      duration: '2m',
      preAllocatedVUs: 20,
      exec: 'webhookBurst',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.001'],
    'http_req_duration{path:storefront}': ['p(95)<300'],
    'http_req_duration{path:checkout}': ['p(95)<1500'],
    'http_req_duration{path:webhook}': ['p(95)<800'],
  },
};

export function storefrontBrowse() {
  const home = http.get(`${BASE_URL}/s/${STORE_SLUG}`, { tags: { path: 'storefront' } });
  check(home, { 'storefront responds': (r) => r.status < 500 });
  sleep(1);
  const products = http.get(`${BASE_URL}/s/${STORE_SLUG}/products`, { tags: { path: 'storefront' } });
  check(products, { 'products responds': (r) => r.status < 500 });
  sleep(1);
}

export function checkoutProbe() {
  const res = http.get(`${BASE_URL}/s/${STORE_SLUG}/cart`, { tags: { path: 'checkout' } });
  check(res, { 'cart responds': (r) => r.status < 500 });
}

export function webhookBurst() {
  const res = http.post(`${BASE_URL}/webhooks/payments/fake`, '{}', {
    headers: { 'Content-Type': 'application/json' },
    tags: { path: 'webhook' },
  });
  check(res, { 'webhook does not crash': (r) => r.status < 500 });
}
