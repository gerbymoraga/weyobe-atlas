import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function SignupPage() {
  const { member, signup, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && member) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signup(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-md border border-[var(--line)] bg-panel p-8"
      >
        <p className="font-display text-3xl tracking-[0.12em]">Join ATLAS</p>
        <p className="mt-1 font-ui text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Navigator membership
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <label className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
            First name
            <input
              className="mt-2 w-full border border-[var(--line)] bg-ink px-3 py-2 text-bone outline-none focus:border-brass"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              required
            />
          </label>
          <label className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
            Last name
            <input
              className="mt-2 w-full border border-[var(--line)] bg-ink px-3 py-2 text-bone outline-none focus:border-brass"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              required
            />
          </label>
        </div>
        <label className="mt-4 block font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
          Email
          <input
            className="mt-2 w-full border border-[var(--line)] bg-ink px-3 py-2 text-bone outline-none focus:border-brass"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label className="mt-4 block font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
          Password
          <input
            className="mt-2 w-full border border-[var(--line)] bg-ink px-3 py-2 text-bone outline-none focus:border-brass"
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>
        {error ? <p className="mt-3 font-ui text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full bg-brass px-4 py-3 font-ui text-sm uppercase tracking-[0.14em] text-ink disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
        <p className="mt-4 text-center font-ui text-sm text-[var(--muted)]">
          Already a member?{" "}
          <Link to="/login" className="text-brass hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
