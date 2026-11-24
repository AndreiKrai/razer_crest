# MONETIZATION.md — business model, pricing, anti-clone strategy

Written from the market-manager role. Status: **OPEN** (proposal agreed in discussion with the owner on 2026-11-23; confirm before building on it). Nothing is built. Figures marked **assumption** or **verify** are estimates; store fees, tax and customs rules change. Last review: 2026-11-23.

## 1. Context and thesis

- The product is a generic constructor for any custom LEGO-style world: ready-made boards, an ESP32 controller and a phone app (`PRODUCT.md` §1). On top of it we provide ready models of existing builds: the user either creates their own project or downloads a ready one. Once a model is set up, its lights rarely change: users play with it repeatedly rather than reconfigure it.
- The hardware is an adaptation of existing Chinese products and is easy to copy. Treat cloning as **certain**. The defensible parts are the app, its content, the brand and the community.
- Product name: **OPEN**. The working name will be replaced. The new name must be checked in trademark registers and must not reference LEGO, Star Wars or other third-party marks, including in demo models and ads.
- Company: Swiss-based (not yet incorporated); customers worldwide; apps sold through Apple App Store and Google Play.

**Trademark plan (verify with a trademark attorney; not legal advice):**

1. File the base application in Switzerland (IPI), then extend through the WIPO Madrid system.
2. **China first, before Kickstarter:** first-to-file; register the Latin name and a Chinese-character name.
3. European Union (one EUIPO mark for all 27 states), United Kingdom, United States.
4. Later, with sales: Japan, South Korea, Canada, Australia.
5. Classes at minimum: 9 (app, electronics) and 28 (toys, construction kits).
6. Secure matching domains and store developer names at the same time.

Thesis: a subscription pays for **creating and editing** with paid effects, never for **using** what the user already built. A model set up during a paid period keeps working forever (no recurring toll on a static model). Make genuine hardware the cheapest path to the full software, and keep prices low enough that a clone app is not worth building.

## 2. Model: effects subscription with "keep what you built", plus one-time purchases

Decided with the owner on 2026-11-23 (M10).

| Layer | What | Why |
| --- | --- | --- |
| **Free** | Connect, manual control, free light effects | Anyone, including clone owners, can try the app |
| **Subscription** | While active: use paid light effects in any model (add, edit their parameters) | Ongoing revenue; new paid effects must keep coming (Apple 3.1.2) |
| **Box code** | One-time code in every genuine kit: **12 months** of subscription | Main anti-clone lever: the original is the cheapest way to the full app |
| **One-time purchases** (IAP) | Kept alongside the subscription (model unlocks, effect packs); exact content **OPEN** (M16) | Option for users who don't want a subscription |
| **New models** | New kits with their own box codes; ready models to download (§1) | Main growth driver |

**Rules for paid effects:**

- A paid effect is a light effect type (firmware effect id) flagged `paid` in the catalog, with the entitlement that unlocks it. No hard-coded models.
- With an active subscription the user can freely create and edit models with paid effects.
- After the subscription ends: paid effects already in a model **stay and keep working on the board forever**. The user can still edit everything else in that model (other lights, actions, scenarios, free effects). Paid effects are **locked for editing** (no new ones, no parameter changes) until the subscription is renewed.
- Copy, duplicate, export and import of a model **keep its paid effects only with an active subscription** and only within the user's own account. Without a subscription the user can still clone such a model, but the clone loses its paid effects. In another account, a copy always loses them.
- Moving a model to another board (broken board, second kit), with or without a subscription: allowed. The server signs the config for the new board's ID; the account has a limit of active boards with paid effects (number **OPEN**, 5–10 proposed) (M17).
- The **licence** is bound to the account, never to a board, and moves freely between the user's boards. Only each signed **config** is bound to one board ID, so a config copied from one board does not run paid effects on another (owner decision, 2026-11-23).
- Enforcement: the server signs the config for one board, and the firmware runs paid effects only from a config correctly signed for itself (`FIRMWARE_SECURITY.md` F16). Without this, one paid account could copy a model onto thousands of clone boards. It needs F6, F8 and F16 and must be done **before sales**; until then only the app enforces it, and bypassing it is possible.
- The right to a paid effect in a given model is stored on the server (per account and project), so it survives reinstall, a new phone, a firmware update or a reflashed board.

