# MesoIQ Pro subscriptions

Status: agreed product and architecture specification; implementation not started.
Build-ready PRD for an implementing agent: [`pro-subscriptions-prd.md`](pro-subscriptions-prd.md).

## Product decisions

Pro serves self-directed lifters who want to understand progress, identify stalls,
and improve their programming. Free remains useful indefinitely as a primary
workout logger.

- Launch purchases on iOS through Apple auto-renewable subscriptions.
- Offer one monthly plan with a Canadian base price of CAD $4.99 and localized
  storefront pricing. Read the displayed price from StoreKit.
- No annual plan, free trial, introductory offer, or Family Sharing at launch.
- Apply the new free/Pro gates to existing accounts immediately; no grandfathering
  or transition preview.
- Keep unlimited manual programs and cycles free.
- Pro includes the existing AI “describe a program” generation feature. Do not
  build AI quotas, credits, usage allowances, or additional AI functionality.
- Present upgrades when users select Pro features and from Settings. Do not
  interrupt logging or require an onboarding paywall.
- Locked features show a short explanation and clearly labelled example data,
  never example numbers presented as the user's actual training results.

## Feature boundary

| Feature | Free | Pro |
| --- | --- | --- |
| Workout logging, previous performance, supported set types, custom exercises | Yes | Yes |
| Manual program creation/editing and repeated training cycles | Unlimited | Unlimited |
| All session/cycle history, saved programs, data export | Yes | Yes |
| Personal records and basic per-exercise progress charts | Yes | Yes |
| Consistency calendar, streaks, adherence, ordinary cycle progress | Yes | Yes |
| Basic totals, monthly tonnage, per-exercise volume charts | Yes | Yes |
| Program-builder planned-volume bars and days-since-trained aids | Yes | Yes |
| Existing AI “describe a program” generation | No | Yes |
| Stall detection and cross-exercise strength analysis | No | Yes |
| Muscle progression, working-set/baseline analysis, rep-range breakdowns | No | Yes |
| Weight × rep matrix and detailed cycle comparisons | No | Yes |

Saved AI-generated programs remain editable and usable after Pro expires. Expiry
does not delete programs or training data. Only paid analysis and new AI
generation close. User-initiated data/account deletion remains available.

### Mapping to existing screens

Gate sections rather than entire Data, Cycle, or Progress routes:

- `src/screens/data/CycleTab.tsx`: Pro gates for What Changed insights, working
  sets/baseline bars and their drill-down, Strength Trend, and This Cycle vs. Last.
  Keep the ordinary week/RIR/days-logged overview free.
- `src/screens/data/ProgressTab.tsx`: Pro gates for Where You Actually Train,
  Rep Ranges, and Overload Rate by Muscle. Keep exercise selection, the basic
  per-exercise chart, changes, and records free.
- `src/components/plan/NewProgramSheet.tsx`: gate Describe It and the generation
  action. Manual creation stays free.
- `src/screens/mesocycle/MesocycleDetailScreen.tsx`: gate aggregate cycle Avg e1RM
  analysis; retain progress, adherence, weeks, and session navigation.
- Find all other uses of aggregate cycle-strength summaries, including program
  cards and cycle rows, and apply the same boundary consistently.
- Keep `HistoryTab`, exercise-detail charts/history/records, program volume
  previews, logger summaries, and completion records available as specified above.
  Do not accidentally gate the shared basic `E1rmChart` component or its ordinary
  fitted trend line.
- `src/screens/main/AccountSettingsScreen.tsx`: add Upgrade, subscription status,
  Restore Purchases, and provider-appropriate subscription management.

Features currently disabled pending backend changes are not Pro launch promises.

## Account-owned, provider-independent Pro access

MesoIQ Pro belongs to a MesoIQ account. Apple and future Stripe subscriptions are
billing sources that can grant the same internal Pro plan. A future Apple
subscriber can use Pro on the web, and a future web/Stripe subscriber can use Pro
in iOS by signing into the same account.

