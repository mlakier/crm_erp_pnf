# Transaction Framework Audit: leads

Mode: audit-only
Updated: 2026-04-25

## Component Applicability

| Component | Applicable |
| --- | --- |
| Header | Yes |
| Lines | No |
| GL Impact | No |
| Footer | Yes |

## Checks

### Foundation
- [x] Detail page uses shared detail framework (src\app\leads\[id]\page.tsx)
- [x] + New uses shared create framework (src\app\leads\new\page.tsx)
- [x] + New uses the same sectioned `Lead Details` presentation language as detail edit mode instead of a thin standalone form card (src\components\LeadCreatePageClient.tsx)
- [x] Customize component exists (src\components\LeadDetailCustomizeMode.tsx)
- [x] Customization lib exists (src\lib\lead-detail-customization.ts)
- [x] Customization store exists (src\lib\lead-detail-customization-store.ts)
- [x] Customization API route exists (src\app\api\config\lead-detail-customization\route.ts)
- [x] Customize flow uses shared transaction customize engine (src\components\LeadDetailCustomizeMode.tsx)
- [x] Detail page recognizes customize mode (src\app\leads\[id]\page.tsx)
- [x] Detail page recognizes edit mode (src\app\leads\[id]\page.tsx)
- [x] Detail page create menu enables duplicate where applicable (src\app\leads\[id]\page.tsx)
- [x] List page row edit action links to detail edit mode instead of only opening a modal edit flow (src\app\leads\page.tsx)

### List Page
- [x] Status filters are positioned at the top of the list page (src\app\leads\page.tsx)
- [x] Backend list field exposure includes `DB Id` where operationally useful (src\app\leads\page.tsx)
- [x] `DB Id` appears immediately before `Created` in the default list column order (src\app\leads\page.tsx)

### Header Section
- [x] Detail page includes export action (src\app\leads\[id]\page.tsx)
- [x] Detail page supports linked stat card values where applicable (src\lib\transaction-page-configs\lead.ts)
- [x] Detail page supports colored stat card values where applicable (src\lib\transaction-page-configs\lead.ts)
- [x] Customize flow supports configurable stat cards when the page uses stats (src\components\LeadDetailCustomizeMode.tsx)
- [x] Detail page renders stat cards from configured visible slots where the page adopts the shared framework (src\app\leads\[id]\page.tsx)
- [x] Lead detail uses one top-level `Lead Details` container with customizable sections inside it (src\app\leads\[id]\page.tsx)
- [x] Header sections render without non-configurable nested subsection chrome in normal detail view (src\components\TransactionHeaderSections.tsx)
- [x] Backend field exposure is explicitly categorized for derived header fields such as `userId` -> `Created By` (src\app\leads\[id]\page.tsx, src\components\LeadCreatePageClient.tsx)

### Line Section Applicability
- [x] Leads do not have a transaction line-items section by design; do not apply line-item audit or customization checks unless the product design changes

### Footer Section
- [x] Detail page includes related documents or related-records section using the intended shared footer pattern (src\app\leads\[id]\page.tsx)
- [x] Related records use a tabbed presentation rather than a mixed table (src\components\LeadRelatedRecordsSection.tsx)
- [x] Backend relation fields such as `customerId`, `contactId`, and `opportunityId` are treated as intentional indirect footer exposure rather than silent header omissions (src\app\leads\[id]\page.tsx, src\components\LeadRelatedRecordsSection.tsx)
- [x] Detail page includes communications section (src\app\leads\[id]\page.tsx)
- [x] Detail page wires send email in communications where applicable (src\app\leads\[id]\page.tsx, src\app\api\leads\route.ts)
- [x] Detail page includes system notes section (src\app\leads\[id]\page.tsx)
- [x] Fixed footer sections are hidden during customize mode because they do not expose admin-facing customization settings (src\components\TransactionDetailFrame.tsx)

### GL Impact Applicability
- [x] Leads should not render a GL impact section by design; if one appears, treat it as design drift rather than a required audit target

## Residual Follow-Up

- None