Rejected: any subscription that stops models the user already owns from working, and per-model subscriptions. Also rejected: hiding the BLE protocol, heavy DRM, binding licences to board identity (a signed config is bound to one board, the licence is not).

## 2a. Collection subscription (optional, yearly)

Earlier idea, written before the effects subscription (§2). Whether it merges into that subscription or stays separate is **OPEN** (M15).

An optional yearly subscription sells control of the whole collection, not access to single models. Owned models and their unlocked effects keep working forever without it; one model is always fully usable for free.

What it adds (ongoing value, Apple 3.1.2):

- **Scenes across models:** all models on a shelf light up together with one tap.
- **Schedules and automations:** e.g. the collection turns on every evening.
- **Music sync:** models pulse together to music.
- **Smart-home and voice integration** (OPEN: which platforms, effort per platform).
- Seasonal scenes (Christmas, Halloween) and cloud backup of settings.

Pricing idea (assumption, test in beta): flat yearly fee with a cap, so heavy collectors are not punished, e.g. EUR 10 for 1 model, EUR 12 for 2, EUR 15 for 3 or more. Value grows with the number of models, which justifies the tiers.

Risks: value is weak for owners of a single model, so the subscription must stay optional; multi-model scenes need simultaneous BLE connections to several boards (verify the practical limit on iOS and Android). Metrics: share of users with 2+ models, subscription conversion among them, renewal rate.

## 3. Prices (assumption, verify)

- Model unlock: **EUR 4.99–7.99**, ceiling **EUR 9.99**. Above that, approaching the price of a clone kit (≈ EUR 20–30, assumption), a clone app becomes attractive. Final price: A/B test in beta (e.g. 4.99 vs 7.99).
- Effect packs: EUR 1.99–3.99 (assumption).
- Net to us ≈ 72 % of sticker price before profit tax (blended; EU prices include VAT).

From sticker price to money in the bank:

- **Apple:** 15 % with the Small Business Program, otherwise 30 %. **Verify** and apply.
- **Google** (verified 2026-11-23): in the US, UK and EEA since 2026-06-30, a 10 % service fee on the first USD 1M per year plus a 5 % billing fee for Google Play Billing. Other markets, including Switzerland, keep the older 15 % tier until the global rollout (expected by 2027-09-30).
- **RevenueCat** (verified 2026-11-23): free up to USD 2,500 monthly tracked revenue, then 1 % of tracked revenue measured before store commission. Negligible at our scale; building our own receipt validation is not worth it.
- Refunds ≈ 3 %, FX ≈ 1 % (assumption). Swiss profit tax ≈ 12–20 % depending on canton (**verify with a Treuhänder**).
- Regional prices: about 30–60 % of base in lower-income markets.

Fixed yearly costs (estimate): developer accounts ≈ USD 124, accountant CHF 2–4k, lawyer and trademark CHF 2–3k, tools; total ≈ **CHF 6–8k**. Firebase on the free or near-free tier at launch (assumption).

Break-even (rough): software alone needs ≈ 2,000 paid unlocks per year at ≈ EUR 3.6 net, but genuine kit owners pay nothing extra, so this is unrealistic early. **The kit margin carries the business:** at an assumed EUR 15 net per kit, ≈ 500 kits per year cover fixed costs. Kit cost and margin are **OPEN**.

## 4. Anti-clone and anti-piracy plan

1. Generous Free tier and low unlock prices.
2. **Paid effects gated by a config signed for one board** (§2): the firmware runs paid effects only from a config signed by our server for that board. Required before sales; until then the app enforces it.
3. **Box-code backend** (Firebase Functions + Firestore): validate a code, mark it used, grant 12 months of subscription. Needed from phase 1; this replaces the earlier "no backend" plan. Store as little personal data as possible (revDSG, GDPR).
4. Brand, update speed, community.
5. Later: a "Works with \[product\]" programme for clone makers (OPEN).

## 5. Roadmap and triggers

| Phase | What | Trigger to move on |
| --- | --- | --- |
| 0. Validation | Kickstarter campaign; beta app; price test | Campaign funded |
| 1. Launch | Box codes, model unlocks, first effect pack, Restore Purchases, Firebase backend | Kit sales cover fixed costs (≈ 500 kits/year, assumption) |
| 2. Growth | New models, more packs, regional prices, own web shop | Stable monthly sales |
| 3. Ecosystem | Education/STEM, clone-maker licensing | OPEN |

