import { NextRequest, NextResponse } from 'next/server'
import {
  defaultLeadDetailCustomization,
  LEAD_DETAIL_FIELDS,
  type LeadDetailCustomizationConfig,
} from '@/lib/lead-detail-customization'
import {
  loadLeadDetailCustomization,
  saveLeadDetailCustomization,
} from '@/lib/lead-detail-customization-store'

export async function GET() {
  try {
    const config = await loadLeadDetailCustomization()
    return NextResponse.json({ config, fields: LEAD_DETAIL_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to load lead detail customization' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const nextConfig =
      ((body as { config?: unknown }).config as LeadDetailCustomizationConfig | undefined) ??
      defaultLeadDetailCustomization()
    const saved = await saveLeadDetailCustomization(nextConfig)
    return NextResponse.json({ config: saved, fields: LEAD_DETAIL_FIELDS })
  } catch {
    return NextResponse.json({ error: 'Failed to save lead detail customization' }, { status: 500 })
  }
}
