import {NextResponse, type NextRequest} from "next/server";

const AUTH_COOKIE = "asta_session";

async function sha256Hmac(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function proxy(request: NextRequest) {
  const password = process.env.ASTA_APP_PASSWORD;
  if (!password) return NextResponse.next();

  const {pathname} = request.nextUrl;
  const publicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/opportunities/daily") ||
    pathname.startsWith("/api/opportunities/daily") ||
    pathname.startsWith("/api/opportunity-radar/scan") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";
  if (publicPath) return NextResponse.next();

  const secret = process.env.AUTH_SECRET || password;
  const expected = await sha256Hmac(secret, "asta-owner-session");
  const actual = request.cookies.get(AUTH_COOKIE)?.value;
  if (actual === expected) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
