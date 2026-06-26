import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const CUSTOMER_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production')
const STAFF_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? 'dev-nextauth-secret-change-in-production')

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Extract insurer slug from subdomain ───────────────────────────────────
  const hostname = request.headers.get('host') ?? ''
  const parts = hostname.split('.')
  const potentialSlug = parts[0]
  const knownTlds = ['localhost', 'vercel', 'platform', 'www']

  const response = NextResponse.next()

  if (potentialSlug && !knownTlds.includes(potentialSlug) && parts.length > 2) {
    response.headers.set('x-insurer-slug', potentialSlug)
  }

  // ── Protect /underwriter/* routes ─────────────────────────────────────────
  if (pathname.startsWith('/underwriter') && !pathname.startsWith('/underwriter/login')) {
    const token =
      request.cookies.get('next-auth.session-token')?.value ??
      request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/underwriter/login', request.url))
    }

    try {
      const { payload } = await jwtVerify(token, STAFF_SECRET)
      const role = payload['role'] as string
      if (!['underwriter', 'insurer_admin', 'super_admin'].includes(role)) {
        return NextResponse.redirect(new URL('/underwriter/login', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/underwriter/login', request.url))
    }
  }

  // ── Protect /admin/* routes ───────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token =
      request.cookies.get('next-auth.session-token')?.value ??
      request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      const { payload } = await jwtVerify(token, STAFF_SECRET)
      const role = payload['role'] as string
      if (!['super_admin'].includes(role)) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // ── Protect /apply/* routes ───────────────────────────────────────────────
  if (pathname.startsWith('/apply')) {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      const step = pathname.split('/')[2]
      // Step 1 is the starting point — allow without auth
      if (step && step !== '1') {
        return NextResponse.redirect(new URL('/apply/1', request.url))
      }
    } else {
      try {
        await jwtVerify(token, CUSTOMER_SECRET)
      } catch {
        const res = NextResponse.redirect(new URL('/apply/1', request.url))
        res.cookies.delete('auth_token')
        return res
      }
    }
  }

  // ── Protect /policy and /payment pages ───────────────────────────────────
  if (pathname.startsWith('/payment') || pathname.startsWith('/policy')) {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    try {
      await jwtVerify(token, CUSTOMER_SECRET)
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/apply/:path*',
    '/payment/:path*',
    '/policy/:path*',
    '/resume/:path*',
    '/underwriter/:path*',
    '/admin/:path*',
  ],
}