Metrics: kits sold, box-code redemption rate, paid unlocks from users without a code (clone share), effect-pack attach rate, refund rate. Conversion benchmarks must cite a source and date.

## 6. Logistics and tax (verify with an accountant)

- **EU:** ship from China via a fulfilment partner using **IOSS** (parcels ≤ EUR 150): VAT is charged at checkout, so the buyer pays nothing on delivery. A non-EU seller needs an EU intermediary (yearly fee). Since 2026 a EUR 3 customs duty per item category applies to such parcels. An EU warehouse is the alternative at higher volume; it likely needs EU VAT registration.
- **US:** duty-free de minimis is suspended for all countries; small parcels from China pay full duties including China tariffs. Ship bulk to a US warehouse, pay duty once, fulfil domestically.
- **Switzerland:** confirm whether store payouts and kit sales count toward the CHF 100,000 VAT threshold; legal form (Einzelfirma vs GmbH).
- **Compliance:** CE/RED, RoHS, WEEE, battery rules, product liability insurance. Require CE/RoHS certificates from suppliers and use a pre-certified ESP32 module.

## 7. Open questions

| # | Question | Status |
| --- | --- | --- |
| M1 | Exact free vs paid effect split per model | ⏳ Open |
| M2 | Final subscription, unlock and pack prices; regional table | ⏳ Open |
| M3 | Box-code format, printing and redemption flow | ⏳ Open |
| M4 | Kit cost, margin, manufacturer | ⏳ Open |
| M5 | Product name and trademark check | ⏳ Open |
| M6 | Fulfilment route (China + IOSS vs EU warehouse; US warehouse) | ⏳ Open |
| M7 | Swiss VAT and legal form | ⏳ Open |
| M8 | Clone-maker licensing | ⏳ Open, later |
| M9 | Product identity: constructor or fixed models? | ✅ Decided (owner, 2026-11-23): both. A generic constructor for any custom world, plus ready models of existing builds that the user can download instead of building their own (§1) |
| M10 | What a paid "effect" is | ✅ Decided (owner, 2026-11-23): effects subscription with "keep what you built", rules in §2. Still open inside it: new paid effect code needs firmware updates (OTA not built; `FIRMWARE_SECURITY.md` F6); Apple 3.1.2 needs a steady flow of new paid effects |
| M11 | Store rules for box codes: App Store 3.1.1 forbids unlocking features with own codes. Now that a box code grants 12 months of subscription, store subscription offer codes (Apple Offer Codes, Google Play promo codes) may be the compliant route instead of our own codes; check their limits (number of codes, expiry, one per account) and how they fit our redemption backend | ⏳ Verify, critical |
| M12 | Contradictions to resolve: `FIRMWARE_SECURITY.md` (free licensed makers, every board registered on our server) vs §2 here ("no binding licences to board identity") and M8; `PRODUCT.md` A14 and the `AGENTS.md` map are updated (2026-11-23) | ⏳ Open |
| M13 | Kit margin realism: EUR 15 net on a EUR 50 kit after manufacturing, shipping, IOSS, EUR 3 duty, Kickstarter fees (≈ 8–10 %), defects and returns; Kickstarter backers expect a discount. Break-even (≈ 500 kits/year) depends on M4 | ⏳ Verify |
| M14 | Compliance gaps: EU GPSR (EU responsible person for a non-EU seller), Toy Safety Directive / new EU Toy Safety Regulation (EN 71) if the kit can be seen as a toy for children under 14, battery rules and battery shipping | ⏳ Verify with a lawyer |
| M15 | Collection subscription (§2a): merge into the effects subscription (§2) or keep separate? Scope: needs simultaneous BLE links and the director project (`PRODUCT.md` §6a, not built), schedules, music sync, smart home, cloud backup | ⏳ Open |
| M16 | One-time purchases next to the subscription: what exactly they unlock (paid effects of one model forever? an effect pack in any model?) and how they combine with the "keep what you built" rule | ⏳ Open |
| M17 | Same model on another board (broken board, second kit). Still open: the exact per-account board limit, and how a user frees a slot when a board is broken | ✅ Decided (owner, 2026-11-23): server-signed config bound to the board ID plus a limit of active boards per account (§2); the licence stays on the account |
