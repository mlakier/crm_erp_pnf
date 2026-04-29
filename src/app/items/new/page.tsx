import { prisma } from '@/lib/prisma'
import RecordCreateDetailPageClient from '@/components/RecordCreateDetailPageClient'
import { buildFieldMetaById, loadFieldOptionsMap } from '@/lib/field-source-helpers'
import { loadFormRequirements } from '@/lib/form-requirements-store'
import { generateNextItemNumber } from '@/lib/item-number'
import { ITEM_FORM_FIELDS, type ItemFormFieldKey } from '@/lib/item-form-customization'
import { loadItemFormCustomization } from '@/lib/item-form-customization-store'
import { buildConfiguredInlineSections, buildCreateInlineFieldDefinitions } from '@/lib/detail-page-helpers'

const ITEM_SECTION_DESCRIPTIONS: Record<string, string> = {
  Core: 'Primary item identity and descriptive fields.',
  Operational: 'Subsidiary, department, location, and order-behavior settings.',
  'Pricing And Costing': 'Commercial price and cost defaults.',
  'Revenue Recognition': 'Revenue arrangement, recognition, and allocation settings.',
  Billing: 'Billing type and trigger settings.',
  Accounting: 'Default GL account mappings for this item.',
}

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>
}) {
  const { duplicateFrom } = await searchParams
  const fieldMetaById = buildFieldMetaById(ITEM_FORM_FIELDS)
  const [nextItemId, formCustomization, formRequirements, fieldOptions, duplicateItem] = await Promise.all([
    generateNextItemNumber(),
    loadItemFormCustomization(),
    loadFormRequirements(),
    loadFieldOptionsMap(fieldMetaById, [
      'itemType',
      'itemCategory',
      'uom',
      'primaryPurchaseUnit',
      'primarySaleUnit',
      'primaryUnitsType',
      'revenueStream',
      'recognitionMethod',
      'recognitionTrigger',
      'createRevenueArrangementOn',
      'createForecastPlanOn',
      'createRevenuePlanOn',
      'performanceObligationType',
      'billingType',
      'billingTrigger',
      'line',
      'productLine',
      'subsidiaryIds',
      'departmentId',
      'locationId',
      'currencyId',
      'preferredVendorId',
      'incomeAccountId',
      'deferredRevenueAccountId',
      'inventoryAccountId',
      'cogsExpenseAccountId',
      'deferredCostAccountId',
      'defaultRevRecTemplateId',
    ]),
    duplicateFrom
      ? prisma.item.findUnique({
          where: { id: duplicateFrom },
          include: { itemSubsidiaries: { select: { subsidiaryId: true } } },
        })
      : Promise.resolve(null),
  ])

  const initialValues: Partial<Record<ItemFormFieldKey, unknown>> = duplicateItem
    ? {
        itemId: nextItemId,
        name: `Copy of ${duplicateItem.name}`,
        externalId: '',
        sku: duplicateItem.sku,
        description: duplicateItem.description,
        salesDescription: duplicateItem.salesDescription,
        purchaseDescription: duplicateItem.purchaseDescription,
        inactive: !duplicateItem.active,
        itemType: duplicateItem.itemType,
        itemCategory: duplicateItem.itemCategory,
        uom: duplicateItem.uom,
        primaryPurchaseUnit: duplicateItem.primaryPurchaseUnit,
        primarySaleUnit: duplicateItem.primarySaleUnit,
        primaryUnitsType: duplicateItem.primaryUnitsType,
        listPrice: String(duplicateItem.listPrice),
        revenueStream: duplicateItem.revenueStream,
        recognitionMethod: duplicateItem.recognitionMethod,
        recognitionTrigger: duplicateItem.recognitionTrigger,
        defaultRevRecTemplateId: duplicateItem.defaultRevRecTemplateId,
        defaultTermMonths: duplicateItem.defaultTermMonths != null ? String(duplicateItem.defaultTermMonths) : '',
        createRevenueArrangementOn: duplicateItem.createRevenueArrangementOn,
        createForecastPlanOn: duplicateItem.createForecastPlanOn,
        createRevenuePlanOn: duplicateItem.createRevenuePlanOn,
        allocationEligible: duplicateItem.allocationEligible,
        performanceObligationType: duplicateItem.performanceObligationType,
        standaloneSellingPrice: duplicateItem.standaloneSellingPrice != null ? String(duplicateItem.standaloneSellingPrice) : '',
        billingType: duplicateItem.billingType,
        billingTrigger: duplicateItem.billingTrigger,
        standardCost: duplicateItem.standardCost != null ? String(duplicateItem.standardCost) : '',
        averageCost: duplicateItem.averageCost != null ? String(duplicateItem.averageCost) : '',
        subsidiaryIds: duplicateItem.itemSubsidiaries.map((assignment) => assignment.subsidiaryId),
        includeChildren: duplicateItem.includeChildren,
        departmentId: duplicateItem.departmentId,
        locationId: duplicateItem.locationId,
        currencyId: duplicateItem.currencyId,
        line: duplicateItem.line,
        productLine: duplicateItem.productLine,
        dropShipItem: duplicateItem.dropShipItem,
        specialOrderItem: duplicateItem.specialOrderItem,
        canBeFulfilled: duplicateItem.canBeFulfilled,
        preferredVendorId: duplicateItem.preferredVendorId,
        incomeAccountId: duplicateItem.incomeAccountId,
        deferredRevenueAccountId: duplicateItem.deferredRevenueAccountId,
        inventoryAccountId: duplicateItem.inventoryAccountId,
        cogsExpenseAccountId: duplicateItem.cogsExpenseAccountId,
        deferredCostAccountId: duplicateItem.deferredCostAccountId,
        directRevenuePosting: duplicateItem.directRevenuePosting,
      }
    : {
        itemId: nextItemId,
        inactive: false,
        includeChildren: false,
        allocationEligible: true,
        dropShipItem: false,
        specialOrderItem: false,
        canBeFulfilled: false,
        directRevenuePosting: false,
      }

  const fieldDefinitions = buildCreateInlineFieldDefinitions<ItemFormFieldKey, (typeof ITEM_FORM_FIELDS)[number]>({
    fields: ITEM_FORM_FIELDS,
    initialValues,
    fieldOptions,
    requirements: formRequirements.itemCreate,
    readOnlyFields: ['itemId'],
    generatedFieldLabels: ['itemId'],
    multipleFields: ['subsidiaryIds'],
  })

  const sections = buildConfiguredInlineSections({
    fields: ITEM_FORM_FIELDS,
    layout: formCustomization,
    fieldDefinitions,
    sectionDescriptions: ITEM_SECTION_DESCRIPTIONS,
  })

  return (
    <RecordCreateDetailPageClient
      resource="items"
      backHref="/items"
      backLabel="<- Back to Items"
      title="New Item"
      detailsTitle="Item details"
      formId="create-item-inline-form"
      sections={sections}
      formColumns={formCustomization.formColumns}
      createEndpoint="/api/items"
      successRedirectBasePath="/items"
    />
  )
}
