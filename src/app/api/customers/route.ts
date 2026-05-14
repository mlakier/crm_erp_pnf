import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity, logFieldChangeActivities, logRecordSnapshotActivities } from '@/lib/activity'
import { generateNextCustomerNumber } from '@/lib/customer-number'
import { formatContactNumber } from '@/lib/contact-number'
import { normalizePhone } from '@/lib/format'
import { isFieldRequiredServer } from '@/lib/form-requirements-store'
import { getNextSequenceFromValues, loadIdSetting } from '@/lib/id-settings'

function text(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function booleanValue(value: unknown) {
  return value === true || String(value ?? '').trim().toLowerCase() === 'true'
}

function integerValue(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function dateValue(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function hasOwn(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key)
}

function assignText(data: Record<string, unknown>, body: Record<string, unknown>, sourceKey: string, targetKey = sourceKey) {
  if (hasOwn(body, sourceKey)) data[targetKey] = text(body[sourceKey])
}

function assignBoolean(data: Record<string, unknown>, body: Record<string, unknown>, key: string) {
  if (hasOwn(body, key)) data[key] = booleanValue(body[key])
}

type CustomerProfileSource = {
  id: string
  customerId: string | null
  address: string | null
  arAccountId: string | null
  subsidiaryId: string | null
  currencyId: string | null
  taxItem: string | null
  resaleNumber: string | null
  taxable: boolean
  blockCollectionEmail: boolean
  inactive: boolean
}

async function syncCustomerProfileRecords(customer: CustomerProfileSource) {
  const hasEntitySettings =
    Boolean(customer.subsidiaryId) ||
    Boolean(customer.currencyId) ||
    Boolean(customer.arAccountId) ||
    Boolean(customer.taxItem)

  if (hasEntitySettings) {
    const existingEntitySetting = await prisma.customerEntitySetting.findFirst({
      where: { customerId: customer.id, subsidiaryId: customer.subsidiaryId },
      select: { id: true },
    })
    const entitySettingData = {
      defaultArAccountId: customer.arAccountId,
      currencyId: customer.currencyId,
      taxCode: customer.taxItem,
      isEnabledForEntity: true,
      inactive: customer.inactive,
    }
    if (existingEntitySetting) {
      await prisma.customerEntitySetting.update({
        where: { id: existingEntitySetting.id },
        data: entitySettingData,
      })
    } else {
      await prisma.customerEntitySetting.create({
        data: {
        customerId: customer.id,
        subsidiaryId: customer.subsidiaryId,
          ...entitySettingData,
        },
      })
    }
  }

  if (customer.address?.trim()) {
    const existingAddress = await prisma.customerAddress.findFirst({
      where: { customerId: customer.id, addressType: 'billing', isPrimary: true },
      select: { id: true },
    })
    const addressData = {
      line1: customer.address,
      isPrimary: true,
      isActive: !customer.inactive,
    }
    if (existingAddress) {
      await prisma.customerAddress.update({ where: { id: existingAddress.id }, data: addressData })
    } else {
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          addressId: customer.customerId ? `CADDR-${customer.customerId}` : null,
          addressType: 'billing',
          ...addressData,
        },
      })
    }
  }

  if (customer.taxable || customer.taxItem || customer.resaleNumber) {
    const existingTaxProfile = await prisma.customerTaxProfile.findFirst({
      where: { customerId: customer.id, subsidiaryId: customer.subsidiaryId },
      select: { id: true },
    })
    const taxProfileData = {
      taxExempt: !customer.taxable,
      resaleCertificateNumber: customer.resaleNumber,
      taxCode: customer.taxItem,
      taxValidationStatus: customer.taxItem || customer.resaleNumber ? 'pending' : null,
    }
    if (existingTaxProfile) {
      await prisma.customerTaxProfile.update({
        where: { id: existingTaxProfile.id },
        data: taxProfileData,
      })
    } else {
      await prisma.customerTaxProfile.create({
        data: {
          customerId: customer.id,
          taxProfileId: customer.customerId ? `CTAX-${customer.customerId}` : null,
          subsidiaryId: customer.subsidiaryId,
          ...taxProfileData,
        },
      })
    }
  }

  if (customer.currencyId || customer.subsidiaryId || customer.blockCollectionEmail) {
    const existingCreditProfile = await prisma.customerCreditProfile.findFirst({
      where: { customerId: customer.id, subsidiaryId: customer.subsidiaryId },
      select: { id: true },
    })
    const creditProfileData = {
      creditCurrencyId: customer.currencyId,
      blockCollectionEmail: customer.blockCollectionEmail,
    }
    if (existingCreditProfile) {
      await prisma.customerCreditProfile.update({
        where: { id: existingCreditProfile.id },
        data: creditProfileData,
      })
    } else {
      await prisma.customerCreditProfile.create({
        data: {
          customerId: customer.id,
          creditProfileId: customer.customerId ? `CCR-${customer.customerId}` : null,
          subsidiaryId: customer.subsidiaryId,
          creditStatus: 'pending_review',
          collectionsHold: false,
          ...creditProfileData,
        },
      })
    }
  }
}

