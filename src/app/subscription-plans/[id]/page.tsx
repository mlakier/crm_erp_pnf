import { BillingMasterDataDetailPage } from '@/lib/billing-subscription-master-data-pages'

export default function SubscriptionPlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  return <BillingMasterDataDetailPage entityKey="subscription-plans" params={params} searchParams={searchParams} />
}
