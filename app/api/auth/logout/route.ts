import {AUTH_COOKIE} from "@/lib/auth";

export async function POST() {
  const response = Response.json({ok: true});
  response.headers.append("Set-Cookie", `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
