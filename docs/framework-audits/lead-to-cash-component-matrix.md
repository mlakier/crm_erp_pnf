# Lead to Cash Audit Component Matrix

Use this matrix before auditing a Lead to Cash page. Audit only the components that are applicable by design.

| Page | Header | Lines | GL Impact | Footer | Notes |
| --- | --- | --- | --- | --- | --- |
| Leads | Yes | No | No | Yes | Leads sit in the CRM / pre-sales part of the flow. Audit header and footer, but do not force transaction lines or GL Impact unless the product design changes. |
| Opportunities | Yes | Yes | No | Yes | Opportunities sit in the CRM / pre-sales part of the flow. They can still use the same line-item component pattern even though they are not downstream accounting pages. |
| Quotes | Yes | Yes | No | Yes | Quotes should use header, line-item, and footer audit blocks, but should not be audited or aligned toward GL Impact. |
| Sales Orders | Yes | Yes | No | Yes | Sales Orders should use header, line-item, and footer audit blocks, but should not be audited or aligned toward GL Impact. |
| Fulfillments | Yes | Yes | Yes | Yes | Fulfillments should be audited for all four component families. |
| Invoices | Yes | Yes | Yes | Yes | Invoices should be audited for all four component families. |
| Invoice Receipts | Yes | No | Yes | Yes | Invoice Receipts should use header, footer, and GL Impact audit blocks, but should not be audited toward a line-item section if the page has no transaction-line section by design. |

Audit guidance:
- Start by confirming the page's intended component set from this matrix.
- Only include `Line Section` and `Line Item Presentation & Customize` checks when `Lines` is `Yes`.
- Only include `GL Impact` section checks when `GL Impact` is `Yes`.
- Include `Footer` checks when the page is expected to carry related documents, communications, and system notes.
- If implementation drift causes a page to render a non-applicable section, flag that as a design-alignment issue instead of expanding the audit standard for that page.
