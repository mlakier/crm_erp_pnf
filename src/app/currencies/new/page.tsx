import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { buildConfiguredInlineSections } from '@/lib/detail-page-helpers'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import type { InlineRecordField } from '@/components/InlineRecordDetails'
import { loadCurrencyFormCustomization } from '@/lib/currency-form-customization-store'
import { CURRENCY_FORM_FIELDS, type CurrencyFormFieldKey } from '@/lib/currency-form-customization'
import { loadListOptionsForSource } from '@/lib/list-source'
import { prisma } from '@/lib/prisma'
import { generateNextCurrencyId } from '@/lib/currency-number'

const baseOptions = [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]
const CURRENCY_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity and presentation fields for the currency.',
  Settings: 'Rounding, status, and base-currency behavior.',
}

export default async function NewCurrencyPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const [inactiveOptions, nextCurrencyId, duplicateCurrency, formCustomization, formRequirements] = await Promise.all([
    loadListOptionsForSource({ sourceType: 'system', sourceKey: 'activeInactive' }),
    generateNextCurrencyId(),
    duplicateFrom
      ? prisma.currency.findUnique({ where: { id: duplicateFrom }, select: { code: true, name: true, symbol: true, decimals: true, isBase: true, active: true } })
      : Promise.resolve(null),
    loadCurrencyFormCustomization(),
    loadFormRequirements(),
  ])

  const initialValues = duplicateCurrency
    ? {
        code: `COPY-${duplicateCurrency.code}`.slice(0, 12),
        name: `Copy of ${duplicateCurrency.name}`,
        symbol: duplicateCurrency.symbol ?? '',
        decimals: String(duplicateCurrency.decimals),
        isBase: 'false',
        inactive: String(!duplicateCurrency.active),
      }
    : {
        code: '',
        name: '',
        symbol: '',
        decimals: '2',
        isBase: 'false',
        inactive: 'false',
      }

  const fieldDefinitions: Record<CurrencyFormFieldKey, InlineRecordField> = {
    currencyId: {
      name: 'currencyId',
      label: 'Currency ID',
      value: nextCurrencyId,
      helpText: 'System-generated currency master record identifier.',
      readOnly: true,
    },
    code: {
      name: 'code',
      label: 'Code',
      value: initialValues.code,
      helpText: 'ISO currency code or operating currency code, such as USD, CAD, or AUD.',
      required: formRequirements.currencyCreate.code,
    },
    name: {
      name: 'name',
      label: 'Name',
      value: initialValues.name,
      helpText: 'Display name for the currency.',
      required: formRequirements.currencyCreate.name,
    },
    symbol: {
      name: 'symbol',
      label: 'Symbol',
      value: initialValues.symbol,
      helpText: 'Printed symbol used on forms and reports.',
      required: formRequirements.currencyCreate.symbol,
    },
    decimals: {
      name: 'decimals',
      label: 'Decimal Places',
      value: initialValues.decimals,
      type: 'number',
      helpText: 'Number of decimal places used for amounts in this currency.',
      required: formRequirements.currencyCreate.decimals,
    },
    isBase: {
      name: 'isBase',
      label: 'Base Currency',
      value: initialValues.isBase,
      type: 'select',
      options: baseOptions,
      helpText: 'Marks whether this is the primary company currency.',
      sourceText: 'System values',
      required: formRequirements.currencyCreate.isBase,
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: initialValues.inactive,
      type: 'select',
      options: inactiveOptions,
      helpText: 'Marks the currency unavailable for new records while preserving history.',
      sourceText: 'Active/Inactive',
      required: formRequirements.currencyCreate.inactive,
    },
  }

  const sections = buildConfiguredInlineSections({
    fields: CURRENCY_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: CURRENCY_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="currencies"
      backHref="/currencies"
      backLabel="<- Back to Currencies"
      title="New Currency"
      detailsTitle="Currency details"
      formId="create-currency-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/currencies"
      successRedirectBasePath="/currencies"
    />
  )
}
