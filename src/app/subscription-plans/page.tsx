import { BillingMasterDataListPage } from '@/lib/billing-subscription-master-data-pages'

export default function SubscriptionPlansPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) {
  return <BillingMasterDataListPage entityKey="subscription-plans" searchParams={searchParams} />
}
