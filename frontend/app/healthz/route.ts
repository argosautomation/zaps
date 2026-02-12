
import { NextResponse } from 'next/server';

export async function GET() {
    console.log('[Healthz] Health check request received');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
}
