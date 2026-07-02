import {cookies} from "next/headers";
import {AUTH_COOKIE, authEnabled, verifySession} from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const authenticated = verifySession(cookieStore.get(AUTH_COOKIE)?.value);
  return Response.json({ok: true, authEnabled: authEnabled(), authenticated});
}
