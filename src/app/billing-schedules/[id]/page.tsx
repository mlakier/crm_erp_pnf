import { BillingMasterDataDetailPage } from '@/lib/billing-subscription-master-data-pages'

export default function BillingScheduleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  return <BillingMasterDataDetailPage entityKey="billing-schedules" params={params} searchParams={searchParams} />
}
