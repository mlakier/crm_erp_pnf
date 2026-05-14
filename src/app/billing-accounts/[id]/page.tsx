import { BillingMasterDataDetailPage } from '@/lib/billing-subscription-master-data-pages'

export default function BillingAccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  return <BillingMasterDataDetailPage entityKey="billing-accounts" params={params} searchParams={searchParams} />
}
