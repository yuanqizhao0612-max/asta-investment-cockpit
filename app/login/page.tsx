"use client";

import {useState} from "react";
import {LockKeyhole} from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({password}),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setMessage(payload.message || "登录失败。");
        return;
      }
      window.location.href = "/";
    } catch {
      setMessage("登录失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <form onSubmit={submit} className="apple-card grid w-full max-w-sm gap-4 p-6">
        <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#111827] text-white">
          <LockKeyhole size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Asta 登录</h1>
          <p className="mt-2 text-sm leading-6 text-[#68726d]">输入你部署时设置的访问密码。这个入口只用于保护你的个人投资驾驶舱。</p>
        </div>
        <label className="label">访问密码<input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required /></label>
        {message && <p className="text-sm font-medium text-[#a15b52]">{message}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "登录中" : "登录"}</button>
      </form>
    </main>
  );
}
