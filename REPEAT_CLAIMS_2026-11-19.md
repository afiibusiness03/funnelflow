# Allow repeat claims by email

The prior duplicate-claim trigger rejected any second claim with the same email in one campaign, regardless of claim status. Pausing email delivery did not change this rule.

## New behavior

- The same email can submit another claim in the same campaign, including after an earlier Approved, Delivered, Pending or Rejected claim.
- If no order number is supplied, email reuse is allowed. Empty/whitespace order numbers become null.
- Different order numbers are accepted for the same email.
- Reusing the same non-empty order number in one campaign is rejected, even with another email. The API message now refers only to the order.
- Email normalization, rate limits, tenant checks, reward limits and the email pause remain active. Existing records are not deleted or updated.

## Apply to production

1. Run `supabase/migrations/20261119_allow_repeat_claim_emails.sql` in Supabase SQL Editor. This is the essential change: a code push alone cannot remove the existing database email check. It requires the existing November 9 security migration; do not rerun the older migration.
2. Commit and push the updated code for the matching error message and customer-facing terms.
3. Submit again using the same email, with no order number if the campaign permits it, or a new order number. The existing claim does not need to be deleted.

The migration can be rerun and does not enable Resend. It has been exercised locally against the full migration chain; no production SQL or customer submissions were executed by the assistant.

Validation: all 54 tests passed, including repeated emails with no order, different orders, normalized email/order input, duplicate orders and campaign scoping. Lint and TypeScript passed.