Implement Apple now. Design the data model, access API, and feature gates to
support additional providers without changing product screens. Do not implement
Stripe checkout, install a Stripe SDK, or provision Stripe resources in this
release merely to reserve the future integration.

### Logical records

Use the backend's existing naming conventions when implementing these concepts:

| Record | Responsibility |
| --- | --- |
| Internal plan/capability mapping | Stable `pro` plan granting `advanced_analytics` and `ai_program_generation`; independent of provider prices/products |
| Billing identity | Provider identity bound to a MesoIQ user; stable Apple account UUID now, Stripe customer binding later |
| Provider subscription | Provider/environment/external subscription ID, owning user, mapped internal plan, provider status, renewal setting, paid-through and grace dates, revocation information, last reconciliation |
| Processed provider event | Unique event identity and durable processing state for deduplication and recovery |
| Purchase attempt | Short-lived, recoverable coordination record for purchase eligibility and concurrent checkout attempts |

Apple's original transaction ID identifies its subscription chain. Treat external
identifiers as scoped by provider and environment. Enforce unique ownership in the
database. Keep test/sandbox and production access isolated; sandbox transactions
must never grant production access.

Keep provider-specific evidence and statuses available for audit/reconciliation;
derive normalized access from them. Do not force every provider's billing states
into an Apple-specific status enum. If an entitlement snapshot is persisted, treat
it as a derived projection, not an independent editable source of truth.

Resolve future Stripe ownership using stored customer/subscription relationships,
not matching email addresses or trusting client-supplied account IDs.

### Entitlement rules and API

- Grant Pro when at least one verified, eligible subscription grants the internal
  Pro plan through its paid or configured grace period.
- Turning off renewal does not remove access during the paid period.
- A source expiring, refunding, or revoking cannot remove access granted by another
  valid source. Recompute across all eligible sources.
- Do not grant access from an unverified transaction, client boolean, success-page
  redirect, or pending purchase.
- Provider adapters verify/reconcile billing evidence and update their records;
  the central entitlement service determines features and purchase eligibility.
- Keep retry/grace policies provider-specific. Apple's 16-day setting must not be
  silently assumed to configure Stripe billing retries later.

Provide an authenticated access endpoint, for example `GET /api/me/entitlements`,
returning the internal plan/capabilities, verification time, access validity,
purchase eligibility, and provider-aware subscription summaries. Summaries should
distinguish renewable, cancelled-but-still-active, grace, and expired states.
Never expose provider secrets in this response.

Use a central client entitlement owner scoped to the signed-in user. Product
screens consume capabilities such as `canUseAdvancedAnalytics`; they do not inspect
Apple product IDs or run their own subscription-state rules.

Enforce AI generation eligibility on the backend as well as in the UI. Existing
analytics are largely client-derived from raw history, so their gates are product
UI controls; do not claim to hide raw workout data from its owner.

## Duplicate-subscription prevention

Do not let our purchase flows start another subscription when any provider already
grants Pro, including billing grace or cancelled-but-paid-through access.

- Show “You already have Pro,” identify the billing source, and provide suitable
  subscription details/management rather than selling a second subscription.
- Recheck eligibility on the server immediately before initiating a purchase.
  Coordinate concurrent attempts per account using atomic database operations.
- Pending purchases and interrupted attempts need explicit recoverable states;
  do not leave permanent purchase locks after a crash or abandoned purchase.
- Future Stripe checkout must consult this same eligibility service.
- Do not automatically cancel, transfer, or migrate another provider's subscription.
- Actual ownership mismatches must explain account recovery rather than silently
  binding an existing purchase to another signed-in user.
- External store actions and races can still create overlap. Verify and record
  legitimate purchases, show all billing sources clearly, preserve access from
  any eligible source, and offer management for each. Do not promise that software
  can make cross-provider duplicate billing impossible.

