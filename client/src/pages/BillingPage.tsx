import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type FeeType =
  | "TUITION"
  | "BOARDING"
  | "TRANSPORT"
  | "EXAMINATION"
  | "LIBRARY"
  | "SPORTS"
  | "UNIFORM"
  | "ACTIVITY"
  | "TECHNOLOGY"
  | "HEALTH"
  | "ONE_TIME"
  | "CUSTOM";

interface FeeItem {
  id?: string;
  feeType: FeeType;
  name: string;
  amount: string | number;
}

interface FeeStructure {
  id: string;
  name: string;
  academicYear: string;
  isActive: boolean;
  feeItems: FeeItem[];
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface FeeAssignment {
  id: string;
  academicYear: string;
  totalAmount: string | number;
  billingCycle: string;
  student: Student;
  feeStructure: { name: string };
}

export function BillingPage() {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feeAssignments, setFeeAssignments] = useState<FeeAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [structureName, setStructureName] = useState("");
  const [structureYear, setStructureYear] = useState(String(new Date().getFullYear()));
  const [itemName, setItemName] = useState("Tuition");
  const [itemAmount, setItemAmount] = useState("0");
  const [itemType, setItemType] = useState<FeeType>("TUITION");

  const [assignmentStudentId, setAssignmentStudentId] = useState("");
  const [assignmentStructureId, setAssignmentStructureId] = useState("");
  const [assignmentYear, setAssignmentYear] = useState(String(new Date().getFullYear()));
  const [assignmentDiscount, setAssignmentDiscount] = useState("0");

  const loadData = async () => {
    const [structuresRes, assignmentsRes, studentsRes] = await Promise.all([
      api.get<FeeStructure[]>("/finance/billing/fee-structures"),
      api.get<FeeAssignment[]>("/finance/billing/fee-assignments"),
      api.get<Student[]>("/students")
    ]);

    const structures = Array.isArray(structuresRes.data) ? structuresRes.data : [];
    const loadedStudents = Array.isArray(studentsRes.data) ? studentsRes.data : [];

    setFeeStructures(structures);
    setFeeAssignments(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);
    setStudents(loadedStudents);

    if (!assignmentStructureId && structures.length > 0) {
      setAssignmentStructureId(structures[0].id);
    }
    if (!assignmentStudentId && loadedStudents.length > 0) {
      setAssignmentStudentId(loadedStudents[0].id);
    }
  };

  useEffect(() => {
    loadData().catch(() => {
      setError("Unable to load billing data.");
    });
  }, []);

  const createFeeStructure = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/finance/billing/fee-structures", {
        name: structureName,
        academicYear: structureYear,
        feeItems: [
          {
            feeType: itemType,
            name: itemName,
            amount: itemAmount,
            isRequired: true,
            isRecurring: false
          }
        ]
      });
      setStructureName("");
      setItemName("Tuition");
      setItemAmount("0");
      setItemType("TUITION");
      await loadData();
    } catch {
      setError("Failed to create fee structure.");
    } finally {
      setSaving(false);
    }
  };

  const createFeeAssignment = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/finance/billing/fee-assignments", {
        studentId: assignmentStudentId,
        feeStructureId: assignmentStructureId,
        academicYear: assignmentYear,
        billingCycle: "TERM",
        startDate: new Date().toISOString(),
        discount: assignmentDiscount,
        discountType: "FIXED"
      });
      setAssignmentDiscount("0");
      await loadData();
    } catch {
      setError("Failed to create fee assignment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Billing Management</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Configure fee structures and assign them to students.</p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <form className="card-surface grid gap-3 p-4" onSubmit={createFeeStructure}>
          <h3 className="font-heading text-lg font-bold">Create Fee Structure</h3>
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Structure Name" value={structureName} onChange={(event) => setStructureName(event.target.value)} required />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Academic Year" value={structureYear} onChange={(event) => setStructureYear(event.target.value)} required />
          <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={itemType} onChange={(event) => setItemType(event.target.value as FeeType)}>
            <option value="TUITION">Tuition</option>
            <option value="BOARDING">Boarding</option>
            <option value="TRANSPORT">Transport</option>
            <option value="EXAMINATION">Examination</option>
            <option value="LIBRARY">Library</option>
            <option value="SPORTS">Sports</option>
            <option value="UNIFORM">Uniform</option>
            <option value="ACTIVITY">Activity</option>
            <option value="TECHNOLOGY">Technology</option>
            <option value="HEALTH">Health</option>
            <option value="ONE_TIME">One Time</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Fee Item Name" value={itemName} onChange={(event) => setItemName(event.target.value)} required />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="number" min="0" placeholder="Amount" value={itemAmount} onChange={(event) => setItemAmount(event.target.value)} required />
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white disabled:opacity-60" type="submit" disabled={saving}>Save Fee Structure</button>
        </form>

        <form className="card-surface grid gap-3 p-4" onSubmit={createFeeAssignment}>
          <h3 className="font-heading text-lg font-bold">Assign Fee Structure</h3>
          <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={assignmentStudentId} onChange={(event) => setAssignmentStudentId(event.target.value)} required>
            <option value="">Select Student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
            ))}
          </select>
          <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={assignmentStructureId} onChange={(event) => setAssignmentStructureId(event.target.value)} required>
            <option value="">Select Fee Structure</option>
            {feeStructures.map((structure) => (
              <option key={structure.id} value={structure.id}>{structure.name} ({structure.academicYear})</option>
            ))}
          </select>
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Academic Year" value={assignmentYear} onChange={(event) => setAssignmentYear(event.target.value)} required />
          <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="number" min="0" placeholder="Discount" value={assignmentDiscount} onChange={(event) => setAssignmentDiscount(event.target.value)} required />
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white disabled:opacity-60" type="submit" disabled={saving}>Create Assignment</button>
        </form>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card-surface overflow-x-auto p-4">
          <h3 className="mb-3 font-heading text-lg font-bold">Fee Structures</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[hsl(var(--muted-foreground))]">
                <th className="pb-2">Name</th>
                <th className="pb-2">Year</th>
                <th className="pb-2">Items</th>
                <th className="pb-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {feeStructures.map((structure) => (
                <tr key={structure.id} className="border-t border-[hsl(var(--border))]">
                  <td className="py-2">{structure.name}</td>
                  <td className="py-2">{structure.academicYear}</td>
                  <td className="py-2">{structure.feeItems.length}</td>
                  <td className="py-2">{structure.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-surface overflow-x-auto p-4">
          <h3 className="mb-3 font-heading text-lg font-bold">Fee Assignments</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[hsl(var(--muted-foreground))]">
                <th className="pb-2">Student</th>
                <th className="pb-2">Structure</th>
                <th className="pb-2">Year</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Cycle</th>
              </tr>
            </thead>
            <tbody>
              {feeAssignments.map((assignment) => (
                <tr key={assignment.id} className="border-t border-[hsl(var(--border))]">
                  <td className="py-2">{assignment.student.firstName} {assignment.student.lastName}</td>
                  <td className="py-2">{assignment.feeStructure.name}</td>
                  <td className="py-2">{assignment.academicYear}</td>
                  <td className="py-2">{Number(assignment.totalAmount).toFixed(2)}</td>
                  <td className="py-2">{assignment.billingCycle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
