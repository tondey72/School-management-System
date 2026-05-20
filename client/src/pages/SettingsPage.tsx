import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { applyCompactMode } from "@/lib/ui-preferences";
import { useAuth } from "@/context/AuthContext";

interface UserSettingsResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  mfaEnabled: boolean;
  preferences: {
    theme: "light" | "dark" | "system";
    timezone: string;
    dateFormat: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";
    compactMode: boolean;
  };
}

export function SettingsPage() {
  const { setThemeMode } = useTheme();
  const { refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "preferences" ? "preferences" : "profile";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState<"YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY">("YYYY-MM-DD");
  const [compactMode, setCompactMode] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get<UserSettingsResponse>("/settings/me");
      setEmail(response.data.email);
      setFullName(response.data.fullName);
      setRole(response.data.role);
      setMfaEnabled(response.data.mfaEnabled);
      setTheme(response.data.preferences.theme);
      setTimezone(response.data.preferences.timezone);
      setDateFormat(response.data.preferences.dateFormat);
      setCompactMode(response.data.preferences.compactMode);
      setThemeMode(response.data.preferences.theme);
      applyCompactMode(response.data.preferences.compactMode);
      setError("");
    } catch {
      setError("Unable to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings().catch(() => undefined);
  }, []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.put("/settings/me/profile", {
        fullName,
        mfaEnabled
      });
      await refreshUser();
      setSuccess("Profile settings saved.");
    } catch {
      setError("Unable to save profile settings.");
    }
  };

  const savePreferences = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.put("/settings/me/preferences", {
        theme,
        timezone,
        dateFormat,
        compactMode
      });
      setThemeMode(theme);
      applyCompactMode(compactMode);
      setSuccess("System preferences saved.");
    } catch {
      setError("Unable to save system preferences.");
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Settings and System Preferences</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage your profile and personalize workspace preferences.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button className={`rounded-xl px-3 py-2 text-sm font-semibold ${tab === "profile" ? "bg-brand text-white" : "border border-[hsl(var(--border))]"}`} type="button" onClick={() => setSearchParams({ tab: "profile" })}>Profile Settings</button>
        <button className={`rounded-xl px-3 py-2 text-sm font-semibold ${tab === "preferences" ? "bg-brand text-white" : "border border-[hsl(var(--border))]"}`} type="button" onClick={() => setSearchParams({ tab: "preferences" })}>System Preferences</button>
      </div>

      {error ? <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600">{success}</p> : null}
      {loading ? <p className="text-sm">Loading settings...</p> : null}

      {tab === "profile" ? (
        <form className="card-surface grid gap-3 p-4 md:grid-cols-2" onSubmit={saveProfile}>
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="email" value={email} disabled />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={role} disabled />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 md:col-span-2" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" required />
          <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
            <input checked={mfaEnabled} onChange={(event) => setMfaEnabled(event.target.checked)} type="checkbox" />
            Enable multi-factor authentication flag
          </label>
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white md:col-span-2" type="submit">Save Profile</button>
        </form>
      ) : null}

      {tab === "preferences" ? (
        <form className="card-surface grid gap-3 p-4 md:grid-cols-2" onSubmit={savePreferences}>
          <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")}> 
            <option value="system">Theme: System</option>
            <option value="light">Theme: Light</option>
            <option value="dark">Theme: Dark</option>
          </select>

          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Timezone e.g. Africa/Nairobi" required />

          <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={dateFormat} onChange={(event) => setDateFormat(event.target.value as "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY")}> 
            <option value="YYYY-MM-DD">Date Format: YYYY-MM-DD</option>
            <option value="DD/MM/YYYY">Date Format: DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">Date Format: MM/DD/YYYY</option>
          </select>

          <label className="inline-flex items-center gap-2 text-sm">
            <input checked={compactMode} onChange={(event) => setCompactMode(event.target.checked)} type="checkbox" />
            Enable compact mode
          </label>

          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white md:col-span-2" type="submit">Save Preferences</button>
        </form>
      ) : null}
    </section>
  );
}
