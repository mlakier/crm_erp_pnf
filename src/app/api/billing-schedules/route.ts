import {
  createBillingMasterDataRow,
  deleteBillingMasterDataRow,
  getBillingMasterDataRows,
  updateBillingMasterDataRow,
} from '@/lib/billing-subscription-master-data-api'

const KEY = 'billing-schedules'

export function GET() {
  return getBillingMasterDataRows(KEY)
}

export function POST(request: Request) {
  return createBillingMasterDataRow(KEY, request)
}

export function PUT(request: Request) {
  return updateBillingMasterDataRow(KEY, request)
}

export function DELETE(request: Request) {
  return deleteBillingMasterDataRow(KEY, request)
}
