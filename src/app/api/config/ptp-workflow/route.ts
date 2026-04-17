import { NextRequest, NextResponse } from 'next/server';
import { loadPtpWorkflowConfig, savePtpWorkflowConfig } from '@/lib/ptp-workflow-store';

export async function GET() {
  const config = await loadPtpWorkflowConfig();
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const { config } = await req.json();
  await savePtpWorkflowConfig(config);
  return NextResponse.json({ config });
}
