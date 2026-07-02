import {cookies} from "next/headers";
import {AUTH_COOKIE, verifySession} from "@/lib/auth";
import {cloudStateConfigured, readCloudState, writeCloudState} from "@/lib/cloud-state";
import type {StoreState} from "@/lib/types";

async function isAllowed() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await isAllowed())) return Response.json({ok: false, message: "未登录。"}, {status: 401});
  if (!cloudStateConfigured()) return Response.json({ok: false, configured: false});
  const state = await readCloudState();
  return Response.json({ok: true, configured: true, state});
}

export async function PUT(request: Request) {
  if (!(await isAllowed())) return Response.json({ok: false, message: "未登录。"}, {status: 401});
  if (!cloudStateConfigured()) return Response.json({ok: false, configured: false});
  let body: {state?: StoreState};
  try {
    body = (await request.json()) as {state?: StoreState};
  } catch {
    return Response.json({ok: false, message: "请求格式不正确。"}, {status: 400});
  }
  if (!body.state) return Response.json({ok: false, message: "缺少 state。"}, {status: 400});
  const saved = await writeCloudState(body.state);
  return Response.json({ok: saved, configured: true});
}
