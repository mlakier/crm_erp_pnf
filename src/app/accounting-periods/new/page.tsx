import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import type { InlineRecordField } from '@/components/InlineRecordDetails'
import { buildConfiguredInlineSections } from '@/lib/detail-page-helpers'
import { loadAccountingPeriodFormCustomization } from '@/lib/accounting-period-form-customization-store'
import { ACCOUNTING_PERIOD_FORM_FIELDS, type AccountingPeriodFormFieldKey } from '@/lib/accounting-period-form-customization'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadListOptionsForSource } from '@/lib/list-source'
import { prisma } from '@/lib/prisma'

const ACCOUNTING_PERIOD_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary period identity, dates, and scope.',
  Controls: 'Period-close and subledger control settings.',
}

export default async function NewAccountingPeriodPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const [subsidiaryOptions, statusOptions, duplicatePeriod, customization, formRequirements] = await Promise.all([
    loadListOptionsForSource({ sourceType: 'reference', sourceKey: 'subsidiaries' }),
    loadListOptionsForSource({ sourceType: 'managed-list', sourceKey: 'LIST-ACCOUNTING-PERIOD-STATUS' }).then((options) =>
      options.map((option) => ({ value: option.value.toLowerCase(), label: option.label }))
    ),
    duplicateFrom
      ? prisma.accountingPeriod.findUnique({
          where: { id: duplicateFrom },
          select: {
            name: true,
            startDate: true,
            endDate: true,
            subsidiaryId: true,
            status: true,
            closed: true,
            arLocked: true,
            apLocked: true,
            inventoryLocked: true,
          },
        })
      : Promise.resolve(null),
    loadAccountingPeriodFormCustomization(),
    loadFormRequirements(),
  ])

  const initialValues = duplicatePeriod
    ? {
        name: `Copy of ${duplicatePeriod.name}`,
        startDate: duplicatePeriod.startDate.toISOString().slice(0, 10),
        endDate: duplicatePeriod.endDate.toISOString().slice(0, 10),
        subsidiaryId: duplicatePeriod.subsidiaryId ?? '',
        status: duplicatePeriod.status,
        closed: String(duplicatePeriod.closed),
        arLocked: String(duplicatePeriod.arLocked),
        apLocked: String(duplicatePeriod.apLocked),
        inventoryLocked: String(duplicatePeriod.inventoryLocked),
      }
    : {
        name: '',
        startDate: '',
        endDate: '',
        subsidiaryId: '',
        status: statusOptions[0]?.value ?? 'open',
        closed: 'false',
        arLocked: 'false',
        apLocked: 'false',
        inventoryLocked: 'false',
      }

  const fieldDefinitions: Record<AccountingPeriodFormFieldKey, InlineRecordField> = {
    name: {
      name: 'name',
      label: 'Name',
      value: initialValues.name,
      helpText: 'Display name for the accounting period.',
      required: formRequirements.accountingPeriodCreate.name,
    },
    startDate: {
      name: 'startDate',
      label: 'Start Date',
      value: initialValues.startDate,
      type: 'date',
      helpText: 'First date included in the accounting period.',
      required: formRequirements.accountingPeriodCreate.startDate,
    },
    endDate: {
      name: 'endDate',
      label: 'End Date',
      value: initialValues.endDate,
      type: 'date',
      helpText: 'Last date included in the accounting period.',
      required: formRequirements.accountingPeriodCreate.endDate,
    },
    subsidiaryId: {
      name: 'subsidiaryId',
      label: 'Subsidiary',
      value: initialValues.subsidiaryId,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...subsidiaryOptions],
      helpText: 'Optional subsidiary scope for the accounting period.',
      sourceText: 'Subsidiaries',
      required: formRequirements.accountingPeriodCreate.subsidiaryId,
    },
    status: {
      name: 'status',
      label: 'Status',
      value: initialValues.status,
      type: 'select',
      options: statusOptions,
      helpText: 'Operational status of the period.',
      sourceText: 'Accounting period status list',
      required: formRequirements.accountingPeriodCreate.status,
    },
    closed: {
      name: 'closed',
      label: 'Closed',
      value: initialValues.closed,
      type: 'checkbox',
      helpText: 'Marks the period closed for posting.',
    },
    arLocked: {
      name: 'arLocked',
      label: 'AR Locked',
      value: initialValues.arLocked,
      type: 'checkbox',
      helpText: 'Prevents new AR activity in the period.',
    },
    apLocked: {
      name: 'apLocked',
      label: 'AP Locked',
      value: initialValues.apLocked,
      type: 'checkbox',
      helpText: 'Prevents new AP activity in the period.',
    },
    inventoryLocked: {
      name: 'inventoryLocked',
      label: 'Inventory Locked',
      value: initialValues.inventoryLocked,
      type: 'checkbox',
      helpText: 'Prevents inventory postings in the period.',
    },
  }

  const sections = buildConfiguredInlineSections({
    fields: ACCOUNTING_PERIOD_FORM_FIELDS,
    layout: customization,
    fieldDefinitions,
    sectionDescriptions: ACCOUNTING_PERIOD_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="accounting-periods"
      backHref="/accounting-periods"
      backLabel="<- Back to Accounting Periods"
      title="New Accounting Period"
      detailsTitle="Accounting period details"
      formId="create-accounting-period-inline-form"
      sections={sections}
      formColumns={customization.formColumns}
      createEndpoint="/api/accounting-periods"
      successRedirectBasePath="/accounting-periods"
    />
  )
}
