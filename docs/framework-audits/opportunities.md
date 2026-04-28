# Transaction Framework Audit: opportunities

Mode: audit-only
Updated: 2026-04-25

## Component Applicability

| Component | Applicable |
| --- | --- |
| Header | Yes |
| Lines | Yes |
| GL Impact | No |
| Footer | Yes |

## Checks

### Foundation
- [x] Detail page uses shared transaction detail framework (src\app\opportunities\[id]\page.tsx)
- [x] + New uses shared transaction create framework (src\app\opportunities\new\page.tsx)
- [x] + New matches detail-page edit mode visually and uses the same section/shared-header language instead of a thin form card (src\components\OpportunityCreatePageClient.tsx)
- [x] Customize component exists (src\components\OpportunityDetailCustomizeMode.tsx)
- [x] Customization lib exists (src\lib\opportunity-detail-customization.ts)
- [x] Customization store exists (src\lib\opportunity-detail-customization-store.ts)
- [x] Customization API route exists (src\app\api\config\opportunity-detail-customization\route.ts)
- [x] Customize flow uses shared transaction customize engine (src\components\OpportunityDetailCustomizeMode.tsx)
- [x] Detail page recognizes customize mode (src\app\opportunities\[id]\page.tsx)
- [x] Detail page recognizes edit mode (src\app\opportunities\[id]\page.tsx)
- [x] Detail page create menu enables duplicate (src\app\opportunities\[id]\page.tsx)
- [x] List page row edit action links to detail edit mode (src\app\opportunities\page.tsx)

### List Page
- [x] Status filters are positioned at the top of the list page (src\app\opportunities\page.tsx)
- [x] Backend list field exposure includes `DB Id` where operationally useful (src\app\opportunities\page.tsx)
- [x] `DB Id` appears immediately before `Created` in the default list column order (src\app\opportunities\page.tsx)

### Header Section
- [x] Detail page includes export action (src\app\opportunities\[id]\page.tsx)
- [x] Detail page supports linked stat card values where applicable (src\lib\transaction-page-configs\opportunity.ts)
- [x] Detail page supports colored stat card values where applicable (src\lib\transaction-page-configs\opportunity.ts)
- [x] Customize flow supports configurable stat cards when the page uses stats (src\components\OpportunityDetailCustomizeMode.tsx)
- [x] Detail page renders stat cards from the configured visible slots (src\app\opportunities\[id]\page.tsx)

### Line Section
- [x] Line section includes add-line capability where applicable (src\app\opportunities\[id]\page.tsx)
- [x] Add-line entry is integrated into the line section itself rather than rendered as a separate prepended form container (src\app\opportunities\[id]\page.tsx, src\components\TransactionLineItemsSection.tsx)

### Line Item Presentation & Customize
- [x] Customize flow exposes a line-item column customization block when the page has transaction lines (src\components\OpportunityDetailCustomizeMode.tsx)
- [x] Line-item customization supports visibility and order persistence where applicable (src\components\OpportunityDetailCustomizeMode.tsx)
- [x] Line-item customization supports applicable presentation controls such as width, edit/view display, dropdown display, and dropdown sort for lookup columns (src\components\OpportunityDetailCustomizeMode.tsx)
- [x] Non-lookup line columns do not expose irrelevant display or dropdown controls (src\components\OpportunityDetailCustomizeMode.tsx)
- [x] Saved line-item customization is reflected in both detail view and `[id]?edit=1` edit mode (src\app\opportunities\[id]\page.tsx, src\components\TransactionLineItemsSection.tsx)
- [x] Truncated line-item values still expose full value on hover (src\components\TransactionLineItemsSection.tsx)

### Footer Section
- [x] Detail page includes related documents section (src\app\opportunities\[id]\page.tsx)
- [x] Related documents / related record families are presented as tabs with color-coded families where multiple families exist (src\components\OpportunityRelatedDocumentsSection.tsx)
- [x] Related document tabs support live-searchable columns and pagination (src\components\OpportunityRelatedDocumentsSection.tsx)
- [x] Detail page includes communications section (src\app\opportunities\[id]\page.tsx)
- [x] Detail page wires send email in communications (src\app\opportunities\[id]\page.tsx)
- [x] Detail page includes system notes section (src\app\opportunities\[id]\page.tsx)
- [x] Fixed footer sections are hidden during customize mode because they do not expose admin-facing customization settings (src\components\TransactionDetailFrame.tsx)

### GL Impact Applicability
- [x] Opportunities do not render a GL impact section by design (src\app\opportunities\[id]\page.tsx)

## Residual Follow-Up

- None
