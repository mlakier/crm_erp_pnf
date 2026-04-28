'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TransactionHeaderSections, { type TransactionHeaderField } from '@/components/TransactionHeaderSections'
import RecordDetailPageShell from '@/components/RecordDetailPageShell'
import TransactionActionStack from '@/components/TransactionActionStack'
import { buildConfiguredTransactionSections } from '@/lib/transaction-detail-helpers'
import { applyRequirementsToEditableFields, useFormRequirementsState } from '@/lib/form-requirements-client'
import {
  LEAD_DETAIL_FIELDS,
  type LeadDetailCustomizationConfig,
  type LeadDetailFieldKey,
} from '@/lib/lead-detail-customization'
import { leadPageConfig } from '@/lib/transaction-page-configs/lead'
import { isValidEmail } from '@/lib/validation'

type LeadCreateHeaderField = TransactionHeaderField & { key: LeadDetailFieldKey }

export default function LeadCreatePageClient({
  userId,
  createdByLabel,
  entities,
  currencies,
  leadSourceOptions,
  leadRatingOptions,
  leadStatusOptions,
  customization,
  initialValues,
}: {
  userId: string
  createdByLabel: string
  entities: Array<{ id: string; subsidiaryId: string; name: string }>
  currencies: Array<{ id: string; currencyId: string; code?: string; name: string }>
  leadSourceOptions: Array<{ value: string; label: string }>
  leadRatingOptions: Array<{ value: string; label: string }>
  leadStatusOptions: Array<{ value: string; label: string }>
  customization: LeadDetailCustomizationConfig
  initialValues?: Partial<{
    firstName: string
    lastName: string
    company: string
    email: string
    phone: string
    title: string
    website: string
    industry: string
    status: string
    source: string
    rating: string
    expectedValue: string
    entityId: string
    currencyId: string
    notes: string
    address: string
    lastContactedAt: string
    qualifiedAt: string
    convertedAt: string
  }>
}) {
  const router = useRouter()
  const { req, isLocked } = useFormRequirementsState('leadCreate')
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({
    id: '',
    leadNumber: '',
    firstName: initialValues?.firstName ?? '',
    lastName: initialValues?.lastName ?? '',
    email: initialValues?.email ?? '',
    phone: initialValues?.phone ?? '',
    company: initialValues?.company ?? '',
    title: initialValues?.title ?? '',
    status: initialValues?.status ?? 'new',
    source: initialValues?.source ?? '',
    rating: initialValues?.rating ?? '',
    expectedValue: initialValues?.expectedValue ?? '',
    subsidiaryId: initialValues?.entityId ?? '',
    currencyId: initialValues?.currencyId ?? '',
    website: initialValues?.website ?? '',
    industry: initialValues?.industry ?? '',
    address: initialValues?.address ?? '',
    notes: initialValues?.notes ?? '',
    lastContactedAt: initialValues?.lastContactedAt ?? '',
    qualifiedAt: initialValues?.qualifiedAt ?? '',
    convertedAt: initialValues?.convertedAt ?? '',
    inactive: 'No',
    createdBy: createdByLabel,
    createdAt: '',
    updatedAt: '',
  })

  const title = useMemo(() => {
    const fullName = [headerValues.firstName, headerValues.lastName].filter(Boolean).join(' ').trim()
    return fullName || headerValues.company || (initialValues ? 'Duplicate Lead' : 'New Lead')
  }, [headerValues.company, headerValues.firstName, headerValues.lastName, initialValues])

  const subsidiaryOptions = entities.map((entity) => ({
    value: entity.id,
    label: `${entity.subsidiaryId} - ${entity.name}`,
  }))
  const currencyOptions = currencies.map((currency) => ({
    value: currency.id,
    label: `${currency.code ?? currency.currencyId} - ${currency.name}`,
  }))

  const headerFieldDefinitions: Record<LeadDetailFieldKey, LeadCreateHeaderField> = {
    id: {
      key: 'id',
      label: 'DB Id',
      value: headerValues.id,
      displayValue: 'Generated on save',
      helpText: 'Internal database identifier for the lead record.',
      fieldType: 'text',
    },
    leadNumber: {
      key: 'leadNumber',
      label: 'Lead Id',
      value: headerValues.leadNumber,
      displayValue: 'Generated on save',
      helpText: 'Generated lead number used across the Lead-to-Cash flow.',
      fieldType: 'text',
    },
    firstName: {
      key: 'firstName',
      label: 'First Name',
      value: headerValues.firstName,
      editable: true,
      type: 'text',
      helpText: 'Lead contact first name.',
      fieldType: 'text',
    },
    lastName: {
      key: 'lastName',
      label: 'Last Name',
      value: headerValues.lastName,
      editable: true,
      type: 'text',
      helpText: 'Lead contact last name.',
      fieldType: 'text',
    },
    email: {
      key: 'email',
      label: 'Email',
      value: headerValues.email,
      editable: true,
      type: 'email',
      helpText: 'Primary email address for the lead.',
      fieldType: 'email',
    },
    phone: {
      key: 'phone',
      label: 'Phone',
      value: headerValues.phone,
      editable: true,
      type: 'text',
      helpText: 'Primary phone number for the lead.',
      fieldType: 'text',
    },
    company: {
      key: 'company',
      label: 'Company',
      value: headerValues.company,
      editable: true,
      type: 'text',
      helpText: 'Company or organization associated with the lead.',
      fieldType: 'text',
    },
    title: {
      key: 'title',
      label: 'Title',
      value: headerValues.title,
      editable: true,
      type: 'text',
      helpText: 'Job title of the lead contact.',
      fieldType: 'text',
    },
    status: {
      key: 'status',
      label: 'Status',
      value: headerValues.status,
      editable: true,
      type: 'select',
      options: leadStatusOptions,
      helpText: 'Current lifecycle stage of the lead.',
      fieldType: 'list',
      sourceText: 'Lead status list',
    },
    source: {
      key: 'source',
      label: 'Source',
      value: headerValues.source,
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...leadSourceOptions],
      helpText: 'How the lead was sourced.',
      fieldType: 'list',
      sourceText: 'Lead source list',
    },
    rating: {
      key: 'rating',
      label: 'Rating',
      value: headerValues.rating,
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...leadRatingOptions],
      helpText: 'Qualification rating assigned to the lead.',
      fieldType: 'list',
      sourceText: 'Lead rating list',
    },
    expectedValue: {
      key: 'expectedValue',
      label: 'Expected Value',
      value: headerValues.expectedValue,
      editable: true,
      type: 'number',
      helpText: 'Estimated commercial value associated with the lead.',
      fieldType: 'currency',
    },
    subsidiaryId: {
      key: 'subsidiaryId',
      label: 'Subsidiary',
      value: headerValues.subsidiaryId,
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...subsidiaryOptions],
      helpText: 'Owning subsidiary for the lead.',
      fieldType: 'list',
      sourceText: 'Subsidiaries master data',
    },
    currencyId: {
      key: 'currencyId',
      label: 'Currency',
      value: headerValues.currencyId,
      editable: true,
      type: 'select',
      options: [{ value: '', label: 'None' }, ...currencyOptions],
      helpText: 'Preferred currency associated with the lead.',
      fieldType: 'list',
      sourceText: 'Currencies master data',
    },
    website: {
      key: 'website',
      label: 'Website',
      value: headerValues.website,
      editable: true,
      type: 'text',
      helpText: 'Website for the lead or associated company.',
      fieldType: 'text',
    },
    industry: {
      key: 'industry',
      label: 'Industry',
      value: headerValues.industry,
      editable: true,
      type: 'text',
      helpText: 'Industry associated with the lead.',
      fieldType: 'text',
    },
    address: {
      key: 'address',
      label: 'Address',
      value: headerValues.address,
      editable: true,
      type: 'text',
      helpText: 'Primary address recorded for the lead.',
      fieldType: 'text',
    },
    notes: {
      key: 'notes',
      label: 'Notes',
      value: headerValues.notes,
      editable: true,
      type: 'text',
      helpText: 'Freeform notes recorded against the lead.',
      fieldType: 'text',
    },
    lastContactedAt: {
      key: 'lastContactedAt',
      label: 'Last Contacted',
      value: headerValues.lastContactedAt,
      editable: true,
      type: 'date',
      helpText: 'Most recent contact date for the lead.',
      fieldType: 'date',
    },
    qualifiedAt: {
      key: 'qualifiedAt',
      label: 'Qualified At',
      value: headerValues.qualifiedAt,
      editable: true,
      type: 'date',
      helpText: 'Date the lead was qualified.',
      fieldType: 'date',
    },
    convertedAt: {
      key: 'convertedAt',
      label: 'Converted At',
      value: headerValues.convertedAt,
      editable: true,
      type: 'date',
      helpText: 'Date the lead was converted.',
      fieldType: 'date',
    },
    inactive: {
      key: 'inactive',
      label: 'Inactive',
      value: headerValues.inactive,
      displayValue: 'No',
      helpText: 'Whether the lead is inactive.',
      fieldType: 'boolean',
    },
    createdBy: {
      key: 'createdBy',
      label: 'Created By',
      value: headerValues.createdBy,
      displayValue: createdByLabel,
      helpText: 'User who created the lead.',
      fieldType: 'text',
      sourceText: 'Users master data',
    },
    createdAt: {
      key: 'createdAt',
      label: 'Created',
      value: headerValues.createdAt,
      displayValue: 'Generated on save',
      helpText: 'Date/time the lead record was created.',
      fieldType: 'date',
    },
    updatedAt: {
      key: 'updatedAt',
      label: 'Last Modified',
      value: headerValues.updatedAt,
      displayValue: 'Generated on save',
      helpText: 'Date/time the lead record was last modified.',
      fieldType: 'date',
    },
  }
  applyRequirementsToEditableFields(headerFieldDefinitions, req, isLocked)


  const headerSections = buildConfiguredTransactionSections({
    fields: LEAD_DETAIL_FIELDS,
    layout: customization,
    fieldDefinitions: headerFieldDefinitions,
    sectionDescriptions: leadPageConfig.sectionDescriptions,
  })

  async function handleSubmit(values: Record<string, string>) {
    if (values.email.trim() && !isValidEmail(values.email)) {
      return { ok: false, error: 'Please enter a valid email address' }
    }

    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        address: values.address,
        company: values.company,
        title: values.title,
        website: values.website,
        industry: values.industry,
        status: values.status || 'new',
        source: values.source,
        rating: values.rating,
        expectedValue: values.expectedValue === '' ? null : Number(values.expectedValue),
        entityId: values.subsidiaryId,
        currencyId: values.currencyId,
        notes: values.notes,
        userId,
        lastContactedAt: values.lastContactedAt || null,
        qualifiedAt: values.qualifiedAt || null,
        convertedAt: values.convertedAt || null,
      }),
    })

    const json = await response.json()
    if (!response.ok) {
      return { ok: false, error: json?.error ?? 'Create failed' }
    }

    router.push(`/leads/${json.id}`)
    return { ok: true }
  }

  return (
    <RecordDetailPageShell
      backHref="/leads"
      backLabel="<- Back to Leads"
      meta="New"
      title={title}
      badge={
        <div className="flex flex-wrap gap-2">
          <span
            className="inline-block rounded-full px-3 py-0.5 text-sm"
            style={{ backgroundColor: 'rgba(59,130,246,0.18)', color: 'var(--accent-primary-strong)' }}
          >
            Lead
          </span>
          <span
            className="inline-block rounded-full px-3 py-0.5 text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}
          >
            New
          </span>
        </div>
      }
      widthClassName="w-full max-w-none"
      actions={<TransactionActionStack mode="create" cancelHref="/leads" formId="create-lead-form" />}
    >
      <TransactionHeaderSections
        editing
        sections={headerSections}
        columns={customization.formColumns}
        containerTitle="Lead Details"
        containerDescription="Core lead data, organized into customizable sections. Move fields between sections in Customize as needed."
        showSubsections={false}
        showSectionDescriptions={true}
        formId="create-lead-form"
        submitMode="controlled"
        onValuesChange={setHeaderValues}
        onSubmit={handleSubmit}
      />
    </RecordDetailPageShell>
  )
}

