import { prisma } from '@/lib/prisma'
import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { loadPriceLevelFormCustomization } from '@/lib/price-level-form-customization-store'
import { PRICE_LEVEL_FORM_FIELDS, type PriceLevelFormFieldKey } from '@/lib/price-level-form-customization'
import { buildConfiguredInlineSections } from '@/lib/detail-page-helpers'
import { buildFieldMetaById, getFieldSourceText, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import type { InlineRecordField } from '@/components/InlineRecordDetails'

const PRICE_LEVEL_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary identity and classification for this price level.',
  Scope: 'Subsidiary availability and child-entity usage.',
  'Pricing Governance': 'Discount, margin, approval, and override controls.',
  'Effective Dating': 'When this price level is valid for new use.',
  Status: 'Availability and active-state controls.',
}

function dateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : ''
}

export default async function NewPriceLevelPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const fieldMetaById = buildFieldMetaById(PRICE_LEVEL_FORM_FIELDS)
  const [fieldOptions, formCustomization, formRequirements, duplicatePriceLevel] = await Promise.all([
    loadFieldOptionsMap(fieldMetaById, [
      'levelType',
      'subsidiaryId',
      'includeChildren',
      'approvalRequired',
      'allowManualOverride',
      'inactive',
    ]),
    loadPriceLevelFormCustomization(),
    loadFormRequirements(),
    duplicateFrom
      ? prisma.priceLevel.findUnique({
          where: { id: duplicateFrom },
          select: {
            name: true,
            description: true,
            levelType: true,
            subsidiaryId: true,
            includeChildren: true,
            defaultDiscountPct: true,
            minimumMarginPct: true,
            approvalRequired: true,
            approvalWorkflow: true,
            allowManualOverride: true,
            effectiveStartDate: true,
            effectiveEndDate: true,
          },
        })
      : Promise.resolve(null),
  ])

  const initialValues = duplicatePriceLevel
    ? {
        name: `Copy of ${duplicatePriceLevel.name}`,
        description: duplicatePriceLevel.description ?? '',
        levelType: duplicatePriceLevel.levelType ?? '',
        subsidiaryId: duplicatePriceLevel.subsidiaryId ?? '',
        includeChildren: duplicatePriceLevel.includeChildren ? 'true' : 'false',
        defaultDiscountPct: duplicatePriceLevel.defaultDiscountPct?.toString() ?? '',
        minimumMarginPct: duplicatePriceLevel.minimumMarginPct?.toString() ?? '',
        approvalRequired: duplicatePriceLevel.approvalRequired ? 'true' : 'false',
        approvalWorkflow: duplicatePriceLevel.approvalWorkflow ?? '',
        allowManualOverride: duplicatePriceLevel.allowManualOverride ? 'true' : 'false',
        effectiveStartDate: dateInputValue(duplicatePriceLevel.effectiveStartDate),
        effectiveEndDate: dateInputValue(duplicatePriceLevel.effectiveEndDate),
      }
    : {
        name: '',
        description: '',
        levelType: '',
        subsidiaryId: '',
        includeChildren: 'false',
        defaultDiscountPct: '',
        minimumMarginPct: '',
        approvalRequired: 'false',
        approvalWorkflow: '',
        allowManualOverride: 'true',
        effectiveStartDate: '',
        effectiveEndDate: '',
      }

  const priceLevelRequirements = formRequirements.priceLevelCreate ?? {}
  const fieldDefinitions: Record<PriceLevelFormFieldKey, InlineRecordField> = {
    priceLevelId: {
      name: 'priceLevelId',
      label: 'Price Level ID',
      value: '',
      placeholder: 'Generated automatically',
      helpText: 'System-generated business identifier for the price level.',
      readOnly: true,
    },
    name: {
      name: 'name',
      label: 'Name',
      value: initialValues.name,
      helpText: 'Business-facing name for this price level.',
      required: priceLevelRequirements.name ?? true,
    },
    description: {
      name: 'description',
      label: 'Description',
      value: initialValues.description,
      helpText: 'Short explanation of how and when this price level should be used.',
      required: priceLevelRequirements.description ?? false,
    },
    levelType: {
      name: 'levelType',
      label: 'Level Type',
      value: initialValues.levelType,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.levelType ?? [])],
      helpText: 'Governed category such as standard, preferred, partner, enterprise, or promotional.',
      sourceText: getFieldSourceText(fieldMetaById, 'levelType'),
      required: priceLevelRequirements.levelType ?? false,
    },
    subsidiaryId: {
      name: 'subsidiaryId',
      label: 'Subsidiary',
      value: initialValues.subsidiaryId,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...(fieldOptions.subsidiaryId ?? [])],
      helpText: 'Optional subsidiary scope for this price level.',
      sourceText: getFieldSourceText(fieldMetaById, 'subsidiaryId'),
      required: priceLevelRequirements.subsidiaryId ?? false,
    },
    includeChildren: {
      name: 'includeChildren',
      label: 'Include Children',
      value: initialValues.includeChildren,
      type: 'select',
      options: fieldOptions.includeChildren ?? [],
      helpText: 'Allows child subsidiaries to use this price level when a parent subsidiary is selected.',
      sourceText: getFieldSourceText(fieldMetaById, 'includeChildren'),
      required: priceLevelRequirements.includeChildren ?? false,
    },
    defaultDiscountPct: {
      name: 'defaultDiscountPct',
      label: 'Default Discount %',
      value: initialValues.defaultDiscountPct,
      type: 'number',
      helpText: 'Default discount percentage suggested when this price level is applied.',
      required: priceLevelRequirements.defaultDiscountPct ?? false,
    },
    minimumMarginPct: {
      name: 'minimumMarginPct',
      label: 'Minimum Margin %',
      value: initialValues.minimumMarginPct,
      type: 'number',
      helpText: 'Minimum margin guardrail for pricing approvals and exception review.',
      required: priceLevelRequirements.minimumMarginPct ?? false,
    },
    approvalRequired: {
      name: 'approvalRequired',
      label: 'Approval Required',
      value: initialValues.approvalRequired,
      type: 'select',
      options: fieldOptions.approvalRequired ?? [],
      helpText: 'Requires approval before this price level can be used on customer-facing transactions.',
      sourceText: getFieldSourceText(fieldMetaById, 'approvalRequired'),
      required: priceLevelRequirements.approvalRequired ?? false,
    },
    approvalWorkflow: {
      name: 'approvalWorkflow',
      label: 'Approval Workflow',
      value: initialValues.approvalWorkflow,
      helpText: 'Optional workflow key or name used when approval is required.',
      required: priceLevelRequirements.approvalWorkflow ?? false,
    },
    allowManualOverride: {
      name: 'allowManualOverride',
      label: 'Allow Manual Override',
      value: initialValues.allowManualOverride,
      type: 'select',
      options: fieldOptions.allowManualOverride ?? [],
      helpText: 'Allows authorized users to override the default pricing output.',
      sourceText: getFieldSourceText(fieldMetaById, 'allowManualOverride'),
      required: priceLevelRequirements.allowManualOverride ?? false,
    },
    effectiveStartDate: {
      name: 'effectiveStartDate',
      label: 'Effective Start Date',
      value: initialValues.effectiveStartDate,
      type: 'date',
      helpText: 'First date this price level is valid.',
      required: priceLevelRequirements.effectiveStartDate ?? false,
    },
    effectiveEndDate: {
      name: 'effectiveEndDate',
      label: 'Effective End Date',
      value: initialValues.effectiveEndDate,
      type: 'date',
      helpText: 'Last date this price level is valid, if applicable.',
      required: priceLevelRequirements.effectiveEndDate ?? false,
    },
    inactive: {
      name: 'inactive',
      label: 'Inactive',
      value: 'false',
      type: 'select',
      options: fieldOptions.inactive ?? [],
      helpText: 'Marks the price level unavailable for new use while preserving history.',
      sourceText: getFieldSourceText(fieldMetaById, 'inactive'),
      required: priceLevelRequirements.inactive ?? false,
    },
  }

  const sections = buildConfiguredInlineSections({
    fields: PRICE_LEVEL_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: PRICE_LEVEL_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="price-levels"
      backHref="/price-levels"
      backLabel="<- Back to Price Levels"
      title="New Price Level"
      detailsTitle="Price level details"
      formId="create-price-level-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/price-levels"
      successRedirectBasePath="/price-levels"
    />
  )
}
