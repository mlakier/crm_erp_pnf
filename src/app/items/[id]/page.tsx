import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteButton from '@/components/DeleteButton'
import InlineRecordDetails, { type InlineRecordSection } from '@/components/InlineRecordDetails'
import ItemDetailCustomizeMode from '@/components/ItemDetailCustomizeMode'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import {
  RecordDetailCell,
  RecordDetailEmptyState,
  RecordDetailHeaderCell,
  RecordDetailSection,
} from '@/components/RecordDetailPanels'
import { loadListOptions } from '@/lib/list-options-store'
import { loadItemFormCustomization } from '@/lib/item-form-customization-store'
import { ITEM_FORM_FIELDS, type ItemFormFieldKey } from '@/lib/item-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'

export default async function ItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string; customize?: string }>
}) {
  const { id } = await params
  const { edit, customize } = await searchParams
  const isEditing = edit === '1'
  const isCustomizing = customize === '1'
  const [item, currencies, subsidiaries, glAccounts, revRecTemplates, listOptions, itemFormCustomization, formRequirements] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
      include: {
        currency: true,
        entity: true,
        defaultRevRecTemplate: true,
        incomeAccount: true,
        deferredRevenueAccount: true,
        inventoryAccount: true,
        cogsExpenseAccount: true,
        deferredCostAccount: true,
        purchaseOrderLineItems: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          include: { purchaseOrder: { select: { id: true, number: true, status: true, createdAt: true } } },
        },
      },
    }),
    prisma.currency.findMany({ orderBy: { currencyId: 'asc' }, select: { id: true, currencyId: true, name: true } }),
    prisma.entity.findMany({ orderBy: { subsidiaryId: 'asc' }, select: { id: true, subsidiaryId: true, name: true } }),
    prisma.chartOfAccounts.findMany({ where: { active: true }, orderBy: { accountId: 'asc' }, select: { id: true, accountId: true, name: true } }),
    prisma.revRecTemplate.findMany({ where: { active: true }, orderBy: { templateId: 'asc' }, select: { id: true, templateId: true, name: true } }),
    loadListOptions(),
    loadItemFormCustomization(),
    loadFormRequirements(),
  ])

  if (!item) notFound()

  const glOptions = glAccounts.map((account) => ({
    value: account.id,
    label: `${account.accountId} - ${account.name}`,
  }))
  const detailHref = `/items/${item.id}`
  const sectionDescriptions: Record<string, string> = {
    Core: 'The primary identity and commercial classification for the item.',
    'Pricing And Costing': 'Fields used for pricing, valuation, and margin analysis.',
    'Revenue Recognition': 'Defaults that drive revenue timing and performance-obligation behavior.',
    Accounting: 'Accounting defaults and posting behavior for this item.',
  }
  const itemFieldDefinitions: Record<ItemFormFieldKey, InlineRecordSection['fields'][number]> = {
    name: { name: 'name', label: 'Name', value: item.name, helpText: 'Primary user-facing item name shown on records and reports.' },
    itemId: { name: 'itemId', label: 'Item Id', value: item.itemId ?? '', helpText: 'Unique internal identifier used to reference this item across transactions, reports, and integrations.' },
    sku: { name: 'sku', label: 'SKU', value: item.sku ?? '', helpText: 'Stock keeping unit or commercial code used for ordering, stocking, and external product references.' },
    description: { name: 'description', label: 'Description', value: item.description ?? '', helpText: 'Longer description for operational context, purchasing, sales, or internal documentation.' },
    inactive: { name: 'inactive', label: 'Inactive', value: String(!item.active), type: 'select', options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }], helpText: 'Marks the item as unavailable for new use while preserving historical transactions and reporting.', sourceText: 'System status values' },
    itemType: {
      name: 'itemType',
      label: 'Type',
      value: item.itemType ?? '',
      type: 'select',
      placeholder: 'Select item type',
      options: listOptions.item.type.map((value) => ({ value, label: value })),
      helpText: 'High-level classification of the item, such as inventory, service, non-inventory, or other internal categories used by your process.',
      sourceText: 'Manage Lists -> Item Types',
    },
    uom: { name: 'uom', label: 'Unit of Measure', value: item.uom ?? '', helpText: 'Default selling or stocking unit used to interpret price, quantity, and cost values.' },
    listPrice: { name: 'listPrice', label: 'List Price', value: String(item.listPrice), type: 'number', helpText: 'Default sales price before discounts, allocations, or customer-specific pricing rules.' },
    revenueStream: { name: 'revenueStream', label: 'Revenue Stream', value: item.revenueStream ?? '', helpText: 'Business-facing revenue category used to group similar products or services for reporting and disclosure.' },
    recognitionMethod: {
      name: 'recognitionMethod',
      label: 'Recognition Method',
      value: item.recognitionMethod ?? '',
      type: 'select',
      options: [
        { value: 'point_in_time', label: 'Point in Time' },
        { value: 'over_time', label: 'Over Time' },
      ],
      helpText: 'Defines whether revenue is typically recognized at a single event or ratably over a service period.',
      sourceText: 'System recognition method values',
    },
    recognitionTrigger: { name: 'recognitionTrigger', label: 'Recognition Trigger', value: item.recognitionTrigger ?? '', helpText: 'Operational event that normally drives recognition, such as delivery, fulfillment, activation, or service completion.' },
    defaultRevRecTemplateId: {
      name: 'defaultRevRecTemplateId',
      label: 'Rev Rec Template',
      value: item.defaultRevRecTemplateId ?? '',
      type: 'select',
      placeholder: 'Select rev rec template',
      options: revRecTemplates.map((template) => ({ value: template.id, label: `${template.templateId} - ${template.name}` })),
      helpText: 'Default scheduling template used to generate revenue recognition timing for this item.',
      sourceText: 'Revenue Recognition Templates',
    },
    defaultTermMonths: { name: 'defaultTermMonths', label: 'Default Term Months', value: item.defaultTermMonths != null ? String(item.defaultTermMonths) : '', type: 'number', helpText: 'Default contract or service term used when generating schedules for recurring or time-based revenue.' },
    standaloneSellingPrice: { name: 'standaloneSellingPrice', label: 'Standalone Selling Price', value: item.standaloneSellingPrice != null ? String(item.standaloneSellingPrice) : '', type: 'number', helpText: 'Estimated standalone selling price used for revenue allocation when this item is sold in a bundle.' },
    billingType: { name: 'billingType', label: 'Billing Type', value: item.billingType ?? '', helpText: 'How this item is normally billed, such as one-time, recurring, milestone, or usage-based.' },
    standardCost: { name: 'standardCost', label: 'Standard Cost', value: item.standardCost != null ? String(item.standardCost) : '', type: 'number', helpText: 'Planned or budgeted cost used for variance analysis and margin reporting.' },
    averageCost: { name: 'averageCost', label: 'Average Cost', value: item.averageCost != null ? String(item.averageCost) : '', type: 'number', helpText: 'Blended cost basis used for operational reporting or inventory valuation where average costing applies.' },
    entityId: { name: 'entityId', label: 'Subsidiary', value: item.entityId ?? '', type: 'select', placeholder: 'Select subsidiary', options: subsidiaries.map((subsidiary) => ({ value: subsidiary.id, label: `${subsidiary.subsidiaryId} - ${subsidiary.name}` })), helpText: 'Default legal entity or subsidiary context used for this item when transactions do not provide an override.', sourceText: 'Subsidiaries master data' },
    currencyId: { name: 'currencyId', label: 'Currency', value: item.currencyId ?? '', type: 'select', placeholder: 'Select currency', options: currencies.map((currency) => ({ value: currency.id, label: `${currency.currencyId} - ${currency.name}` })), helpText: 'Default currency for pricing and item-level monetary values.', sourceText: 'Currencies master data' },
    incomeAccountId: { name: 'incomeAccountId', label: 'Income Account', value: item.incomeAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions, helpText: 'Primary revenue account credited when this item generates recognized revenue.', sourceText: 'Chart of Accounts' },
    deferredRevenueAccountId: { name: 'deferredRevenueAccountId', label: 'Deferred Revenue Account', value: item.deferredRevenueAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions, helpText: 'Liability account used when billed amounts must be deferred before revenue is recognized.', sourceText: 'Chart of Accounts', disabledWhen: { fieldName: 'directRevenuePosting', equals: 'true' }, disabledReason: 'Disabled because Direct Revenue Posting is enabled.' },
    inventoryAccountId: { name: 'inventoryAccountId', label: 'Inventory Account', value: item.inventoryAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions, helpText: 'Balance sheet asset account that carries on-hand inventory value for this item.', sourceText: 'Chart of Accounts' },
    cogsExpenseAccountId: { name: 'cogsExpenseAccountId', label: 'COGS / Expense Account', value: item.cogsExpenseAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions, helpText: 'Expense account used when the item cost is relieved to cost of goods sold or operating expense.', sourceText: 'Chart of Accounts' },
    deferredCostAccountId: { name: 'deferredCostAccountId', label: 'Deferred Cost Account', value: item.deferredCostAccountId ?? '', type: 'select', placeholder: 'Select GL account', options: glOptions, helpText: 'Asset account used to temporarily hold capitalized or deferred fulfillment costs before amortization.', sourceText: 'Chart of Accounts', disabledWhen: { fieldName: 'directRevenuePosting', equals: 'true' }, disabledReason: 'Disabled because Direct Revenue Posting is enabled.' },
    directRevenuePosting: { name: 'directRevenuePosting', label: 'Direct Revenue Posting', value: String(item.directRevenuePosting), type: 'checkbox', placeholder: 'Direct Revenue Posting', helpText: 'If enabled, revenue can post directly at billing or fulfillment instead of first routing through deferred revenue logic.' },
  }
  const customizeFields = ITEM_FORM_FIELDS.map((field) => ({
    id: field.id,
    label: itemFieldDefinitions[field.id].label,
    fieldType: field.fieldType,
    source: field.source,
    description: field.description,
    previewValue: itemFieldDefinitions[field.id].type === 'checkbox'
      ? (itemFieldDefinitions[field.id].value === 'true' ? 'Yes' : 'No')
      : itemFieldDefinitions[field.id].options?.find((option) => option.value === itemFieldDefinitions[field.id].value)?.label
        ?? itemFieldDefinitions[field.id].value
        ?? '',
  }))
  const detailSections: InlineRecordSection[] = itemFormCustomization.sections
    .map((sectionTitle) => {
      const configuredFields = ITEM_FORM_FIELDS
        .filter((field) => {
          const config = itemFormCustomization.fields[field.id]
          return config.visible && config.section === sectionTitle
        })
        .sort((a, b) => itemFormCustomization.fields[a.id].order - itemFormCustomization.fields[b.id].order)
        .map((field) => ({
          ...itemFieldDefinitions[field.id],
          column: itemFormCustomization.fields[field.id].column,
          order: itemFormCustomization.fields[field.id].order,
        }))

      const fields = configuredFields

      if (fields.length === 0) return null

      return {
        title: sectionTitle,
        description: sectionDescriptions[sectionTitle],
        collapsible: true,
        defaultExpanded: true,
        fields,
      }
    })
    .filter((section): section is InlineRecordSection => Boolean(section))

  return (
    <RecordDetailPageShell
      backHref={isCustomizing ? detailHref : '/items'}
      backLabel={isCustomizing ? '<- Back to Item Detail' : '<- Back to Items'}
      meta={item.itemId ?? 'No Item Id'}
      title={item.name}
      badge={
        item.itemType ? (
          <span
            className="inline-block rounded-full px-3 py-0.5 text-sm capitalize"
            style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}
          >
            {item.itemType}
          </span>
        ) : null
      }
      actions={
        <>
          {!isEditing && !isCustomizing ? (
            <Link
              href={`${detailHref}?customize=1`}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
            >
              Customize
            </Link>
          ) : null}
          {!isEditing && !isCustomizing ? (
            <Link
              href={`${detailHref}?edit=1`}
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: 'var(--accent-primary-strong)' }}
            >
              Edit
            </Link>
          ) : null}
          {!isCustomizing ? <DeleteButton resource="items" id={item.id} /> : null}
        </>
      }
    >
        {isCustomizing ? (
          <ItemDetailCustomizeMode
            detailHref={detailHref}
            initialLayout={itemFormCustomization}
            initialRequirements={{ ...formRequirements.itemCreate }}
            fields={customizeFields}
            sectionDescriptions={sectionDescriptions}
          />
        ) : (
          <InlineRecordDetails
            resource="items"
            id={item.id}
            title="Item details"
            sections={detailSections}
            editing={isEditing}
            columns={itemFormCustomization.formColumns}
          />
        )}

        <RecordDetailSection title="Purchase Order Lines" count={item.purchaseOrderLineItems.length}>
          {item.purchaseOrderLineItems.length === 0 ? (
            <RecordDetailEmptyState message="No purchase order lines for this item" />
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <RecordDetailHeaderCell>PO #</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Status</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Qty</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Unit Price</RecordDetailHeaderCell>
                  <RecordDetailHeaderCell>Date</RecordDetailHeaderCell>
                </tr>
              </thead>
              <tbody>
                {item.purchaseOrderLineItems.map((line) => (
                  <tr key={line.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <RecordDetailCell>
                      <Link href={`/purchase-orders/${line.purchaseOrder.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {line.purchaseOrder.number}
                      </Link>
                    </RecordDetailCell>
                    <RecordDetailCell>{line.purchaseOrder.status}</RecordDetailCell>
                    <RecordDetailCell>{line.quantity}</RecordDetailCell>
                    <RecordDetailCell>{line.unitPrice.toFixed(2)}</RecordDetailCell>
                    <RecordDetailCell>{new Date(line.purchaseOrder.createdAt).toLocaleDateString()}</RecordDetailCell>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordDetailSection>
    </RecordDetailPageShell>
  )
}
