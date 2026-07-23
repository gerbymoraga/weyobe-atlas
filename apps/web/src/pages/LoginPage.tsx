import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const { member, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && member) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-lg border border-[var(--line)] bg-panel p-8 sm:p-10"
      >
        <p className="font-display text-3xl tracking-[0.12em] text-bone">ATLAS</p>
        <p className="mt-1 font-ui text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Member portal
        </p>
        <label className="mt-8 block font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
          Email
          <input
            className="mt-2 block w-full border border-[var(--line)] bg-ink px-3 py-3 text-base text-bone outline-none focus:border-brass"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="mt-4 block font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
          Password
          <input
            className="mt-2 block w-full border border-[var(--line)] bg-ink px-3 py-3 text-base text-bone outline-none focus:border-brass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="mt-3 font-ui text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 block w-full bg-brass px-4 py-3.5 font-ui text-sm uppercase tracking-[0.14em] text-ink disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center font-ui text-sm text-[var(--muted)]">
          New here?{" "}
          <Link to="/signup" className="text-brass hover:underline">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
