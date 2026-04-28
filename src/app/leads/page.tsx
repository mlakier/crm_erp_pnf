import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtDocumentDate } from '@/lib/format'
import DeleteButton from '@/components/DeleteButton'
import ConvertLeadButton from '@/components/ConvertLeadButton'
import ColumnSelector from '@/components/ColumnSelector'
import ExportButton from '@/components/ExportButton'
import PaginationFooter from '@/components/PaginationFooter'
import { getPagination } from '@/lib/pagination'
import { loadCompanyInformationSettings } from '@/lib/company-information-settings-store'
import { loadCompanyCabinetFiles } from '@/lib/company-file-cabinet-store'
import { loadListOptionsForSource } from '@/lib/list-source'
import { buildMasterDataExportUrl } from '@/lib/master-data-export-url'
import { RecordListHeaderLabel } from '@/components/RecordListHeaderLabel'
import { loadCompanyDisplaySettings } from '@/lib/company-display-settings'
import { createRecordLabelMapFromOptions, formatRecordLabel } from '@/lib/record-status-label'

const LEAD_COLUMNS = [
  { id: 'lead-number', label: 'Lead Id' },
  { id: 'name', label: 'Name' },
  { id: 'company', label: 'Company' },
  { id: 'status', label: 'Status' },
  { id: 'source', label: 'Source' },
  { id: 'subsidiary', label: 'Subsidiary' },
  { id: 'currency', label: 'Currency' },
  { id: 'db-id', label: 'DB Id' },
  { id: 'created', label: 'Created' },
  { id: 'last-modified', label: 'Last Modified' },
  { id: 'actions', label: 'Actions', locked: true },
]

