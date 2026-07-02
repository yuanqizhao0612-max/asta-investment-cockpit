import {AUTH_COOKIE, sessionToken, verifyPassword} from "@/lib/auth";

export async function POST(request: Request) {
  let body: {password?: unknown};
  try {
    body = (await request.json()) as {password?: unknown};
  } catch {
    return Response.json({ok: false, message: "请求格式不正确。"}, {status: 400});
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyPassword(password)) {
    return Response.json({ok: false, message: "密码不正确。"}, {status: 401});
  }

  const response = Response.json({ok: true});
  response.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE}=${sessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  );
  return response;
}
