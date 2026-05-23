import { FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@demo-school.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setError(error.response.data.message);
      } else {
        setError("Login failed. Verify credentials and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-surface w-full max-w-md space-y-4 p-6"
      >
        <header>
          <h1 className="font-heading text-2xl font-extrabold">Sign In</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Access your school operations workspace.</p>
        </header>

        <label className="block text-sm">
          <span>Email</span>
          <input
            className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
          />
        </label>

        <label className="block text-sm">
          <span>Password</span>
          <input
            className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded-xl bg-brand px-4 py-2 font-semibold text-white disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </motion.form>
    </main>
  );
}