Provider switching is not an automated migration feature in the Apple launch.

## Apple implementation

### Existing codebases

- Mobile: `/Users/craigjames/Repos/MesoIQ`, bare React Native 0.83.1 / React 19.2 /
  TypeScript, iOS minimum 15.1.
- Backend: `/Users/craigjames/Repos/simple-workout-tracker`, Next.js / Prisma /
  PostgreSQL with existing mobile authentication and AI-generation routes.
- No existing subscription integration or entitlement model was found.

### App Store configuration

- One MesoIQ Pro subscription group and one one-month auto-renewable product.
- Stable product identifier, explicitly mapped on the server to internal `pro`.
- Canadian base price CAD $4.99; localized prices and availability corresponding
  to the app's supported storefronts.
- No offers/trial/Family Sharing. Enable 16-day grace for paid-to-paid renewals,
  validate in sandbox, then enable for production.
- Configure signed Server Notifications V2 for sandbox and production.
- Complete required commercial agreements, banking/tax information, localized
  product metadata, review materials, privacy policy, and Terms of Use links.
- Check current App Review rules at submission. Recognizing web-acquired Pro is
  distinct from placing a web-checkout link inside iOS; future management/purchase
  links must follow storefront rules.

### Purchase and restore flow

1. Fetch backend capabilities and purchase eligibility for the signed-in account.
2. Load the actual product, localized price, and purchase availability from Apple.
   Product-loading failure shows a retry state, not a hardcoded purchasable price.
3. Backend provides a stable UUID `appAccountToken` bound to the MesoIQ user.
4. Begin native purchase with that token. Observe transaction updates from app
   startup, not just while the paywall is open.
5. Send purchase evidence to the authenticated backend. Verify signature,
   environment, bundle/application identity, permitted product, ownership, and
   subscription status. Do not trust client-supplied price or expiry dates.
6. Persist the verified subscription and entitlement result durably and
   idempotently. Refresh client capabilities and finish the fulfilled transaction.
   Interrupted fulfillment must retry on relaunch without another charge.
7. Handle a dismissed purchase sheet quietly. Pending purchases do not grant new
   access; later approvals must flow through the same verification path.
8. Restore Purchases is available in the paywall and Settings. Refresh current
   entitlements automatically as appropriate; force StoreKit sync only following
   an explicit Restore action because it can prompt for Apple authentication.
9. Provide Manage Subscription for Apple subscriptions. Future providers supply
   their own management destinations through an appropriate platform-aware flow.

`react-native-iap` is the proposed StoreKit bridge. Current declared platform
requirements match the app, but select and pin a release and validate its exact
API, Nitro peer dependency, pods, architecture, and build compatibility before
committing to it. Use Apple's official Node server library for signed evidence
and Server API integration where appropriate; verify the backend runtime against
the selected library version (current main documentation requires Node 22+).

Keep private keys and verification configuration on the server. Verify signed
notifications before processing them, deduplicate them, and reconcile current
status so delayed/out-of-order events cannot overwrite newer truth. Use server
reconciliation to recover missed notifications rather than relying solely on the
app being opened or notifications arriving promptly.

## Lifecycle and failure behavior

| Situation | Behavior |
| --- | --- |
| Active verified subscription | Pro |
| Renewal disabled | Pro through the paid period; show end date |
| Failed paid renewal in Apple's grace period | Pro through Apple's verified grace end |
| Expired or billing retry after grace | Free unless another source still grants Pro |
| Refund/revocation | Reconcile the affected source and recompute account access |
| Purchase pending or not yet verified | Preserve existing tier; show recoverable pending state |
| Temporary verification outage | Retain last verified access for at most 24 hours, never beyond known paid/grace validity |
| No verified cached entitlement | Do not invent Pro access; keep ordinary free features available |
| Pro ends | Keep saved programs/data; close paid analysis and new AI generation |
| Sign out or switch account | Clear user-scoped entitlement state and caches |

