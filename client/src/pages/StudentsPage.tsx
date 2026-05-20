import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Student {
  id: string;
  studentCode?: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  email?: string;
  nationalId?: string;
  dateOfBirth: string;
  gender?: "MALE" | "FEMALE";
  address?: string;
  phone?: string;
  parentName?: string | null;
  parentPhone?: string | null;
}

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [admissionNo, setAdmissionNo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [parentAction, setParentAction] = useState<"UPDATE" | "REMOVE" | "REPLACE">("UPDATE");

  const loadStudents = async (query?: string) => {
    try {
      setLoading(true);
      const response = await api.get<Student[]>("/students", {
        params: query ? { q: query } : undefined
      });
      setStudents(response.data);
      setError(null);
    } catch {
      setError("Unable to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents(search).catch(() => undefined);
  }, [search]);

  useEffect(() => {
    loadStudents().catch(() => undefined);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.post("/students", {
        admissionNo: admissionNo || undefined,
        firstName,
        lastName,
        email: email || undefined,
        nationalId: nationalId || undefined,
        dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`).toISOString()
        ,
        gender,
        address: address || undefined,
        phone: phone || undefined,
        parentName: parentName || undefined,
        parentPhone: parentPhone || undefined
      });
      setAdmissionNo("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setNationalId("");
      setDateOfBirth("");
      setGender("MALE");
      setAddress("");
      setPhone("");
      setParentName("");
      setParentPhone("");
      setParentAction("UPDATE");
      await loadStudents();
    } catch {
      setError("Failed to create student. Check your input.");
    }
  };

  const beginEdit = (student: Student) => {
    setEditingStudentId(student.id);
    setAdmissionNo(student.admissionNo ?? "");
    setFirstName(student.firstName ?? "");
    setLastName(student.lastName ?? "");
    setEmail(student.email ?? "");
    setNationalId(student.nationalId ?? "");
    setDateOfBirth(student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : "");
    setGender(student.gender ?? "MALE");
    setAddress(student.address ?? "");
    setPhone(student.phone ?? "");
    setParentName(student.parentName ?? "");
    setParentPhone(student.parentPhone ?? "");
    setParentAction(student.parentName ? "UPDATE" : "REPLACE");
  };

  const cancelEdit = () => {
    setEditingStudentId(null);
    setAdmissionNo("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setNationalId("");
    setDateOfBirth("");
    setGender("MALE");
    setAddress("");
    setPhone("");
    setParentName("");
    setParentPhone("");
    setParentAction("UPDATE");
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingStudentId) {
      return;
    }

    try {
      await api.put(`/students/${editingStudentId}`, {
        admissionNo: admissionNo || undefined,
        firstName,
        lastName,
        email: email || undefined,
        nationalId: nationalId || undefined,
        dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`).toISOString(),
        gender,
        address: address || undefined,
        phone: phone || undefined,
        parentName: parentAction === "REMOVE" ? undefined : parentName || undefined,
        parentPhone: parentAction === "REMOVE" ? undefined : parentPhone || undefined,
        parentRemove: parentAction === "REMOVE",
        parentReplace: parentAction === "REPLACE"
      });
      cancelEdit();
      await loadStudents();
    } catch {
      setError("Failed to update student. Check your input.");
    }
  };

  const handleDelete = async (student: Student) => {
    const confirmed = window.confirm(`Delete ${student.firstName} ${student.lastName}? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/students/${student.id}`);
      if (editingStudentId === student.id) {
        cancelEdit();
      }
      await loadStudents(search);
    } catch {
      setError("Failed to delete student.");
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Student Information System</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage admissions and student records with expanded demographic and parent details.</p>
      </header>

      <div className="card-surface p-4">
        <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 md:max-w-xl" placeholder="Search by first/last name, admission number, or national ID" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <form className="card-surface grid gap-3 p-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Admission No (optional; defaults to generated Student ID)" value={admissionNo} onChange={(event) => setAdmissionNo(event.target.value)} />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="National ID" value={nationalId} onChange={(event) => setNationalId(event.target.value)} />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} required />
        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={gender} onChange={(event) => setGender(event.target.value as "MALE" | "FEMALE")}> 
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Phone Number" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 md:col-span-2" placeholder="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Parent Name" value={parentName} onChange={(event) => setParentName(event.target.value)} />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Parent Phone" value={parentPhone} onChange={(event) => setParentPhone(event.target.value)} />
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Add Student</button>
      </form>

      {editingStudentId ? (
        <form className="card-surface grid gap-3 border-2 border-brand/40 p-4 md:grid-cols-2" onSubmit={handleUpdate}>
          <h3 className="md:col-span-2 font-heading text-lg font-bold">Edit Student</h3>
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Admission No" value={admissionNo} onChange={(event) => setAdmissionNo(event.target.value)} required />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="National ID" value={nationalId} onChange={(event) => setNationalId(event.target.value)} />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} required />
          <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={gender} onChange={(event) => setGender(event.target.value as "MALE" | "FEMALE")}> 
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Phone Number" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 md:col-span-2" placeholder="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
          <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 md:col-span-2" value={parentAction} onChange={(event) => setParentAction(event.target.value as "UPDATE" | "REMOVE" | "REPLACE")}>
            <option value="UPDATE">Parent action: Update existing parent</option>
            <option value="REPLACE">Parent action: Replace with a new parent</option>
            <option value="REMOVE">Parent action: Remove parent link</option>
          </select>
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Parent Name" value={parentName} onChange={(event) => setParentName(event.target.value)} />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Parent Phone" value={parentPhone} onChange={(event) => setParentPhone(event.target.value)} />
          <div className="md:col-span-2 flex gap-2">
            <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Save Changes</button>
            <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 font-semibold" type="button" onClick={cancelEdit}>Cancel</button>
          </div>
        </form>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm">Loading students...</p> : null}

      <div className="card-surface overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Student ID</th>
              <th className="pb-2">Admission</th>
              <th className="pb-2">Name</th>
              <th className="pb-2">DOB</th>
              <th className="pb-2">Gender</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Phone</th>
              <th className="pb-2">Parent</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{student.studentCode ?? "-"}</td>
                <td className="py-2">{student.admissionNo}</td>
                <td className="py-2">{student.firstName} {student.lastName}</td>
                <td className="py-2">{new Date(student.dateOfBirth).toLocaleDateString()}</td>
                <td className="py-2">{student.gender ?? "-"}</td>
                <td className="py-2">{student.email ?? "-"}</td>
                <td className="py-2">{student.phone ?? "-"}</td>
                <td className="py-2">{student.parentName ? `${student.parentName} (${student.parentPhone ?? "-"})` : "-"}</td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-[hsl(var(--border))] px-2 py-1 text-xs" type="button" onClick={() => beginEdit(student)}>Edit</button>
                    <button className="rounded-lg border border-red-400 px-2 py-1 text-xs text-red-600" type="button" onClick={() => handleDelete(student)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
