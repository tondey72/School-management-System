import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface SystemUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface BulkImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

const adminRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN"];

export function UsersPage() {
  const { user } = useAuth();
  const canManageUsers = adminRoles.includes(user?.role ?? "");

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("TEACHER");
  const [password, setPassword] = useState("");

  const [csvInput, setCsvInput] = useState("email,fullName,role,password");
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([api.get<SystemUser[]>("/users"), api.get<string[]>("/users/roles")]);
      setUsers(usersResponse.data);
      setRoles(rolesResponse.data);
      if (!role && rolesResponse.data.length > 0) {
        setRole(rolesResponse.data[0]);
      }
      setError("");
    } catch {
      setError("Unable to load users module data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canManageUsers) {
      setLoading(false);
      return;
    }

    loadData().catch(() => undefined);
  }, [canManageUsers]);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/users", {
        email,
        fullName,
        role,
        password: password || undefined
      });
      setEmail("");
      setFullName("");
      setPassword("");
      setSuccess("User created successfully.");
      await loadData();
    } catch {
      setError("Unable to create user. Validate fields and try again.");
    }
  };

  const parseCsvInput = () => {
    const rows = csvInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      return [];
    }

    return rows.slice(1).map((line) => {
      const [csvEmail, csvFullName, csvRole, csvPassword] = line.split(",").map((value) => value.trim());
      return {
        email: csvEmail,
        fullName: csvFullName,
        role: csvRole,
        password: csvPassword || undefined
      };
    });
  };

  const bulkImport = async () => {
    setError("");
    setSuccess("");
    setBulkResult(null);

    const importUsers = parseCsvInput();
    if (importUsers.length === 0) {
      setError("Add at least one CSV row after the header.");
      return;
    }

    try {
      const response = await api.post<BulkImportResult>("/users/bulk-import", {
        users: importUsers
      });
      setBulkResult(response.data);
      setSuccess(`Bulk import finished: ${response.data.created} created, ${response.data.skipped} skipped.`);
      await loadData();
    } catch {
      setError("Bulk import failed. Confirm CSV headers and role names.");
    }
  };

  const exportUsers = async () => {
    setError("");

    try {
      const response = await api.get("/users/export", { responseType: "blob" });
      const downloadUrl = window.URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "system-users.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      setError("Unable to export users at the moment.");
    }
  };

  if (!canManageUsers) {
    return (
      <section className="space-y-3">
        <h2 className="font-heading text-3xl font-extrabold">User Management</h2>
        <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-700">Only SUPER_ADMIN and SCHOOL_ADMIN roles can manage system users.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-3xl font-extrabold">User Management</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Create, bulk import, and export system users.</p>
        </div>
        <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm font-semibold" type="button" onClick={exportUsers}>Export Users CSV</button>
      </header>

      {error ? <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600">{success}</p> : null}
      {loading ? <p className="text-sm">Loading users...</p> : null}

      <form className="card-surface grid gap-3 p-4 md:grid-cols-2" onSubmit={createUser}>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={role} onChange={(event) => setRole(event.target.value)}>
          {(roles.length > 0 ? roles : ["TEACHER", "STUDENT", "PARENT"]).map((roleName) => (
            <option key={roleName} value={roleName}>{roleName}</option>
          ))}
        </select>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="password" placeholder="Temporary password (optional)" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white md:col-span-2" type="submit">Create User</button>
      </form>

      <div className="card-surface space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold">Bulk Import Users</h3>
          <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm" type="button" onClick={bulkImport}>Run Import</button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">CSV format: email,fullName,role,password</p>
        <textarea className="min-h-36 w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 font-mono text-xs" value={csvInput} onChange={(event) => setCsvInput(event.target.value)} />
        {bulkResult ? (
          <div className="space-y-1 text-xs">
            <p>Created: {bulkResult.created}</p>
            <p>Skipped: {bulkResult.skipped}</p>
            {bulkResult.errors.slice(0, 5).map((item) => (
              <p key={item} className="text-red-600">{item}</p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card-surface overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{item.fullName}</td>
                <td className="py-2">{item.email}</td>
                <td className="py-2">{item.role}</td>
                <td className="py-2">{item.isActive ? "Active" : "Inactive"}</td>
                <td className="py-2">{new Date(item.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
