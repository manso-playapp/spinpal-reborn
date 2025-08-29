import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Si es una ruta pública, permitir acceso sin verificación
  if (pathname.startsWith('/juego/') || pathname === '/' || pathname === '/login') {
    return NextResponse.next()
  }

  // Si es una ruta administrativa o del cliente, verificar autenticación
  if (pathname.startsWith('/admin') || pathname.startsWith('/client')) {
    const session = request.cookies.get('session')
    if (!session?.value) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}
 
export const config = {
  matcher: [
    // Rutas que requieren autenticación
    '/admin/:path*',
    '/client/:path*',
    // Rutas públicas que queremos procesar
    '/juego/:path*'
  ]
}
