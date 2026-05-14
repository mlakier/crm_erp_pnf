import MasterDataImportForm from '@/components/MasterDataImportForm'

export default function MasterDataImportPage() {
  return (
    <div className="min-h-full px-8 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section
          className="overflow-hidden rounded-3xl border"
          style={{
            borderColor: 'var(--border-muted)',
            background:
              'linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(15, 23, 42, 0.92) 42%, rgba(8, 47, 73, 0.22))',
          }}
        >
          <div className="grid gap-6 p-7 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--text-muted)' }}>
                Data Management
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Master Data Import</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Download an up-to-date template, validate the file safely, then commit clean master-data changes. Templates now include active custom fields automatically and uploads understand both technical keys and current field labels.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ['1', 'Download', 'Get the latest template for the selected record type.'],
                ['2', 'Validate', 'Run a dry run before anything writes to the database.'],
                ['3', 'Commit', 'Import only after row-level errors are clean.'],
              ].map(([number, title, description]) => (
                <div key={number} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-muted)', backgroundColor: 'rgba(15, 23, 42, 0.55)' }}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>
                      {number}
                    </span>
                    <span className="text-sm font-semibold text-white">{title}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
          <MasterDataImportForm />
        </section>
      </div>
    </div>
  )
}