Cached access is an outage policy, not a new offline workout-sync feature. AI
generation still requires the backend. The cache must contain account-scoped,
previously verified status and must not outlive a known entitlement end. Explicit
revocation supersedes cached access when learned.

Account deletion must warn that deleting MesoIQ does not cancel Apple billing,
offer Manage Subscription, and still permit deletion without requiring prior
cancellation. Do not silently transfer an old purchase to a recreated account.
Retain only billing/audit evidence required under the documented retention policy;
account deletion still removes user training data as promised.

## Implementation sequence

1. Add backend billing identities, provider subscriptions, processed-event records,
   purchase-attempt coordination, internal plan mapping, and entitlement rules.
2. Implement Apple verification, signed notifications, status reconciliation,
   authenticated entitlement/eligibility endpoints, and backend AI authorization.
3. Integrate StoreKit purchase/update/restore handling and the central client
   entitlement owner, including recovery and bounded cache behavior.
4. Add the paywall, labelled previews, account subscription controls, account
   deletion notice, and section-level gates across all entry points.
5. Validate StoreKit locally and real sandbox/TestFlight/server interactions.
6. Release coordinated backend/client changes after product readiness and review.
   Check legacy clients receive clear authorization errors from newly gated AI
   routes; UI checks alone cannot enforce the new free limits.

## Acceptance and validation

- Free accounts can create unlimited manual programs, run repeated cycles, log
  workouts, inspect all history/basic progress, and export their data.
- All paid entry points use the same entitlement decision; direct AI API calls
  from free accounts are rejected without generating a program.
- Purchase success, dismissal, pending approval, failed verification, relaunch,
  restore/reinstall, account mismatch, and account switching behave correctly.
- Renewals, cancellation, grace, expiry, refund/revocation, missed notifications,
  duplicates, and out-of-order delivery produce the correct account entitlement.
- A future-provider test adapter can grant the same Pro capabilities without
  changing feature screens. Revoking Apple while another source is valid retains
  Pro, and the reverse behaves identically. This needs no live Stripe integration.
- Already-active, grace, cancelled-but-paid-through, and concurrent purchase
  attempts are prevented from initiating duplicate subscriptions through our flows.
- A forced overlapping-subscription case remains intelligible and preserves
  valid access while exposing both billing sources.
- Outage access is capped by both 24 hours since verification and known validity;
  new/unverified accounts and switched accounts cannot inherit cached Pro.
- Expiry never removes saved AI/manual programs or training history. Deletion
  remains possible and displays the separate Apple cancellation notice.
- Storefront-localized price, monthly renewal terms, Restore, management, Terms,
  privacy links, accessibility, and labelled preview data are verified in the UI.

Future Stripe implementation must include authenticated Checkout, durable customer
binding, signed lifecycle/payment/risk webhook handling, reconciliation,
provider-appropriate billing management and retry policies, duplicate-purchase
eligibility checks, and tax configuration/registrations where required. A Stripe
success-page redirect alone must never grant Pro.

## Primary references

- [React Native purchase integration](https://www.openiap.dev/docs/setup/react-native)
- [Apple App Store Server Library for Node](https://github.com/apple/app-store-server-library-node)
- [Apple account token](https://developer.apple.com/documentation/appstoreserverapi/appaccounttoken)
- [App Store Server Notifications](https://developer.apple.com/documentation/appstoreservernotifications/)
- [Current StoreKit entitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements)
- [Explicit purchase synchronization](https://developer.apple.com/documentation/storekit/appstore/sync())
- [Apple billing grace periods](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions/)
- [App Review subscription and multiplatform rules](https://developer.apple.com/app-store/review/guidelines/)
- [Stripe subscription webhook guidance](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe recurring-payment tax guidance](https://docs.stripe.com/billing/taxes/collect-taxes)
