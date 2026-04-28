# Page Framework Checklist

Use this checklist for both:
- reworking an existing page onto the shared framework
- creating a new page from the shared framework

## 1. Shared Framework First
- Use the shared master-data framework or shared transaction framework first.
- Add page-specific behavior as thin configuration or targeted add-ons.
- Avoid introducing page-local layout/action patterns when the shared layer can own them.

## 2. Backend Schema Audit
- Review the full backend table/model before marking the page complete.
- Compare the schema against:
  - list page columns
  - detail page fields
  - create/edit inputs
  - customize layout availability
- Build an explicit backend field inventory for the page and record, for every backend field, whether it is:
  - shown directly in UI
  - shown indirectly through a related/footer surface
  - represented by a derived substitute value
  - editable on create/edit
  - available through customize but hidden by default
  - intentionally omitted with a reason

## 3. UI Field Coverage Gate
- Every backend field must be categorized as one of:
  - exposed on list page
  - exposed on detail page
  - editable on create/edit
  - available in customize layout
  - intentionally omitted with a reason
- Do not treat a derived display value as equivalent to backend field exposure unless the audit explicitly documents that substitution.
- Explicitly review raw identifiers, foreign keys, owner/creator fields, timestamps, and source links so they are not silently hidden behind labels.

## 4. List Page Coverage
- Review important operational/system fields for list visibility, especially:
  - record id / transaction number
  - linked ids
  - status
  - subsidiary
  - currency
  - created
  - last modified
  - db id where useful
- If the page uses status filters, they should be positioned at the top of the list page rather than lower in the page chrome.
- After confirming backend field exposure on the list page, place `DB Id` immediately before `Created` in the default column sequence when `DB Id` is surfaced.
- If a list has more than 10 value columns, default the page to the top 10 highest-value columns and make the rest optional through column selection.

## 5. Detail Page Coverage
- Expose all relevant backend fields on the detail page, either directly or as derived display values.
- Group them into meaningful sections/subsections rather than one long field block.
- Before auditing a transaction flow, confirm which component families are actually applicable to the page:
  - Header
  - Lines
  - GL Impact
  - Footer
- Review the page in sections:
  - Header section
  - Line section
  - Footer / related sections
- If the transaction has line items, the line section must support adding lines in the appropriate create/edit flow.
- If the transaction has line items, add-line entry should be integrated into the line section pattern itself. A separate prepended "Add Line" form container above the line table fails the audit unless there is an explicit product exception.

## 6. Create/Edit Coverage
- Confirm which fields are:
  - editable
  - read-only/derived
  - system-managed
- `+ New` should match detail-page edit mode visually unless there is a deliberate exception.
- If `+ New` opens a modal on a framework page, the audit fails.
- If a list row `Edit` action links to `[id]?edit=1`, verify the detail page action bar in edit mode still includes the intended utility buttons for existing records.
  Keep parity where expected for actions like `+`, export, Customize, and Delete, with `Edit` replaced by `Cancel`/`Save`.
- A thin form-in-a-card create page does not pass this gate; treat it as an explicit audit failure until the page uses the same section and shared-header language as detail edit mode.

## 7. Customize Coverage
- Confirm all intended detail-page fields are available to the customize layout engine.
- Confirm line-column customization and stat-card customization are wired where applicable.
- Do not surface fixed footer sections such as Related Documents, Communications, or System Notes in Customize unless there are real admin-facing settings for them.
- If the page has a line-item section, confirm Customize supports:
  - line-column visibility and order
  - applicable line-column presentation controls such as width, edit/view display, dropdown display, and dropdown sort
  - disabled or dimmed controls for non-applicable non-lookup columns
  - save/reload persistence in both detail view and `?edit=1` edit mode
  - truncation plus full-value hover fallback where values are shortened
- If the page has a GL impact section, confirm Customize supports a separate GL impact column block with:
  - visibility and order
  - applicable view/display and width controls
  - section-level presentation controls such as font size where supported
  - no dropdown-only controls on view-only GL impact columns

## 8. Footer Coverage
- Transaction pages should use the shared related-documents and communications patterns.
- Footer coverage should explicitly review:
  - related documents
  - communications
  - system notes / system info
- Footer audit should confirm those sections exist where applicable and are not silently dropped from otherwise rich transaction pages.
- Related documents should use a scalable tabbed pattern when multiple related-record families are present.
- Related-document tables should support live-searchable columns when record volumes can become large.
- Related-document tables should paginate once result counts exceed 10 rows, or earlier when the section is expected to be operationally high-volume.
- Communications tables should support live-searchable columns.
- Communications tables should paginate once result counts exceed 10 rows.
- Prefer shared payload builders/helpers instead of page-local mapping logic.
- Detail pages should be rich by default. If a transaction truly should not have stats, related docs, communications, system notes, or line items, document the exception explicitly instead of silently shipping a thin page.

## 9. Validation
- Run lint and typecheck before handing off.
- Sanity-check that shared changes do not break sibling pages.
