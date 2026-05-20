import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface ClassroomStudent {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
}

interface Classroom {
  id: string;
  name: string;
  stream?: string;
  gradeLevel: string;
  managerRole?: "HEADMASTER" | "DEPUTY";
  classTeacherName?: string;
  students: ClassroomStudent[];
}

interface StudentOption {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
}

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
  student: ClassroomStudent;
}

export function ClassroomsPage() {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");

  const [name, setName] = useState("");
  const [stream, setStream] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [managerRole, setManagerRole] = useState<"HEADMASTER" | "DEPUTY">("HEADMASTER");
  const [classTeacherName, setClassTeacherName] = useState("");

  const [assignStudentId, setAssignStudentId] = useState("");
  const [attendanceStudentId, setAttendanceStudentId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<"PRESENT" | "ABSENT" | "LATE" | "EXCUSED">("PRESENT");
  const [flagDate, setFlagDate] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageClassrooms = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"].includes(user?.role ?? "");
  const canManageStudents = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"].includes(user?.role ?? "");
  const canRecordAttendance = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"].includes(user?.role ?? "");

  const selectedClassroom = useMemo(
    () => classrooms.find((item) => item.id === selectedClassroomId) ?? null,
    [classrooms, selectedClassroomId]
  );

  const loadData = async () => {
    const [classroomsResponse, studentsResponse] = await Promise.all([
      api.get<Classroom[]>("/classrooms"),
      api.get<StudentOption[]>("/students")
    ]);

    setClassrooms(classroomsResponse.data);
    setStudents(studentsResponse.data);

    if (!selectedClassroomId && classroomsResponse.data.length > 0) {
      setSelectedClassroomId(classroomsResponse.data[0].id);
    }
  };

  const loadAttendance = async (classroomId: string) => {
    const rows = await api.get<AttendanceRow[]>(`/classrooms/${classroomId}/attendance`);
    setAttendanceRows(rows.data);
  };

  useEffect(() => {
    loadData().catch(() => setError("Unable to load classroom module data."));
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) {
      return;
    }
    loadAttendance(selectedClassroomId).catch(() => setError("Unable to load attendance."));
  }, [selectedClassroomId]);

  const createClassroom = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/classrooms", {
        name,
        stream: stream || undefined,
        gradeLevel,
        managerRole,
        classTeacherName
      });
      setName("");
      setStream("");
      setGradeLevel("");
      setClassTeacherName("");
      setSuccess("Classroom created.");
      await loadData();
    } catch {
      setError("Unable to create classroom.");
    }
  };

  const addStudentToClassroom = async () => {
    if (!selectedClassroomId || !assignStudentId) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.post(`/classrooms/${selectedClassroomId}/students`, { studentId: assignStudentId });
      setSuccess("Student assigned to classroom.");
      await loadData();
      await loadAttendance(selectedClassroomId);
    } catch {
      setError("Unable to assign student.");
    }
  };

  const removeStudentFromClassroom = async (studentId: string) => {
    if (!selectedClassroomId) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.delete(`/classrooms/${selectedClassroomId}/students/${studentId}`);
      setSuccess("Student removed from classroom.");
      await loadData();
      await loadAttendance(selectedClassroomId);
    } catch {
      setError("Unable to remove student.");
    }
  };

  const recordAttendance = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedClassroomId) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.post(`/classrooms/${selectedClassroomId}/attendance`, {
        studentId: attendanceStudentId,
        date: new Date(`${attendanceDate}T00:00:00.000Z`).toISOString(),
        status: attendanceStatus
      });
      setSuccess("Attendance recorded.");
      await loadAttendance(selectedClassroomId);
    } catch {
      setError("Unable to record attendance.");
    }
  };

  const flagAbsences = async () => {
    if (!selectedClassroomId || !flagDate) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await api.post<{ flagged: number }>(`/classrooms/${selectedClassroomId}/attendance/flag-absent`, {
        date: new Date(`${flagDate}T00:00:00.000Z`).toISOString()
      });
      setSuccess(`${response.data.flagged} absences flagged.`);
      await loadAttendance(selectedClassroomId);
    } catch {
      setError("Unable to flag absences.");
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Classroom Management</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Headmaster/deputy managed classrooms with teacher-led student assignment and attendance control.</p>
      </header>

      {error ? <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600">{success}</p> : null}

      <form className="card-surface grid gap-3 p-4 md:grid-cols-2" onSubmit={createClassroom}>
        {!canManageClassrooms ? <p className="md:col-span-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700">Only headmaster/deputy/admin roles can create and manage classroom setup.</p> : null}
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 disabled:opacity-60" disabled={!canManageClassrooms} placeholder="Classroom Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 disabled:opacity-60" disabled={!canManageClassrooms} placeholder="Stream (optional)" value={stream} onChange={(event) => setStream(event.target.value)} />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 disabled:opacity-60" disabled={!canManageClassrooms} placeholder="Grade Level" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} required />
        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 disabled:opacity-60" disabled={!canManageClassrooms} value={managerRole} onChange={(event) => setManagerRole(event.target.value as "HEADMASTER" | "DEPUTY")}>
          <option value="HEADMASTER">Managed by Headmaster</option>
          <option value="DEPUTY">Managed by Deputy</option>
        </select>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 md:col-span-2 disabled:opacity-60" disabled={!canManageClassrooms} placeholder="Class Teacher Name" value={classTeacherName} onChange={(event) => setClassTeacherName(event.target.value)} required />
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2" disabled={!canManageClassrooms} type="submit">Create Classroom</button>
      </form>

      <div className="card-surface grid gap-3 p-4 md:grid-cols-2">
        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={selectedClassroomId} onChange={(event) => setSelectedClassroomId(event.target.value)}>
          {classrooms.map((item) => (
            <option key={item.id} value={item.id}>{item.gradeLevel} - {item.name}</option>
          ))}
        </select>
        <div className="text-sm text-[hsl(var(--muted-foreground))]">
          Manager: <strong>{selectedClassroom?.managerRole ?? "-"}</strong> | Teacher: <strong>{selectedClassroom?.classTeacherName ?? "-"}</strong>
        </div>

        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 disabled:opacity-60" disabled={!canManageStudents} value={assignStudentId} onChange={(event) => setAssignStudentId(event.target.value)}>
          <option value="">Select student to add</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>{student.admissionNo} - {student.firstName} {student.lastName}</option>
          ))}
        </select>
        <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60" disabled={!canManageStudents} type="button" onClick={addStudentToClassroom}>Add Student to Classroom</button>
      </div>

      <div className="card-surface overflow-x-auto p-4">
        <h3 className="mb-2 font-heading text-lg font-bold">Classroom Students</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Admission</th>
              <th className="pb-2">Name</th>
              <th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {(selectedClassroom?.students ?? []).map((student) => (
              <tr key={student.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{student.admissionNo}</td>
                <td className="py-2">{student.firstName} {student.lastName}</td>
                <td className="py-2">
                  <button className="rounded-lg border border-[hsl(var(--border))] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60" disabled={!canManageStudents} type="button" onClick={() => removeStudentFromClassroom(student.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="card-surface grid gap-3 p-4 md:grid-cols-2" onSubmit={recordAttendance}>
        <h3 className="md:col-span-2 font-heading text-lg font-bold">Record Attendance</h3>
        {!canRecordAttendance ? <p className="md:col-span-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700">Your role has read-only access to attendance actions.</p> : null}
        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 disabled:opacity-60" disabled={!canRecordAttendance} value={attendanceStudentId} onChange={(event) => setAttendanceStudentId(event.target.value)} required>
          <option value="">Select student</option>
          {(selectedClassroom?.students ?? []).map((student) => (
            <option key={student.id} value={student.id}>{student.admissionNo} - {student.firstName} {student.lastName}</option>
          ))}
        </select>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 disabled:opacity-60" disabled={!canRecordAttendance} type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} required />
        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 disabled:opacity-60" disabled={!canRecordAttendance} value={attendanceStatus} onChange={(event) => setAttendanceStatus(event.target.value as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED")}> 
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="LATE">Late</option>
          <option value="EXCUSED">Excused</option>
        </select>
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={!canRecordAttendance} type="submit">Save Attendance</button>
      </form>

      <div className="card-surface grid gap-3 p-4 md:grid-cols-2">
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 disabled:opacity-60" disabled={!canRecordAttendance} type="date" value={flagDate} onChange={(event) => setFlagDate(event.target.value)} />
        <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60" disabled={!canRecordAttendance} type="button" onClick={flagAbsences}>Flag Absences for Date</button>
      </div>

      <div className="card-surface overflow-x-auto p-4">
        <h3 className="mb-2 font-heading text-lg font-bold">Attendance Records</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Date</th>
              <th className="pb-2">Student</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRows.map((row) => (
              <tr key={row.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{new Date(row.date).toLocaleDateString()}</td>
                <td className="py-2">{row.student.admissionNo} - {row.student.firstName} {row.student.lastName}</td>
                <td className="py-2">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
