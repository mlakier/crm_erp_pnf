PO-style transaction scaffold memory for Purchase Requisitions (purchase-requisitions)

Goal: make Purchase Requisitions behave like Purchase Orders for + New, detail, edit detail, and customize layout.

Required files / edits:
1. prisma/schema.prisma: confirm Purchase Requisition header + line model fields, relations, indexes, and status/source columns needed for PO-style page parity.
2. src/lib/company-preferences-definitions.ts: add purchase-requisitions transaction Id setting if missing.
3. src/lib/purchase-requisitions-number.ts: generated transaction number helper using Company Prefs.
4. src/lib/purchase-requisitions-detail-customization.ts: define PurchaseRequisitionDetailFieldKey, PurchaseRequisitionDetailCustomizationConfig, PURCHASE_REQUISITION_DETAIL_FIELDS, line columns if applicable, default sections, rows, and formColumns.
5. src/lib/purchase-requisitions-detail-customization-store.ts: load/save/merge/normalize customization config.
6. src/app/api/config/purchase-requisitions-detail-customization/route.ts: GET/POST customization API.
7. src/components/PurchaseRequisitionDetailCustomizeMode.tsx: copy PO live section/grid customizer pattern, including section add/rename/reorder/delete, row counts, drag/drop field placement, visibility, required toggles, and line-column toggles if applicable.
   If the transaction has line items, the customize flow should support line-item column presentation controls where applicable:
   visibility, order, width, edit/view display, dropdown display, and dropdown sort.
   Non-lookup columns should not expose irrelevant controls.
   If the transaction has GL impact, include a separate GL impact customization block with visibility/order plus applicable view/display and width controls, but no dropdown-only settings.
8. src/components/PurchaseRequisitionCreatePageClient.tsx: PO-style full-page create shell using RecordDetailPageShell + TransactionHeaderSections equivalent.
9. src/components/PurchaseRequisitionPageActions.tsx: top-right action row with + menu, export, Customize, Edit, Delete, Save/Cancel in edit mode.
10. src/components/PurchaseRequisitionHeaderSections.tsx or reuse TransactionHeaderSections: sectioned/grid header rendering for view/edit/new.
11. src/components/PurchaseRequisitionCreateForm.tsx and/or line form sections: ensure create uses the same section/grid layout as edit.
12. src/app/purchase-requisitions/new/page.tsx: full page only, no modal. Must match edit layout and support duplicateFrom.
13. src/app/purchase-requisitions/[id]/page.tsx: regular detail, edit detail, customize mode; wire Customize button, + New/Duplicate menu, export, related sections, system info, system notes.
14. src/app/purchase-requisitions/page.tsx: list page should link first identifier column to detail page, not rely on modal edit as the primary experience.
15. src/app/api/purchase-requisitions/route.ts: CRUD plus activity logging and field-change system notes. Make sure create/update return all relations needed by detail page.
16. src/lib/form-requirements.ts: add purchaseRequisitionCreate defaults and labels so required toggles work in customize mode.
17. src/lib/list-source.ts and src/lib/managed-list-registry.ts: all list fields on Purchase Requisition must be backed by managed/reference/system sources; no hardcoded page-local arrays.
18. src/components/SystemNotesSection.tsx + load system info/notes helpers: add bottom sections exactly like PO/detail standard.
19. Related sections: copy PO standard for child/related docs as applicable to Procure to Pay flow (e.g. quotes->SOs->invoices for OTC, requisitions->POs->receipts/bills for PTP).
20. Export: wire PO-style detail export and list export behavior.
21. Verification: lint changed files, tsc, route smoke test, purchase-requisitions/new load, purchase-requisitions/[id]?edit=1 load, purchase-requisitions/[id]?customize=1 load.
   Verification should also confirm saved line-item and GL impact customization is reflected after reload in both detail view and `purchase-requisitions/[id]?edit=1`, with truncation and hover fallback still usable where values are shortened.
   Verification must also include an explicit backend field exposure inventory for header/lines/GL impact/footer as applicable:
   direct UI exposure, indirect footer exposure, derived substitutes, create/edit exposure, customize-only exposure, and intentional omissions with reasons.

PO pattern principles to preserve:
- + New is always a full page, never a modal.
- Detail regular mode shows top actions: + menu, export, Customize, Edit, Delete.
- Detail edit mode reached through `purchase-requisitions/[id]?edit=1` keeps the intended utility actions for existing records.
  `Edit` should swap to `Cancel`/`Save`, but actions like + menu, export, Customize, and Delete should not disappear unless there is a deliberate exception.
- Customize mode uses the same sections and grid cells as edit mode, not a separate simplified layout.
- If the transaction has a line-item section, Customize should expose line-item column settings rather than hardcoding the table presentation.
- If the transaction has GL impact, Customize should expose a separate GL impact column settings block rather than leaving GL impact presentation hardcoded.
- Fixed footer sections such as Related Documents, Communications, and System Notes should not appear in Customize unless they expose real admin-facing settings.
- Backend field exposure must be auditable field by field; do not assume a friendly label or derived value is sufficient without documenting which backend field it stands in for.
- If the list page uses status filters, place them at the top of the page.
- If `DB Id` is exposed on the list page, place it immediately before `Created` in the default column order.
- Edit mode and New mode share the same header sections and field placements.
- System Notes and System Info live at the bottom.
- If the transaction has lines, GL impact, or related docs, they sit in framed sections below the header area.
- When a page has multiple related-document families, the related-documents section should use tabs.
- Related-document tables should support live-searchable columns when large result sets are possible.
- Related-document tables should paginate once result counts exceed 10 rows, or earlier when the section is expected to be high-volume.
- Communications tables should support live-searchable columns and paginate once result counts exceed 10 rows.

Implementation notes:
- Prefer reusing RecordDetailPageShell, TransactionHeaderSections, PurchaseOrderDetailExportButton, and the journal transaction pattern where practical.
- Safe starter stubs may be generated, but existing files must never be overwritten.
