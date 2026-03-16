# Frontend Integration: 100% Discount Coupon Flow

## What Changed

When a user applies a 100% discount coupon (e.g. `SALESACADEMY100`), the backend now skips the payment gateway entirely and returns a different response shape compared to a normal payment initiation.

---

## Response Shapes

### Normal payment (partial or full amount)
```json
{
  "authorizationUrl": "https://checkout.squadco.com/...",
  "reference": "squad-ref-123"
}
```

### 100% discount (free enrollment)
```json
{
  "free": true,
  "reference": "free-1710598385000",
  "tokens": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

The user is **already enrolled as a STUDENT** when this response arrives. No payment page visit is needed.

---

## What the Frontend Must Do

After calling either the public payment endpoint (`POST /payments/public/initialize`) or the authenticated endpoint (`POST /payments/initiate`), check for `free: true` before redirecting:

```js
const response = await fetch('/payments/public/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, name, phoneNumber, discountCode, callbackUrl }),
});

const data = await response.json();

if (data.free) {
  // 100% discount — user is already enrolled, no payment page needed
  // 1. Save tokens
  localStorage.setItem('accessToken', data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.tokens.refreshToken);

  // 2. Update auth state (if using a context/store)
  setUser({ role: 'STUDENT', ...otherFields });

  // 3. Redirect to dashboard
  router.push('/dashboard'); // or window.location.href = '/dashboard'
} else {
  // Normal flow — redirect to Squad payment page
  window.location.href = data.authorizationUrl;
}
```

---

## Authenticated Flow (logged-in users)

Same logic applies for `POST /payments/initiate`:

```js
const response = await fetch('/payments/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ plan: 'full', discountCode }),
});

const data = await response.json();

if (data.free) {
  localStorage.setItem('accessToken', data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.tokens.refreshToken);
  setUser({ role: 'STUDENT' });
  router.push('/dashboard');
} else {
  window.location.href = data.authorizationUrl;
}
```

---

## UX Recommendation

When the user enters a discount code in the payment form and clicks pay:

1. Show a loading state while the request is in flight.
2. If `free: true` is returned, you can optionally show a brief success message ("You've been enrolled for free!") before redirecting to the dashboard.
3. Do **not** show a "Redirecting to payment..." message in the free case.

---

## Error Handling

If an invalid or expired coupon is entered, the backend returns:

```json
{ "error": "Invalid or expired discount code" }
```
HTTP status `400`. Display this as a form validation error on the discount code field.
