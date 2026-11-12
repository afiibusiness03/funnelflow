# Dashboard mobile review — 13 November 2026

## Result and deployment status

Responsive dashboard fixes are complete locally and ready for review, commit and push. This change does not require SQL or environment variables. No Supabase keep-alive job was added, as requested.

The **previous push**, commit `33a8871fb135dc8c2f2d4e2768f3ac237a450cf7`, had a successful Vercel deployment status. [Vercel deployment](https://vercel.com/funnelflow1/funnelflow/CuyE8hySLr972TVdFcfUK2ywejPJ). This is separate from the mobile changes in this report, which have not been pushed or deployed.

Read-only production checks performed for that deployment: homepage and login returned 200; anonymous product API access returned 401; the legacy billing activation GET redirected to the success page without activating anything. The deployed dashboard required sign-in in the browser available to this review.

## Problems corrected

| Area | Change |
| --- | --- |
| Dashboard shell | The fixed-width sidebar no longer takes space on phones/tablets. Below 1024px, a menu button opens a drawer with backdrop, focus trapping, Escape dismissal and focus restoration. Desktop collapse remains available. Resizing to desktop closes the drawer and releases its scroll lock. |
| Scrolling | Uses dynamic viewport height, shrinkable content containers and one main scrolling pane. Positioned hidden inputs remain inside that pane instead of creating an extra document scrollbar. Route changes return the content to the top. |
| Header | Compact mobile title, accessible creation shortcut and larger touch targets. Descriptions and placeholder search/notification controls remain on wider screens. |
| Claims | Wrapping filter controls, stacked mobile rows, visible action labels, keyboard-accessible details toggle and readable long order/address/feedback values. |
| Products and promotions | Responsive form columns, wrapping card actions and badges, larger icon targets, long coupon codes contained within cards. |
| Campaigns | Product selection no longer crushes the product name between badges and buttons. Mobile selection uses the checkbox without a redundant badge. Wizard steps scroll into view. Dialogs have bounded viewport height and internal scrolling, including landscape. |
| Settings, billing and integrations | Headers, banners, account values and action groups wrap or stack appropriately. |
| Statistics, charts and QR | Shrinkable chart containers, responsive card padding, wrapping large values and properly sized QR/link controls. |
| Light theme | Fixed an existing sidebar selector conflict that produced white text on a white background. Improved status text contrast on light dashboard cards. |
| Forms and keyboard use | Dashboard fields use 16px text on small screens to avoid the usual iOS focus zoom; visible focus outlines added. Actual iOS device behavior was not tested. |

Main implementation: [DashboardShell.tsx](D:/Zyrra/funnelflow/src/components/dashboard/DashboardShell.tsx), [Sidebar.tsx](D:/Zyrra/funnelflow/src/components/dashboard/Sidebar.tsx), [Header.tsx](D:/Zyrra/funnelflow/src/components/dashboard/Header.tsx), [dashboard layout](D:/Zyrra/funnelflow/src/app/dashboard/layout.tsx), [dashboard styles](D:/Zyrra/funnelflow/src/app/globals.css), plus the affected dashboard pages and shared cards/forms.

## Verification

- **102 viewport checks:** 17 routes at widths **320, 375, 390, 768, 1024 and 1280px**. No horizontal document/content overflow or extra document-height scrollbar in the tested populated states.
- Routes: dashboard; campaigns list/new/edit/analytics; products list/new/edit; promotions list/new/edit; claims; analytics; integrations; settings; billing; team.
- Interactive checks: mobile drawer open/close, Escape and focus return, Tab/Shift+Tab focus trapping, navigation close, resize to desktop, desktop collapse, expanded claim details, product picker selection, all four campaign wizard steps and scroll reset.
- Landscape dialog check at **667 × 375**: panel stayed within the viewport and its taller contents scrolled internally; Cancel remained reachable.
- Reviewed mobile light/dark dashboard screenshots and light drawer contrast.
- `npm run lint`: passed.
- `npm run typecheck`: passed during verification; final production build also passed its TypeScript check.
- `npm run build`: passed, including generation of 42 static pages.
- `npm test`: **35 passed, 0 failed**, including the existing tenant isolation, authorization, webhook and reward regression tests.
- `git diff --check`: passed; Git only reported its normal LF/CRLF conversion notice.

## Method and limitations

Visual verification used the real application components and page markup in an isolated localhost fixture. Next navigation, authentication, database responses and APIs were replaced **only in that external test bundle** with synthetic data. The fixture contained no production credentials; HTTP writes were rejected, and production authentication was not changed or bypassed. Long names, email addresses, order IDs and coupon codes were included to expose layout problems.

The fixture is outside the application source tree and cannot be included in the Next.js deployment. It tests layout and client interactions; it is not a substitute for a final signed-in production check after publishing. It also does not cover every possible customer data combination, physical phone or mobile browser.

No new polling or database work was introduced by these UI changes. Vercel CPU/Usage telemetry was not available, so no numerical CPU or billing reduction is claimed.

Local evidence: [viewport results](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/mobile-qa/layout-checks.json), [mobile dashboard](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/mobile-qa/dashboard-390.jpg), [mobile drawer](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/mobile-qa/navigation-390.jpg).

## Publishing

Commit and push the mobile fixes, including the new `DashboardShell.tsx` file. No additional SQL migration is needed. After Vercel finishes that new deployment, check a signed-in account on a phone: open navigation, visit claims, create/edit forms, and open a campaign product dialog. The deployment success cited above confirms the earlier security/performance push only.
