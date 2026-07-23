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
    <div className="auth-shell">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="auth-card"
        noValidate
      >
        <p className="auth-brand">Join ATLAS</p>
        <p className="auth-sub">Navigator membership</p>
        <div className="auth-row">
          <label className="auth-field">
            First name
            <input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              required
              autoComplete="given-name"
            />
          </label>
          <label className="auth-field">
            Last name
            <input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              required
              autoComplete="family-name"
            />
          </label>
        </div>
        <label className="auth-field">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
          />
        </label>
        <label className="auth-field">
          Password
          <input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            autoComplete="new-password"
          />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </button>
        <p className="auth-footer">
          Already a member? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
