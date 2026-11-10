"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    setRegistered(
      new URLSearchParams(window.location.search).get("registered") === "true"
    );
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!API_URL) {
        throw new Error("API URL is not configured.");
      }

      const response = await fetch(`${API_URL}/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid username or password.");
      }

      const data = await response.json();

      sessionStorage.setItem("accessToken", data.access);
      sessionStorage.setItem("refreshToken", data.refresh);

      router.push("/collection");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="mb-2 text-sm tracking-widest text-lavender">MANIBOOK</p>

        <h1 className="mb-2 text-3xl font-serif text-lavender">Welcome back</h1>

        <p className="mb-6 text-sm text-muted">
          Your nail collection, all in one place.
        </p>

        {registered && (
          <p className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
            Your account was created successfully. You can now sign in.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm">
              Username
            </label>
            <input
              id="username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border p-3 outline-none focus:border-[#C77F98]"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border p-3 outline-none focus:border-[#C77F98]"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#783B52] p-3 text-white transition hover:bg-[#633044] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-lavender transition hover:text-[#C026D3]"
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
