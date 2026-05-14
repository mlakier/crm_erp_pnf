# Transaction Page Contract

This contract applies to transaction-style list, detail, edit, create, and customize pages.

## List Page

- Use the global app shell and shared navigation.
- Use the standard transaction list header with title, count, description, and primary create action.
- Use status filter pills when the record has lifecycle states.
- Use shared search and column filter controls.
- Use `ExportButton`.
- Use `ColumnSelector`.
- Use `RecordListHeaderLabel` for column labels and help icons.
- Use `PaginationFooter`.
- Each row must expose the shared row action/link pattern: primary record link, `View`, `Edit`, and `Delete` where allowed by status and accounting rules.

## Detail Page

- Use `RecordDetailPageShell` for back link, meta, title, badge, and action area.
- Use `RecordDetailActionBar` for `+`, `Export`, `Customize`, `Edit`, `Delete`, and any page-specific actions.
- Use `TransactionDetailFrame` as the detail layout wrapper.
- Use `TransactionStatsRow` for top stat cards.
- Use `RecordHeaderDetails` for field-grid sections.
- Always include `4-Currency Context` before the transaction details.
- Always include `Reference Details` before the transaction details.
- Include the page-specific detail section after `4-Currency Context` and `Reference Details`.
- Use `TransactionGlImpactSection` for GL impact preview or posted GL impact.
- Use `RecordDetailSection` for related records, communications, system notes, and other supporting panels.

## Customize Mode

- If `Customize` is shown, it must be wired. Decorative customize links are not allowed.
- Customize mode must open from `?customize=1` or an equivalent route-level mode.
- Customize mode must use `RecordDetailCustomizeMode` or a transaction-specific wrapper around it.
- Saved customization must be consumed by the rendered detail page, not only saved to config.
- Stat cards must honor saved `statCards` visibility, order, size, link, and color settings.
- Every stat metric offered in customize mode must have a matching `TransactionStatsRow` stat definition on the rendered page. A checked stat card must never disappear because of an id/metric mismatch.
- Header/detail field sections must honor saved field visibility, section, row, and column placement.
- GL impact columns must honor saved visibility, order, and width settings.
- Line tables must honor saved visibility, order, width, display, and required/locked settings.
- Reference detail layouts must honor saved reference source, field visibility, and placement.
