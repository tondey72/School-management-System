import { FormEvent, useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Legend, Tooltip } from "chart.js";
import { api } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Legend, Tooltip);

interface StudentOption {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  method: string;
}

interface AttendanceAnalytics {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

export function AttendancePage() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);

  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<AttendanceRecord["status"]>("PRESENT");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadData = async () => {
    const query = new URLSearchParams();
    if (studentId) {
      query.set("studentId", studentId);
    }
    if (fromDate) {
      query.set("from", new Date(`${fromDate}T00:00:00.000Z`).toISOString());
    }
    if (toDate) {
      query.set("to", new Date(`${toDate}T23:59:59.999Z`).toISOString());
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";

    const [studentsResponse, recordsResponse, analyticsResponse] = await Promise.all([
      api.get<StudentOption[]>("/portal/students"),
      api.get<AttendanceRecord[]>(`/attendance/records${suffix}`),
      api.get<AttendanceAnalytics>("/attendance/analytics")
    ]);
    setStudents(studentsResponse.data);
    setRecords(recordsResponse.data);
    setAnalytics(analyticsResponse.data);
    if (!studentId && studentsResponse.data.length > 0) {
      setStudentId(studentsResponse.data[0].id);
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [studentId, fromDate, toDate]);

  const submitAttendance = async (event: FormEvent) => {
    event.preventDefault();
    if (!studentId) {
      return;
    }

    await api.post("/attendance/records", {
      studentId,
      date: new Date(`${date}T00:00:00.000Z`).toISOString(),
      status,
      method: "MANUAL"
    });
    await loadData();
  };

  const exportCsv = async () => {
    const query = new URLSearchParams();
    if (studentId) {
      query.set("studentId", studentId);
    }
    if (fromDate) {
      query.set("from", new Date(`${fromDate}T00:00:00.000Z`).toISOString());
    }
    if (toDate) {
      query.set("to", new Date(`${toDate}T23:59:59.999Z`).toISOString());
    }

    const response = await api.get<string>(`/attendance/export/csv?${query.toString()}`, {
      responseType: "text"
    });

    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "attendance-export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Attendance Management</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-5 text-sm">
        <div className="card-surface p-4">Total: <strong>{analytics?.total ?? 0}</strong></div>
        <div className="card-surface p-4">Present: <strong>{analytics?.present ?? 0}</strong></div>
        <div className="card-surface p-4">Absent: <strong>{analytics?.absent ?? 0}</strong></div>
        <div className="card-surface p-4">Late: <strong>{analytics?.late ?? 0}</strong></div>
        <div className="card-surface p-4">Rate: <strong>{analytics?.attendanceRate ?? 0}%</strong></div>
      </div>

      <div className="card-surface p-4">
        <Bar
          data={{
            labels: ["Present", "Absent", "Late", "Excused"],
            datasets: [
              {
                label: "Attendance",
                data: [analytics?.present ?? 0, analytics?.absent ?? 0, analytics?.late ?? 0, analytics?.excused ?? 0],
                backgroundColor: ["rgba(20,184,166,0.75)", "rgba(239,68,68,0.75)", "rgba(251,146,60,0.75)", "rgba(99,102,241,0.75)"]
              }
            ]
          }}
        />
      </div>

      <form className="card-surface grid gap-3 p-4 md:grid-cols-4" onSubmit={submitAttendance}>
        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={studentId} onChange={(event) => setStudentId(event.target.value)} required>
          {students.map((student) => (
            <option key={student.id} value={student.id}>{student.admissionNo} - {student.firstName} {student.lastName}</option>
          ))}
        </select>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={status} onChange={(event) => setStatus(event.target.value as AttendanceRecord["status"])}>
          <option value="PRESENT">PRESENT</option>
          <option value="ABSENT">ABSENT</option>
          <option value="LATE">LATE</option>
          <option value="EXCUSED">EXCUSED</option>
        </select>
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Mark Attendance</button>
      </form>

      <div className="card-surface grid gap-3 p-4 md:grid-cols-4">
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        <button className="rounded-xl border border-[hsl(var(--border))] px-3 py-2" type="button" onClick={() => {
          setFromDate("");
          setToDate("");
        }}>
          Clear Filters
        </button>
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="button" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="card-surface overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Student</th>
              <th className="pb-2">Date</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Method</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{record.studentId}</td>
                <td className="py-2">{new Date(record.date).toLocaleDateString()}</td>
                <td className="py-2">{record.status}</td>
                <td className="py-2">{record.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
