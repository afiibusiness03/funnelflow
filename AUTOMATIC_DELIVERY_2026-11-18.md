# Immediate digital reward delivery

## Temporary pause (latest requested behavior)

Reward email is now **paused by default** until the server-only environment variable `REWARD_EMAIL_ENABLED` is exactly `true`. With the variable absent or set to `false`, no Resend setup is needed to accept new claims.

- Eligible automatic coupon/download claims are saved as `approved`, with `deliveryStatus: paused`, without contacting Resend or creating a reward reservation. They are not marked delivered and do not consume a redemption reservation yet.
- The customer sees that the claim is saved and email is paused. The dashboard displays a pause notice and disables email delivery actions. Protected API actions also return a normal paused response, rather than a 502 or a false delivery success.
- Duplicate protection remains active. A 409 means an existing claim should be used, not submitted again.
- Physical/manual fulfillment stays separate and available. No historical claims or email reservations are modified by this update.
- Validation now scrolls to and focuses the first invalid field in visual order, including products, order number, email, rating, feedback and shipping. Server errors are brought into view too.

Deploy the code to activate this default pause. **This update adds no SQL migration.** When Resend is ready, verify your domain and sender, configure the email key/sender in Vercel, set `REWARD_EMAIL_ENABLED=true`, and redeploy. Existing approved claims can then be delivered individually; enabling the setting does not bulk-send old rewards. Older reservations that already had attempted sends remain subject to the existing 23-hour reconciliation safeguard.

## Behavior

When email is enabled, an active coupon or digital-download promotion with **Auto-deliver enabled** sends immediately after a valid submission, including campaigns that collect an order number. No seller approval is required. The submitted order number is **not** treated as proof of purchase: `order_verified` remains false.

Successful provider acceptance and database confirmation move the claim to `delivered`. Failed or unconfirmed sends remain unsent and are available for seller retry; the customer is told their claim was saved and not to resubmit. This change does not introduce a background retry worker or guarantee inbox delivery. Manual promotions and physical/gift-card/loyalty rewards still require actual fulfillment.

Duplicate-claim protection, tenant isolation, fraud flags, redemption limits and provider idempotency remain in place. Historical claims are not automatically emailed by deploying this change.

## Earlier automatic-delivery migration (needed when enabling email)

1. In Supabase SQL Editor run **only** `supabase/migrations/20261118_automatic_reward_delivery.sql`. It requires the existing `20261109_security_and_analytics.sql` migration; do not rerun that older migration. The new migration replaces the reservation function transactionally and can be rerun.
2. Deploy the updated source to Vercel. In the Production environment ensure `RESEND_API_KEY` is set and `RESEND_FROM_EMAIL` uses a sender/domain verified in Resend. Redeploy after changing environment variables. Never paste the key into a report or client code.
3. Set `REWARD_EMAIL_ENABLED=true` only when the sender is ready. In Promotions ensure the linked coupon/download is Active, Auto-deliver is on, reward content is present, and its redemption limit is not exhausted. The setting now labeled **Require order number** collects the number without pausing automatic rewards.
4. For an existing Approved claim, use Deliver after deployment. Existing Pending claims can be approved individually. This change does not bulk-send historical rewards.

## Deliver error investigation

The screenshot's `Unexpected token '<' ... is not valid JSON` means the browser received HTML instead of the expected API JSON. The image does not identify whether this was a deployment error, gateway error, missing route, or redirect.

Locally confirmed: constructing the Resend client without an API key throws during module import, before route-level error handling. The client is now initialized inside the delivery error boundary; missing configuration returns a controlled JSON 503. Claim actions validate content type, redirects and success responses, preserving useful JSON errors and never treating an HTML login/error page as success. The Deliver endpoint also supports already-approved legacy claims without requiring a preexisting reward reservation.

Read-only production checks found two active campaigns (`Test` and `5USD`), both linked to active coupon promotions with Auto-deliver already enabled, no redemption cap, and order verification disabled. Therefore the current campaign settings do not explain the screenshot's delivery failure. The local email key and custom sender are configured; this does not verify Vercel's Production environment.

The public claims endpoint returned JSON 401 without authentication. The deployed Deliver route returned 405 for GET and JSON 401 for an unauthenticated POST with a synthetic ID. It exists and correctly rejects unauthenticated actions. The screenshot's authenticated error was not reproduced; Vercel runtime logs for that failed request are still needed to identify its production cause. Missing email configuration is a locally reproduced failure mode, not a confirmed production diagnosis.

An initial approval-service usage limit temporarily blocked the read-only database check; the later approved retry succeeded. No production data was changed and no real reward emails were sent during development.

Follow-up read-only diagnosis found that the locally configured sender uses `resend.dev` and the Resend account accessed by the local API key has no registered domains. The reported claim is approved, with a reservation but no recorded provider ID or sent timestamp. This alone cannot prove the state of the Vercel Production key or whether an unconfirmed attempt reached the provider. [Resend documents](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain) that the test domain only sends to the account owner's email. The user confirmed Resend is not set up yet and requested the temporary pause above, so DNS/Resend activation was deferred.

## Validation

Validation passed: 51 tests, lint, TypeScript, and a production build. Browser checks with synthetic data verified product/email/rating/feedback/order/shipping error focus, server-error focus, paused completion and a disabled email action. The build needed permission to write generated `.next` files.

Automated coverage includes immediate delivery with unverified orders, database guards and redemption accounting, legacy approvals, explicit product/rating validation, missing email configuration, HTML/redirect/malformed responses, provider failures and idempotent retries.