// GET /api/customers - Get all customers
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        contacts: true,
      },
    })
    return NextResponse.json(customers)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      address,
      industry,
      customerType,
      customerGroup,
      customerStatus,
      territory,
      salesManager,
      projectManager,
      arAccountId,
      startDate,
      endDate,
      reminderDays,
      priceLevel,
      priceBook,
      taxable,
      taxItem,
      resaleNumber,
      language,
      numberFormat,
      negativeNumberFormat,
      shipComplete,
      shippingCarrier,
      shippingMethod,
      blockCollectionEmail,
      collectionsRep,
      userId,
      contacts,
      primarySubsidiaryId,
      primaryCurrencyId,
      includeChildren,
      inactive,
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const missing: string[] = []
    if ((await isFieldRequiredServer('customerCreate', 'name')) && !name) missing.push('name')
    if ((await isFieldRequiredServer('customerCreate', 'email')) && !email) missing.push('email')
    if ((await isFieldRequiredServer('customerCreate', 'phone')) && !phone) missing.push('phone')
    if ((await isFieldRequiredServer('customerCreate', 'address')) && !address) missing.push('address')

    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }

    if (!Array.isArray(contacts) || contacts.length < 1) {
      return NextResponse.json({ error: 'At least one contact is required' }, { status: 400 })
    }

    const normalizedContacts = Array.isArray(contacts)
      ? contacts
          .map((contact) => ({
            firstName: String(contact?.firstName ?? '').trim(),
            lastName: String(contact?.lastName ?? '').trim(),
            email: String(contact?.email ?? '').trim(),
            phone: String(contact?.phone ?? '').trim(),
            position: String(contact?.position ?? '').trim(),
            isPrimaryForCustomer: String(contact?.isPrimaryForCustomer ?? 'false').trim().toLowerCase() === 'true' || contact?.isPrimaryForCustomer === true,
            receivesQuotesSalesOrders: String(contact?.receivesQuotesSalesOrders ?? 'false').trim().toLowerCase() === 'true' || contact?.receivesQuotesSalesOrders === true,
            receivesInvoices: String(contact?.receivesInvoices ?? 'false').trim().toLowerCase() === 'true' || contact?.receivesInvoices === true,
            receivesInvoiceCc: String(contact?.receivesInvoiceCc ?? 'false').trim().toLowerCase() === 'true' || contact?.receivesInvoiceCc === true,
          }))
          .filter((contact) => contact.firstName || contact.lastName || contact.email || contact.phone || contact.position)
      : []

    if (normalizedContacts.length > 0 && !normalizedContacts.some((contact) => contact.isPrimaryForCustomer)) {
      normalizedContacts[0].isPrimaryForCustomer = true
    }
    if (normalizedContacts.filter((contact) => contact.isPrimaryForCustomer).length > 1) {
      let primarySeen = false
      for (const contact of normalizedContacts) {
        if (!contact.isPrimaryForCustomer) continue
        if (!primarySeen) {
          primarySeen = true
        } else {
          contact.isPrimaryForCustomer = false
        }
      }
    }

    const primaryContact = normalizedContacts.find((contact) => contact.isPrimaryForCustomer) ?? normalizedContacts[0] ?? null
    if (
      (((await isFieldRequiredServer('customerCreate', 'contactFirstName')) && !primaryContact?.firstName) ||
        ((await isFieldRequiredServer('customerCreate', 'contactLastName')) && !primaryContact?.lastName))
    ) {
      return NextResponse.json({ error: 'Primary contact first name and last name are required' }, { status: 400 })
    }

    const customerNumber = await generateNextCustomerNumber()
    const contactIdConfig = await loadIdSetting('contact')
    const latestContacts = normalizedContacts.length
      ? await prisma.contact.findMany({
          where: { contactNumber: { startsWith: contactIdConfig.prefix } },
          orderBy: { contactNumber: 'desc' },
          select: { contactNumber: true },
          take: 200,
        })
      : []
    const nextContactSequence = getNextSequenceFromValues(latestContacts.map((contact) => contact.contactNumber), contactIdConfig)

    const customer = await prisma.customer.create({
      data: {
        customerId: customerNumber,
        name,
        email,
        phone: normalizePhone(phone),
        address,
        industry,
        customerType: text(customerType),
        customerGroup: text(customerGroup),
        customerStatus: text(customerStatus),
        territory: text(territory),
        salesManager: text(salesManager),
        projectManager: text(projectManager),
        arAccountId: text(arAccountId),
        startDate: dateValue(startDate),
        endDate: dateValue(endDate),
        reminderDays: integerValue(reminderDays),
        priceLevel: text(priceLevel),
        priceBook: text(priceBook),
        taxable: booleanValue(taxable),
        taxItem: text(taxItem),
        resaleNumber: text(resaleNumber),
        language: text(language),
        numberFormat: text(numberFormat),
        negativeNumberFormat: text(negativeNumberFormat),
        shipComplete: booleanValue(shipComplete),
        shippingCarrier: text(shippingCarrier),
        shippingMethod: text(shippingMethod),
        blockCollectionEmail: booleanValue(blockCollectionEmail),
        collectionsRep: text(collectionsRep),
        subsidiaryId: primarySubsidiaryId || null,
        currencyId: primaryCurrencyId || null,
        includeChildren: booleanValue(includeChildren),
        inactive: String(inactive).trim().toLowerCase() === 'true',
        userId,
        ...(normalizedContacts.length > 0
          ? {
              contacts: {
                create: normalizedContacts.map((contact, index) => ({
                  contactNumber: formatContactNumber(nextContactSequence + index, contactIdConfig),
                  firstName: contact.firstName,
                  lastName: contact.lastName,
                  email: contact.email || null,
                  phone: normalizePhone(contact.phone),
                  position: contact.position || null,
                  isPrimaryForCustomer: contact.isPrimaryForCustomer,
                  receivesQuotesSalesOrders: contact.receivesQuotesSalesOrders,
                  receivesInvoices: contact.receivesInvoices,
                  receivesInvoiceCc: contact.receivesInvoiceCc,
                  userId,
                })),
              },
            }
          : {}),
      },
      include: {
        contacts: true,
      },
    })
    await syncCustomerProfileRecords(customer)

    await logActivity({
      entityType: 'customer',
      entityId: customer.id,
      action: 'create',
      summary: `Created customer ${customer.customerId ?? customer.name} ${customer.name}`,
      userId,
    })
    await logRecordSnapshotActivities({
      entityType: 'customer',
      entityId: customer.id,
      userId,
      action: 'create',
      context: 'Customer Details',
      fields: [
        { fieldName: 'Business Id', value: customer.customerId },
        { fieldName: 'Name', value: customer.name },
        { fieldName: 'Email', value: customer.email },
        { fieldName: 'Phone', value: customer.phone },
        { fieldName: 'Address', value: customer.address },
        { fieldName: 'Industry', value: customer.industry },
        { fieldName: 'Customer Type', value: customer.customerType },
        { fieldName: 'Customer Group', value: customer.customerGroup },
        { fieldName: 'Customer Status', value: customer.customerStatus },
        { fieldName: 'Territory', value: customer.territory },
        { fieldName: 'Sales Manager', value: customer.salesManager },
        { fieldName: 'Project Manager', value: customer.projectManager },
        { fieldName: 'AR Account', value: customer.arAccountId },
        { fieldName: 'Start Date', value: customer.startDate },
        { fieldName: 'End Date', value: customer.endDate },
        { fieldName: 'Reminder Days', value: customer.reminderDays },
        { fieldName: 'Price Level', value: customer.priceLevel },
        { fieldName: 'Price Book', value: customer.priceBook },
        { fieldName: 'Taxable', value: customer.taxable },
        { fieldName: 'Tax Code', value: customer.taxItem },
        { fieldName: 'Resale Number', value: customer.resaleNumber },
        { fieldName: 'Language', value: customer.language },
        { fieldName: 'Number Format', value: customer.numberFormat },
        { fieldName: 'Negative Number Format', value: customer.negativeNumberFormat },
        { fieldName: 'Ship Complete', value: customer.shipComplete },
        { fieldName: 'Shipping Carrier', value: customer.shippingCarrier },
        { fieldName: 'Shipping Method', value: customer.shippingMethod },
        { fieldName: 'Block Collection Email', value: customer.blockCollectionEmail },
        { fieldName: 'Collections Rep', value: customer.collectionsRep },
        { fieldName: 'Primary Subsidiary', value: customer.subsidiaryId },
        { fieldName: 'Primary Currency', value: customer.currencyId },
        { fieldName: 'Include Children', value: customer.includeChildren },
        { fieldName: 'Inactive', value: customer.inactive },
      ],
    })

    return NextResponse.json(customer, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

// PUT /api/customers?id=<id> - Update a customer
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing customer id' }, { status: 400 })

    const body = await request.json() as Record<string, unknown>
    const before = await prisma.customer.findUnique({ where: { id } })
    if (!before) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const nextName = hasOwn(body, 'name') ? String(body.name ?? '').trim() : before.name
    if (!nextName) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const existingContactCount = await prisma.contact.count({ where: { customerId: id } })
    if (existingContactCount < 1) {
      return NextResponse.json(
        { error: 'At least one contact is required before saving this customer. Add a contact in the Contacts section first.' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (hasOwn(body, 'name')) data.name = nextName
    assignText(data, body, 'email')
    if (hasOwn(body, 'phone')) data.phone = normalizePhone(String(body.phone ?? ''))
    assignText(data, body, 'address')
    assignText(data, body, 'industry')
    assignText(data, body, 'customerType')
    assignText(data, body, 'customerGroup')
    assignText(data, body, 'customerStatus')
    assignText(data, body, 'territory')
    assignText(data, body, 'salesManager')
    assignText(data, body, 'projectManager')
    assignText(data, body, 'arAccountId')
    if (hasOwn(body, 'startDate')) data.startDate = dateValue(body.startDate)
    if (hasOwn(body, 'endDate')) data.endDate = dateValue(body.endDate)
    if (hasOwn(body, 'reminderDays')) data.reminderDays = integerValue(body.reminderDays)
    assignText(data, body, 'priceLevel')
    assignText(data, body, 'priceBook')
    assignBoolean(data, body, 'taxable')
    assignText(data, body, 'taxItem')
    assignText(data, body, 'resaleNumber')
    assignText(data, body, 'language')
    assignText(data, body, 'numberFormat')
    assignText(data, body, 'negativeNumberFormat')
    assignBoolean(data, body, 'shipComplete')
    assignText(data, body, 'shippingCarrier')
    assignText(data, body, 'shippingMethod')
    assignBoolean(data, body, 'blockCollectionEmail')
    assignText(data, body, 'collectionsRep')
    assignText(data, body, 'primarySubsidiaryId', 'subsidiaryId')
    assignText(data, body, 'primaryCurrencyId', 'currencyId')
    assignBoolean(data, body, 'includeChildren')
    assignBoolean(data, body, 'inactive')

    const customer = await prisma.customer.update({
      where: { id },
      data,
    })
    await syncCustomerProfileRecords(customer)

    await logActivity({
      entityType: 'customer',
      entityId: customer.id,
      action: 'update',
      summary: `Updated customer ${customer.name}`,
      userId: customer.userId,
    })
    await logFieldChangeActivities({
      entityType: 'customer',
      entityId: customer.id,
      userId: customer.userId ?? null,
      context: 'Customer Details',
      changes: [
        { fieldName: 'Name', oldValue: before.name, newValue: customer.name },
        { fieldName: 'Email', oldValue: before.email, newValue: customer.email },
        { fieldName: 'Phone', oldValue: before.phone, newValue: customer.phone },
        { fieldName: 'Address', oldValue: before.address, newValue: customer.address },
        { fieldName: 'Industry', oldValue: before.industry, newValue: customer.industry },
        { fieldName: 'Customer Type', oldValue: before.customerType, newValue: customer.customerType },
        { fieldName: 'Customer Group', oldValue: before.customerGroup, newValue: customer.customerGroup },
        { fieldName: 'Customer Status', oldValue: before.customerStatus, newValue: customer.customerStatus },
        { fieldName: 'Territory', oldValue: before.territory, newValue: customer.territory },
        { fieldName: 'Sales Manager', oldValue: before.salesManager, newValue: customer.salesManager },
        { fieldName: 'Project Manager', oldValue: before.projectManager, newValue: customer.projectManager },
        { fieldName: 'AR Account', oldValue: before.arAccountId, newValue: customer.arAccountId },
        { fieldName: 'Start Date', oldValue: before.startDate, newValue: customer.startDate },
        { fieldName: 'End Date', oldValue: before.endDate, newValue: customer.endDate },
        { fieldName: 'Reminder Days', oldValue: before.reminderDays, newValue: customer.reminderDays },
        { fieldName: 'Price Level', oldValue: before.priceLevel, newValue: customer.priceLevel },
        { fieldName: 'Price Book', oldValue: before.priceBook, newValue: customer.priceBook },
        { fieldName: 'Taxable', oldValue: before.taxable, newValue: customer.taxable },
        { fieldName: 'Tax Code', oldValue: before.taxItem, newValue: customer.taxItem },
        { fieldName: 'Resale Number', oldValue: before.resaleNumber, newValue: customer.resaleNumber },
        { fieldName: 'Language', oldValue: before.language, newValue: customer.language },
        { fieldName: 'Number Format', oldValue: before.numberFormat, newValue: customer.numberFormat },
        { fieldName: 'Negative Number Format', oldValue: before.negativeNumberFormat, newValue: customer.negativeNumberFormat },
        { fieldName: 'Ship Complete', oldValue: before.shipComplete, newValue: customer.shipComplete },
        { fieldName: 'Shipping Carrier', oldValue: before.shippingCarrier, newValue: customer.shippingCarrier },
        { fieldName: 'Shipping Method', oldValue: before.shippingMethod, newValue: customer.shippingMethod },
        { fieldName: 'Block Collection Email', oldValue: before.blockCollectionEmail, newValue: customer.blockCollectionEmail },
        { fieldName: 'Collections Rep', oldValue: before.collectionsRep, newValue: customer.collectionsRep },
        { fieldName: 'Primary Subsidiary', oldValue: before.subsidiaryId, newValue: customer.subsidiaryId },
        { fieldName: 'Primary Currency', oldValue: before.currencyId, newValue: customer.currencyId },
        { fieldName: 'Include Children', oldValue: before.includeChildren, newValue: customer.includeChildren },
        { fieldName: 'Inactive', oldValue: before.inactive, newValue: customer.inactive },
      ],
    })

    return NextResponse.json(customer)
  } catch {
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

// DELETE /api/customers?id=<id> - Delete a customer
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing customer id' }, { status: 400 })
    }

    const existing = await prisma.customer.findUnique({ where: { id } })
    await prisma.customer.delete({ where: { id } })

    await logActivity({
      entityType: 'customer',
      entityId: id,
      action: 'delete',
      summary: `Deleted customer ${existing?.name ?? id}`,
      userId: existing?.userId,
    })
    if (existing) {
      await logRecordSnapshotActivities({
        entityType: 'customer',
        entityId: id,
        userId: existing.userId ?? null,
        action: 'delete',
        context: 'Customer Details',
        fields: [
          { fieldName: 'Business Id', value: existing.customerId },
          { fieldName: 'Name', value: existing.name },
          { fieldName: 'Email', value: existing.email },
          { fieldName: 'Phone', value: existing.phone },
          { fieldName: 'Address', value: existing.address },
          { fieldName: 'Industry', value: existing.industry },
          { fieldName: 'Customer Type', value: existing.customerType },
          { fieldName: 'Customer Group', value: existing.customerGroup },
          { fieldName: 'Customer Status', value: existing.customerStatus },
          { fieldName: 'Territory', value: existing.territory },
          { fieldName: 'Sales Manager', value: existing.salesManager },
          { fieldName: 'Project Manager', value: existing.projectManager },
          { fieldName: 'AR Account', value: existing.arAccountId },
          { fieldName: 'Start Date', value: existing.startDate },
          { fieldName: 'End Date', value: existing.endDate },
          { fieldName: 'Reminder Days', value: existing.reminderDays },
          { fieldName: 'Price Level', value: existing.priceLevel },
          { fieldName: 'Price Book', value: existing.priceBook },
          { fieldName: 'Taxable', value: existing.taxable },
          { fieldName: 'Tax Code', value: existing.taxItem },
          { fieldName: 'Resale Number', value: existing.resaleNumber },
          { fieldName: 'Language', value: existing.language },
          { fieldName: 'Number Format', value: existing.numberFormat },
          { fieldName: 'Negative Number Format', value: existing.negativeNumberFormat },
          { fieldName: 'Ship Complete', value: existing.shipComplete },
          { fieldName: 'Shipping Carrier', value: existing.shippingCarrier },
          { fieldName: 'Shipping Method', value: existing.shippingMethod },
          { fieldName: 'Block Collection Email', value: existing.blockCollectionEmail },
          { fieldName: 'Collections Rep', value: existing.collectionsRep },
          { fieldName: 'Primary Subsidiary', value: existing.subsidiaryId },
          { fieldName: 'Primary Currency', value: existing.currencyId },
          { fieldName: 'Include Children', value: existing.includeChildren },
          { fieldName: 'Inactive', value: existing.inactive },
        ],
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
