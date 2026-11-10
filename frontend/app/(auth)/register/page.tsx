"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Client-side password confirmation.
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!API_URL) {
      setError("API URL is not configured.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract useful Django REST Framework validation errors.
        const messages = Object.entries(data).flatMap(([field, errors]) => {
          const errorMessages = Array.isArray(errors) ? errors : [errors];

          return errorMessages.map((message) => {
            if (field === "non_field_errors") {
              return String(message);
            }

            return `${field}: ${message}`;
          });
        });

        throw new Error(
          messages.length > 0
            ? messages.join(" ")
            : "Registration failed. Please try again."
        );
      }

      // Registration successful. Send the user to login.
      router.push("/login?registered=true");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="mb-2 text-sm tracking-widest text-lavender">MANIBOOK</p>

        <h1 className="mb-2 text-3xl font-serif text-lavender">
          Create your account
        </h1>

        <p className="mb-6 text-sm text-muted">
          Start organizing your nail collection.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label htmlFor="username" className="mb-1 block text-sm">
              Username
            </label>

            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-3 text-text outline-none transition focus:border-[#C026D3]"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm">
              Email <span className="text-muted">(optional)</span>
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-3 text-text outline-none transition focus:border-[#C026D3]"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm">
              Password
            </label>

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-3 text-text outline-none transition focus:border-[#C026D3]"
            />
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm">
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-3 text-text outline-none transition focus:border-[#C026D3]"
            />
          </div>

          {/* Show password */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="accent-[#C026D3]"
            />
            Show passwords
          </label>

          {/* Error */}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#783B52] p-3 text-white transition hover:bg-[#633044] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-lavender transition hover:text-[#C026D3]"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
