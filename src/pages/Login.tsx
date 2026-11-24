import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, ShieldCheck, AlertCircle, Database } from "lucide-react";
import { useAuth } from "../components/auth/AuthProvider";

export const Login: React.FC = () => {
  const { login, loading, user, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/dashboard";

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-base text-primary">Checking session…</div>;
  }
  if (user) return <Navigate to={destination} replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Check your credentials and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-base text-primary flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md bg-surface border border-border-hairline rounded-2xl shadow-card p-7 sm:p-9">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-elevated border border-border-hairline grid place-items-center">
            <ShieldCheck className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-serif text-2xl leading-none">ADRAB</p>
            <p className="text-xs text-muted mt-1">Secure clinical workspace</p>
          </div>
        </div>

        <h1 className="font-serif text-2xl font-medium">Sign in</h1>
        <p className="text-sm text-secondary mt-2 mb-6">
          Use the account created for your ADRAB Supabase project.
        </p>

        {!isConfigured ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">Backend setup required</span>
            </div>
            <p className="text-sm text-secondary">
              Authentication is not configured yet. Add the Supabase project URL and public anon key to the environment before using sign-in.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full rounded-lg bg-btn-primary-bg text-btn-primary-text px-4 py-2.5 text-sm font-medium"
            >
              Continue to demo preview
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium text-secondary mb-1.5">Email address</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg bg-elevated border border-border-hairline px-3 py-2.5 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
                placeholder="you@hospital.org"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-secondary mb-1.5">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg bg-elevated border border-border-hairline px-3 py-2.5 text-sm text-primary outline-none focus:ring-2 focus:ring-accent/40"
                placeholder="Enter your password"
              />
            </label>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-btn-primary-bg text-btn-primary-text px-4 py-3 text-sm font-semibold disabled:opacity-50"
            >
              <LockKeyhole className="w-4 h-4" />
              {submitting ? "Signing in…" : "Sign in securely"}
            </button>
          </form>
        )}
        <p className="text-[11px] leading-relaxed text-muted mt-7">
          Access is managed by your project administrator. Do not use real patient records in demo preview.
        </p>
      </section>
    </main>
  );
};
