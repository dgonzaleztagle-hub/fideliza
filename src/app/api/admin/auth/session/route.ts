import { NextResponse } from 'next/server'
import { getAdminEmailFromCookie } from '@/lib/adminSession'

export async function GET() {
    const email = await getAdminEmailFromCookie()
    if (!email) return NextResponse.json({ authenticated: false }, { status: 401 })
    return NextResponse.json({ authenticated: true, email })
}