function leadName(lead: { firstName: string | null; lastName: string | null; email: string | null }) {
  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim()
  return fullName || lead.email || '—'
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const { moneySettings } = await loadCompanyDisplaySettings()
  const query = (params.q ?? '').trim()
  const statusFilter = params.status ?? 'all'

  const where = {
    ...(query
      ? {
          OR: [
            { leadNumber: { contains: query } },
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { email: { contains: query } },
            { company: { contains: query } },
            { source: { contains: query } },
          ],
        }
      : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  }

  const orderBy = [{ createdAt: 'desc' as const }]

  const [totalLeads, companySettings, cabinetFiles, leadStatusOptions] = await Promise.all([
    prisma.lead.count({ where }),
    loadCompanyInformationSettings(),
    loadCompanyCabinetFiles(),
    loadListOptionsForSource({ sourceType: 'managed-list', sourceKey: 'LIST-LEAD-STATUS' }),
  ])
  const statusOptions = [
    { value: 'all', label: 'All' },
    ...leadStatusOptions.map((option) => ({ value: option.value, label: option.label })),
  ]
  const statusLabelMap = createRecordLabelMapFromOptions(statusOptions)

  const pagination = getPagination(totalLeads, params.page)

  const leads = await prisma.lead.findMany({
    where,
    include: { subsidiary: true, currency: true, opportunity: true },
    orderBy,
    skip: pagination.skip,
    take: pagination.pageSize,
  })

  const buildPageHref = (nextPage: number) => {
    const search = new URLSearchParams()
    if (params.q) search.set('q', params.q)
    if (statusFilter !== 'all') search.set('status', statusFilter)
    search.set('page', String(nextPage))
    return `/leads?${search.toString()}`
  }

  const selectedLogoValue = companySettings.companyLogoPagesFileId
  const companyLogoPages =
    cabinetFiles.find((file) => file.id === selectedLogoValue)
    ?? cabinetFiles.find((file) => file.originalName === selectedLogoValue)
    ?? cabinetFiles.find((file) => file.storedName === selectedLogoValue)
    ?? cabinetFiles.find((file) => file.url === selectedLogoValue)
    ?? (!selectedLogoValue ? cabinetFiles[0] : undefined)

  return (
    <div className="min-h-full px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        {companyLogoPages ? (
          <img
            src={companyLogoPages.url}
            alt="Company logo"
            className="h-16 w-auto rounded"
          />
        ) : null}
        <div>
          <h1 className="text-xl font-semibold text-white">Leads</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{totalLeads} total</p>
        </div>
        <Link
          href="/leads/new"
          className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent-primary-strong)' }}
        >
          New Lead
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statusOptions.map((option) => {
          const active = statusFilter === option.value
          const href = `/leads?${new URLSearchParams({
            ...(params.q ? { q: params.q } : {}),
            ...(option.value !== 'all' ? { status: option.value } : {}),
            page: '1',
          }).toString()}`
          return (
            <Link
              key={option.value}
              href={href}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: 'var(--accent-primary-strong)', color: '#fff' }
                  : { backgroundColor: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border-muted)' }
              }
            >
              {option.label}
            </Link>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <form className="border-b px-6 py-4" method="get" style={{ borderColor: 'var(--border-muted)' }}>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="status" value={statusFilter} />
          <div className="flex gap-3 items-center flex-nowrap">
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Search lead id, name, company, email, source"
              className="flex-1 min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
            <ExportButton
              tableId="leads-list"
              fileName="leads"
              exportAllUrl={buildMasterDataExportUrl('leads', params.q, 'newest', {
                status: statusFilter !== 'all' ? statusFilter : undefined,
              })}
            />
            <ColumnSelector tableId="leads-list" columns={LEAD_COLUMNS} />
          </div>
        </form>

        <div className="record-list-scroll-region overflow-x-auto" data-column-selector-table="leads-list">
          <table className="min-w-full" id="leads-list">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-muted)' }}>
                {LEAD_COLUMNS.map((column) => (
                  <th key={column.id} data-column={column.id} className="sticky top-0 z-10 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--card)' }}>
                    <RecordListHeaderLabel label={column.label} tooltip={'tooltip' in column ? column.tooltip : undefined} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No leads found</td>
                </tr>
              ) : (
                leads.map((lead, index) => (
                  <tr key={lead.id} style={index < leads.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}>
                    <td data-column="lead-number" className="px-4 py-2 text-sm">
                      <Link href={`/leads/${lead.id}`} className="hover:underline" style={{ color: 'var(--accent-primary-strong)' }}>
                        {lead.leadNumber ?? 'Pending'}
                      </Link>
                    </td>
                    <td data-column="name" className="px-4 py-2 text-sm font-medium text-white">{leadName(lead)}</td>
                    <td data-column="company" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{lead.company ?? '—'}</td>
                    <td data-column="status" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatRecordLabel(lead.status, statusLabelMap)}</td>
                    <td data-column="source" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{lead.source ?? '—'}</td>
                    <td data-column="subsidiary" className="px-4 py-2 text-sm">
                      {lead.subsidiary ? (
                        <Link
                          href={`/subsidiaries/${lead.subsidiary.id}`}
                          className="hover:underline"
                          style={{ color: 'var(--accent-primary-strong)' }}
                        >
                          {lead.subsidiary.subsidiaryId}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>{'—'}</span>
                      )}
                    </td>
                    <td data-column="currency" className="px-4 py-2 text-sm">
                      {lead.currency ? (
                        <Link
                          href={`/currencies/${lead.currency.id}`}
                          className="hover:underline"
                          style={{ color: 'var(--accent-primary-strong)' }}
                        >
                          {lead.currency.code}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>{'—'}</span>
                      )}
                    </td>
                    <td data-column="db-id" className="px-4 py-2 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{lead.id}</td>
                    <td data-column="created" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{fmtDocumentDate(lead.createdAt, moneySettings)}</td>
                    <td data-column="last-modified" className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{fmtDocumentDate(lead.updatedAt, moneySettings)}</td>
                    <td data-column="actions" className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <ConvertLeadButton
                          leadId={lead.id}
                          canConvert={lead.status === 'qualified'}
                          opportunityId={lead.opportunity?.id ?? null}
                        />
                        <Link
                          href={`/leads/${lead.id}?edit=1`}
                          className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                          style={{ backgroundColor: 'var(--accent-primary-strong)' }}
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/leads/${lead.id}?customize=1`}
                          className="rounded-md border px-2.5 py-1 text-xs font-semibold"
                          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                        >
                          Customize
                        </Link>
                        <DeleteButton resource="leads" id={lead.id} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter
          startRow={pagination.startRow}
          endRow={pagination.endRow}
          total={totalLeads}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          prevHref={buildPageHref(pagination.currentPage - 1)}
          nextHref={buildPageHref(pagination.currentPage + 1)}
        />
      </section>
    </div>
  )
}
