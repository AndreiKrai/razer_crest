# AUTHENTICATION.md — sign-in, box codes, entitlements

Status: **OPEN** (agreed in discussion with the owner on 2026-11-23; confirm before building). Related: `MONETIZATION.md`. Facts marked **verify** must be re-checked before implementation.

## 1. Decisions

- The app is usable **without an account**: connect, manual control, free effects, beta play.
- **Sign-in is mandatory at box-code redemption**, one tap: Sign in with Apple and Sign in with Google. Reason: an anonymous identity is lost on reinstall or a lost phone, and the user would lose the code they paid for with the kit.
- Apple guideline 4.8: if Google sign-in is offered, Sign in with Apple must be offered too (**verify** current wording).
- Purchases (model unlocks, effect packs, collection subscription) also require sign-in, so they follow the user across devices and platforms.
- Manual recovery through support (photo of the code or receipt) is **out of scope for now**. We still log every redemption so it can be added later.

## 2. Architecture

| Part | Technology | Responsibility |
| --- | --- | --- |
| App | Expo / React Native (dev build) | UI, BLE, local cache of effects, offline play |
| Identity | Firebase Auth (Apple, Google; anonymous before sign-in) | One user id per person |
| Purchases | RevenueCat (`react-native-purchases`) | Store purchases, entitlements; App User ID = Firebase uid |
| Code redemption | Firebase Cloud Function `redeemBoxCode` | Validate code, mark used, grant entitlement |
| Content delivery | Cloud Function `getEffectPack` + Firebase Storage | Check entitlement, return a short-lived signed URL |
| Data | Firestore | Box codes and redemption log |

The app never decides entitlements on its own: the server and RevenueCat are the source of truth; the app caches the result for offline use.

## 3. Flows

**First launch.** Firebase anonymous sign-in in the background. The user plays with free effects; no screen asks for an account.

**Box-code redemption.**

1. User taps "Activate kit" and enters or scans the code.
2. If still anonymous, the app asks for Sign in with Apple / Google and **links** the anonymous account to it (local settings are kept).
3. The app calls `redeemBoxCode(code)` with the Firebase ID token.
4. The function checks in a Firestore transaction that the code exists and is unused, then marks it used with `uid` and timestamp.
5. The function grants 12 months of subscription to that `uid` through the RevenueCat REST API (promotional entitlement; `MONETIZATION.md` §2). **Verify** API support and limits, and whether store offer codes are the better route (`MONETIZATION.md` M11).
6. The app refreshes RevenueCat customer info and downloads the model's paid effects.

**Purchase.** Sign-in first, then RevenueCat purchase with App User ID = Firebase uid. Restore Purchases stays available (store rule).

**Effect download.** The app calls `getEffectPack(packId)`. The function checks the entitlement in RevenueCat and returns a signed Storage URL valid for minutes. The app stores the pack locally.

**New phone or reinstall.** User signs in with the same Apple / Google account; entitlements come back from RevenueCat; packs are downloaded again.

**Offline.** Downloaded effects and the cached entitlement keep working without network. Grace period before re-check: **OPEN**.

## 4. Data model (Firestore)

`boxCodes/{codeHash}`:

- `modelId` — which model the code unlocks (from the catalog, never hard-coded)
- `batchId` — production batch, for revoking a leaked batch
- `status` — `unused` | `redeemed` | `revoked`
- `redeemedBy` — Firebase uid, `redeemedAt` — timestamp

Store a hash of the code, not the code itself. Keep personal data minimal (revDSG, GDPR): no names or emails in Firestore; identity lives in Firebase Auth.

## 5. Abuse protection

- One code = one redemption, enforced in a transaction.
- Codes long and random (e.g. 12+ characters from an unambiguous alphabet), printed under a scratch-off or inside sealed packaging.
- Rate limit `redeemBoxCode` per uid and per IP; Firebase App Check to block calls from outside the genuine app.
- A leaked batch can be revoked by `batchId`.

## 6. Open questions

| # | Question | Status |
| --- | --- | --- |
| A1 | Code format, printing method, QR or typed | ⏳ Open |
| A2 | RevenueCat promotional entitlements via REST: limits and cost | ⏳ Verify |
| A3 | Offline grace period for cached entitlements | ⏳ Open |
| A4 | Account deletion flow (required by Apple; GDPR) | ⏳ Open |
| A5 | Manual recovery through support | ⏸ Later |
| A6 | Firebase region (EU) for data residency | ⏳ Open |
| A7 | Box codes may be allowed only as a hardware-dependent unlock (App Store 3.1.4); see `MONETIZATION.md` M11. The whole redemption flow depends on it | ⏳ Verify, critical |
| A8 | Code leaks at the factory: packing staff in China can copy codes before sale; a scratch-off does not stop this, and revoking a batch hurts honest buyers. Option: redemption also requires a proof from the genuine board (challenge-response, `FIRMWARE_SECURITY.md` F14), which conflicts with "no binding licences to board identity" (`MONETIZATION.md` §2) | ⏳ Open |
| A9 | Resale and gifts: the code is bound to the first account, so a second-hand buyer gets nothing; a gift redeemed by a parent lands on the parent's account. Decide transfer rules | ⏳ Open |
| A10 | Age: target users include teens; GDPR digital consent age is 13–16 depending on the country, so mandatory sign-in may need parental consent. Check with a lawyer | ⏳ Verify |
| A11 | Account-link conflict: if the Apple / Google account already has a Firebase user (signed in on another device), linking the anonymous account fails; define how local data is merged | ⏳ Open |
| A12 | Store codes as HMAC with a server secret (pepper), not a plain hash; short codes are brute-forceable from a leaked database | ⏳ Open |
| A13 | Account deletion must also delete the RevenueCat customer and redemption log entries (or anonymise them) | ⏳ Open |
| A14 | Firebase is a US provider: check the data processing agreement and Swiss / EU transfer basis together with A6 | ⏳ Verify |
| A15 | Scope: auth, codes, RevenueCat and Cloud Functions are a project of their own; the config-driven firmware (`PRODUCT.md` §9 milestone 4) is not built yet. Schedule this after the core product works | ⏳ Open |
| A16 | "Keep what you built" (`MONETIZATION.md` §2): store per account and project which paid effects were added during a paid period, so they survive reinstall, a new phone and a reflashed board, and so copies outside the account lose them. Data model and the server-signed config (`FIRMWARE_SECURITY.md` F16) still to design | ⏳ Open |
| A17 | `getEffectPack` and Storage delivery may be obsolete: paid effects are now firmware effect ids gated by entitlement, not downloadable packs. Keep only if packs of ready models or presets are delivered as data | ⏳ Open |
