# URL Parameters & Cookies

Quick reference for all URL query params and cookies used across the app.

---

## URL Query Parameters

### `?rejected=1`
- **Where**: `/login`, `/register`
- **What**: Triggers `InvalidEmailModal` display
- **Why**: User signed in with non-SVNIT email and `EARLY_REJECT=true`
- **Flow**: Sign-in → email rejected → logout → redirect with param → show modal → dismiss clears param

### `?logged_out=incomplete_registration`
- **Where**: `/login`, `/register`
- **What**: Triggers `LoggedOutModal` display
- **Why**: User with rejected email tried accessing non-onboarding page when `EARLY_REJECT=false`
- **Flow**: Middleware detects `email_rejected` cookie → logout → redirect with param → show modal → dismiss clears param

---

## Cookies

### `onboarding_complete`
- **Type**: HttpOnly, Secure (prod), SameSite=Lax
- **Values**: `"true"` | `"false"` (string)
- **Set by**: 
  - `/api/auth/session` (on sign-in)
  - `/api/onboarding` (form submission)
- **Read by**: Middleware
- **Purpose**: Gate access to routes when onboarding is incomplete — avoids Firestore lookup on every request
- **Lifetime**: 1 year

### `email_rejected`
- **Type**: HttpOnly, Secure (prod), SameSite=Lax
- **Values**: `"true"` (string, only set when true)
- **Set by**: `/api/auth/session` (when email invalid and `EARLY_REJECT=false`)
- **Cleared by**: 
  - `/api/auth/session` (when valid email signs in)
  - Middleware (when forcing logout)
- **Read by**: Middleware
- **Purpose**: Track users with rejected emails to enforce logout when they try accessing non-onboarding pages
- **Lifetime**: 1 year (but cleared on logout or valid sign-in)

---

## Implementation Files

- **Session API**: `src/app/api/auth/session/route.ts`
- **Onboarding API**: `src/app/api/onboarding/route.ts`
- **Middleware**: `src/middleware.ts`
- **Login/Register pages**: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`
- **Modals**: `src/components/auth/InvalidEmailModal.tsx`, `src/components/auth/LoggedOutModal.tsx`
