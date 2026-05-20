import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface OrganizationProfile {
  id: string;
  name: string;
  logoUrl: string | null;
  contactEmail: string | null;
  schoolType: string;
  timezone: string;
  country: string | null;
  currency: string;
}

export function OrganizationPage() {
  const { user } = useAuth();
  const canEdit = useMemo(() => ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(user?.role ?? ""), [user?.role]);

  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const loadProfile = async () => {
    const response = await api.get<OrganizationProfile>("/organization/profile");
    setProfile(response.data);
    setName(response.data.name);
    setLogoUrl(response.data.logoUrl ?? "");
    setContactEmail(response.data.contactEmail ?? "");
  };

  useEffect(() => {
    loadProfile().catch(() => setStatus("Unable to load organization profile."));
  }, []);

  const onLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== "image/png") {
      setStatus("Only PNG logo files are allowed.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setStatus("Logo file is too large. Maximum size is 2MB.");
      return;
    }

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(String(reader.result ?? ""));
      setStatus("PNG logo loaded. Click Save Profile to apply.");
      setUploadingLogo(false);
    };
    reader.onerror = () => {
      setStatus("Unable to read selected PNG file.");
      setUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("");

    try {
      await api.put("/organization/profile", {
        name,
        logoUrl,
        contactEmail
      });
      window.dispatchEvent(new Event("branding-updated"));
      setStatus("Organization profile updated.");
      await loadProfile();
    } catch {
      setStatus("Unable to update organization profile.");
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Company or School Management</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage branding details used across the platform.</p>
      </header>

      {status ? <p className="rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-sm">{status}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <form className="card-surface grid gap-3 p-4" onSubmit={saveProfile}>
          <label className="text-sm">
            School or Company Name
            <input className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} required />
          </label>

          <label className="text-sm">
            Upload Logo (PNG)
            <input className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="file" accept="image/png" onChange={onLogoFileChange} disabled={!canEdit || uploadingLogo} />
          </label>

          <label className="text-sm">
            Logo URL or PNG Data
            <input className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} disabled={!canEdit} placeholder="https://example.com/logo.png or uploaded PNG data" />
          </label>

          <label className="text-sm">
            Contact Email
            <input className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} disabled={!canEdit} placeholder="info@school.com" />
          </label>

          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white disabled:opacity-60" type="submit" disabled={!canEdit}>
            Save Profile
          </button>

          {!canEdit ? <p className="text-xs text-[hsl(var(--muted-foreground))]">Only SCHOOL_ADMIN and SUPER_ADMIN can edit these fields.</p> : null}
        </form>

        <div className="card-surface p-4">
          <h3 className="mb-3 font-heading text-lg font-bold">Brand Preview</h3>
          <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Organization logo" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-xs font-bold">
                {name.slice(0, 2).toUpperCase() || "SM"}
              </div>
            )}
            <div>
              <p className="font-semibold">{name || profile?.name || "School"}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{contactEmail || profile?.contactEmail || "No contact email"}</p>
            </div>
          </div>

          <ul className="mt-4 space-y-1 text-sm text-[hsl(var(--muted-foreground))]">
            <li>Type: {profile?.schoolType ?? "-"}</li>
            <li>Timezone: {profile?.timezone ?? "-"}</li>
            <li>Country: {profile?.country ?? "-"}</li>
            <li>Currency: {profile?.currency ?? "-"}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
