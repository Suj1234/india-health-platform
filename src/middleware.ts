import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const CUSTOMER_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production')
const STAFF_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? 'dev-nextauth-secret-change-in-production')

function extractInsurerSlug(pathname: string): string | null {
  // /i/[slug]/... → slug
  const match = pathname.match(/^\/i\/([^/]+)/)
  return match ? match[1] : null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // ── Inject insurer slug from path ─────────────────────────────────────────
  const slug = extractInsurerSlug(pathname)
  if (slug) {
    response.headers.set('x-insurer-slug', slug)
  }

  // ── Protect /superadmin/* (Phase 2: portal pages don't exist yet) ─────────
  if (pathname.startsWith('/superadmin') && !pathname.startsWith('/superadmin/login')) {
    const token =
      request.cookies.get('next-auth.session-token')?.value ??
      request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url))
    }
    try {
      const { payload } = await jwtVerify(token, STAFF_SECRET)
      if (payload['role'] !== 'superadmin') {
        return NextResponse.redirect(new URL('/superadmin/login', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/superadmin/login', request.url))
    }
  }

  // ── Protect /i/[slug]/admin/* ─────────────────────────────────────────────
  if (slug && pathname.match(/^\/i\/[^/]+\/admin/) && !pathname.match(/^\/i\/[^/]+\/admin\/login/)) {
    const token =
      request.cookies.get('next-auth.session-token')?.value ??
      request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!token) {
      return NextResponse.redirect(new URL(`/i/${slug}/admin/login`, request.url))
    }
    try {
      const { payload } = await jwtVerify(token, STAFF_SECRET)
      const role = payload['role'] as string
      if (!['insurer_admin', 'superadmin'].includes(role)) {
        return NextResponse.redirect(new URL(`/i/${slug}/admin/login`, request.url))
      }
    } catch {
      return NextResponse.redirect(new URL(`/i/${slug}/admin/login`, request.url))
    }
  }

  // ── Protect /i/[slug]/underwriter/* ──────────────────────────────────────
  if (slug && pathname.match(/^\/i\/[^/]+\/underwriter/) && !pathname.match(/^\/i\/[^/]+\/underwriter\/login/)) {
    const token =
      request.cookies.get('next-auth.session-token')?.value ??
      request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!token) {
      return NextResponse.redirect(new URL(`/i/${slug}/underwriter/login`, request.url))
    }
    try {
      const { payload } = await jwtVerify(token, STAFF_SECRET)
      const role = payload['role'] as string
      if (!['underwriter', 'insurer_admin', 'superadmin'].includes(role)) {
        return NextResponse.redirect(new URL(`/i/${slug}/underwriter/login`, request.url))
      }
    } catch {
      return NextResponse.redirect(new URL(`/i/${slug}/underwriter/login`, request.url))
    }
  }

  // ── Legacy: protect /underwriter/* (existing UW portal, not yet migrated) ─
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
      if (!['underwriter', 'insurer_admin', 'superadmin'].includes(role)) {
        return NextResponse.redirect(new URL('/underwriter/login', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/underwriter/login', request.url))
    }
  }

  // ── Protect /i/[slug]/apply/* (steps 2–7 require customer auth) ───────────
  if (slug && pathname.match(/^\/i\/[^/]+\/apply\/(\d+)/)) {
    const stepMatch = pathname.match(/^\/i\/[^/]+\/apply\/(\d+)/)
    const step = stepMatch?.[1]
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      if (step && step !== '1') {
        return NextResponse.redirect(new URL(`/i/${slug}/apply/1`, request.url))
      }
    } else {
      try {
        await jwtVerify(token, CUSTOMER_SECRET)
      } catch {
        const res = NextResponse.redirect(new URL(`/i/${slug}/apply/1`, request.url))
        res.cookies.delete('auth_token')
        return res
      }
    }
  }

  // ── Protect /i/[slug]/payment and /i/[slug]/policy ───────────────────────
  if (slug && (pathname.match(/^\/i\/[^/]+\/payment/) || pathname.match(/^\/i\/[^/]+\/policy/))) {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL(`/i/${slug}/apply/1`, request.url))
    }
    try {
      await jwtVerify(token, CUSTOMER_SECRET)
    } catch {
      return NextResponse.redirect(new URL(`/i/${slug}/apply/1`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/i/:slug*/apply/:path*',
    '/i/:slug*/payment/:path*',
    '/i/:slug*/policy/:path*',
    '/i/:slug*/underwriter/:path*',
    '/i/:slug*/admin/:path*',
    '/underwriter/:path*',
    '/superadmin/:path*',
  ],
}
