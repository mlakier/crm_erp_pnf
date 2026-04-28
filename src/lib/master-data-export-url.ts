export function buildMasterDataExportUrl(
  resource: string,
  query?: string,
  sort?: string,
  extraParams?: Record<string, string | undefined>,
) {
  const search = new URLSearchParams({ resource })
  if (query) search.set('q', query)
  if (sort) search.set('sort', sort)
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) search.set(key, value)
    }
  }
  return `/api/master-data-export?${search.toString()}`
}
