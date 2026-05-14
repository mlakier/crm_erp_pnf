import { prisma } from '@/lib/prisma'
import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadPriceBookFormCustomization } from '@/lib/price-book-form-customization-store'
import { PRICE_BOOK_FORM_FIELDS, type PriceBookFormFieldKey } from '@/lib/price-book-form-customization'
import { buildConfiguredInlineSections } from '@/lib/detail-page-helpers'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import type { InlineRecordField } from '@/components/InlineRecordDetails'

const PRICE_BOOK_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity and classification for this price book.',
  Scope: 'Subsidiary, currency, and child-entity availability.',
  'Pricing Governance': 'Price-level fallback, approval, and override controls.',
  'Effective Dating': 'When this price book is valid for new use.',
  Status: 'Availability and active-state controls.',
}

function dateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : ''
}

export default async function NewPriceBookPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const fieldMetaById = buildFieldMetaById(PRICE_BOOK_FORM_FIELDS)
  const [fieldOptions, formCustomization, formRequirements, duplicatePriceBook] = await Promise.all([
    loadFieldOptionsMap(fieldMetaById, [
      'bookType',
      'subsidiaryId',
      'includeChildren',
      'currencyId',
      'defaultPriceLevelId',
      'approvalRequired',
      'allowManualOverride',
      'inactive',
    ]),
    loadPriceBookFormCustomization(),
    loadFormRequirements(),
    duplicateFrom
      ? prisma.priceBook.findUnique({
          where: { id: duplicateFrom },
          select: {
            name: true,
            description: true,
            bookType: true,
            subsidiaryId: true,
            includeChildren: true,
            currencyId: true,
            defaultPriceLevelId: true,
            approvalRequired: true,
            approvalWorkflow: true,
            allowManualOverride: true,
            effectiveStartDate: true,
            effectiveEndDate: true,
          },
        })
      : Promise.resolve(null),
  ])

  const initialValues = duplicatePriceBook
    ? {
        name: `Copy of ${duplicatePriceBook.name}`,
        description: duplicatePriceBook.description ?? '',
        bookType: duplicatePriceBook.bookType ?? '',
        subsidiaryId: duplicatePriceBook.subsidiaryId ?? '',
        includeChildren: duplicatePriceBook.includeChildren ? 'true' : 'false',
        currencyId: duplicatePriceBook.currencyId ?? '',
        defaultPriceLevelId: duplicatePriceBook.defaultPriceLevelId ?? '',
        approvalRequired: duplicatePriceBook.approvalRequired ? 'true' : 'false',
        approvalWorkflow: duplicatePriceBook.approvalWorkflow ?? '',
        allowManualOverride: duplicatePriceBook.allowManualOverride ? 'true' : 'false',
        effectiveStartDate: dateInputValue(duplicatePriceBook.effectiveStartDate),
        effectiveEndDate: dateInputValue(duplicatePriceBook.effectiveEndDate),
      }
    : {
        name: '',
        description: '',
        bookType: '',
        subsidiaryId: '',
        includeChildren: 'false',
        currencyId: '',
        defaultPriceLevelId: '',
        approvalRequired: 'false',
        approvalWorkflow: '',
        allowManualOverride: 'true',
        effectiveStartDate: '',
        effectiveEndDate: '',
      }

  const priceBookRequirements = formRequirements.priceBookCreate ?? {}
  const fieldDefinitions: Record<PriceBookFormFieldKey, InlineRecordField> = {
    priceBookId: {
      name: 'priceBookId',
      label: 'Price Book ID',
      value: '',
      placeholder: 'Generated automatically',
      helpText: 'System-generated business identifier for the price book.',
      readOnly: true,
    },
    name: {
      name: 'name',
      label: 'Name',
      value: initialValues.name,
      helpText: 'Business-facing name for this price book.',
      required: priceBookRequirements.name ?? true,
    },
    description: {
      name: 'description',
      label: 'Description',
      value: initialValues.description,
      helpText: 'Short explanation of how and when this price book should be used.',
      required: priceBookRequirements.description ?? false,
    },
    bookType: {
      name: 'bookType',
      label: 'Book Type',
      value: initialValues.bookType,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.bookType ?? [])],
      helpText: 'Governed category such as standard, contracted, customer specific, regional, or promotional.',
      sourceText: getFieldSourceText(fieldMetaById, 'bookType'),
      required: priceBookRequirements.bookType ?? false,
    },
    subsidiaryId: {
      name: 'subsidiaryId',
      label: 'Subsidiary',
      value: initialValues.subsidiaryId,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.subsidiaryId ?? [])],
      helpText: 'Optional subsidiary scope for this price book.',
      sourceText: getFieldSourceText(fieldMetaById, 'subsidiaryId'),
      required: priceBookRequirements.subsidiaryId ?? false,
    },
    includeChildren: {
      name: 'includeChildren',
      label: 'Include Children',
      value: initialValues.includeChildren,
      type: 'select',
      options: fieldOptions.includeChildren ?? [],
      helpText: 'Allows child subsidiaries to use this price book when a parent subsidiary is selected.',
      sourceText: getFieldSourceText(fieldMetaById, 'includeChildren'),
      required: priceBookRequirements.includeChildren ?? false,
    },
    currencyId: {
      name: 'currencyId',
      label: 'Currency',
      value: initialValues.currencyId,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.currencyId ?? [])],
      helpText: 'Default transaction currency for this price book.',
      sourceText: getFieldSourceText(fieldMetaById, 'currencyId'),
      required: priceBookRequirements.currencyId ?? false,
    },
    defaultPriceLevelId: {
      name: 'defaultPriceLevelId',
      label: 'Default Price Level',
      value: initialValues.defaultPriceLevelId,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.defaultPriceLevelId ?? [])],
      helpText: 'Optional price level fallback used when customer-specific pricing does not override it.',
      sourceText: getFieldSourceText(fieldMetaById, 'defaultPriceLevelId'),
      required: priceBookRequirements.defaultPriceLevelId ?? false,
    },
    approvalRequired: {
      name: 'approvalRequired',
      label: 'Approval Required',
      value: initialValues.approvalRequired,
      type: 'select',
      options: fieldOptions.approvalRequired ?? [],
      helpText: 'Requires approval before this price book can be used on customer-facing transactions.',
      sourceText: getFieldSourceText(fieldMetaById, 'approvalRequired'),
      required: priceBookRequirements.approvalRequired ?? false,
    },
    approvalWorkflow: {
      name: 'approvalWorkflow',
      label: 'Approval Workflow',
      value: initialValues.approvalWorkflow,
      helpText: 'Optional workflow key or name used when approval is required.',
      required: priceBookRequirements.approvalWorkflow ?? false,
    },
    allowManualOverride: {
      name: 'allowManualOverride',
      label: 'Allow Manual Override',
      value: initialValues.allowManualOverride,
      type: 'select',
      options: fieldOptions.allowManualOverride ?? [],
      helpText: 'Allows authorized users to override the default pricing output.',
      sourceText: getFieldSourceText(fieldMetaById, 'allowManualOverride'),
      required: priceBookRequirements.allowManualOverride ?? false,
    },
    effectiveStartDate: {
      name: 'effectiveStartDate',
      label: 'Effective Start Date',
      value: initialValues.effectiveStartDate,
      type: 'date',
      helpText: 'First date this price book is valid.',
      required: priceBookRequirements.effectiveStartDate ?? false,
    },
    effectiveEndDate: {
      name: 'effectiveEndDate',
      label: 'Effective End Date',
      value: initialValues.effectiveEndDate,
      type: 'date',
      helpText: 'Last date this price book is valid, if applicable.',
      required: priceBookRequirements.effectiveEndDate ?? false,
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: 'false',
      type: 'select',
      options: fieldOptions.inactive ?? [],
      helpText: 'Marks the price book unavailable for new use while preserving history.',
      sourceText: getFieldSourceText(fieldMetaById, 'inactive'),
      required: priceBookRequirements.inactive ?? false,
    },
  }

  const sections = buildConfiguredInlineSections({
    fields: PRICE_BOOK_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: PRICE_BOOK_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="price-books"
      backHref="/price-books"
      backLabel="<- Back to Price Books"
      title="New Price Book"
      detailsTitle="Price book details"
      formId="create-price-book-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/price-books"
      successRedirectBasePath="/price-books"
    />
  )
}
