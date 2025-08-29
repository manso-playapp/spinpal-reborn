import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Las rutas públicas siempre están permitidas
  if (pathname.startsWith('/juego/') || pathname === '/' || pathname === '/login') {
    return NextResponse.next()
  }

  // Verificar autenticación para rutas administrativas
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('session')
    if (!session?.value) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Todo lo demás se permite
  return NextResponse.next()
}
 
export const config = {
  matcher: [
    '/admin/:path*'
  ]
}
