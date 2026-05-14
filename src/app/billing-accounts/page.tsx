import { BillingMasterDataListPage } from '@/lib/billing-subscription-master-data-pages'

export default function BillingAccountsPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) {
  return <BillingMasterDataListPage entityKey="billing-accounts" searchParams={searchParams} />
}
