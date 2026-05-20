import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface StudentOption {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
}

interface ExamItem {
  id: string;
  title: string;
  examDate: string;
  totalMarks: number;
  term: string;
  subject: {
    name: string;
  };
}

interface ExamAnalytics {
  totalResults: number;
  averageMarks: number;
  averageGpa: number;
  gradeDistribution: Record<string, number>;
  topPerformers: Array<{ student: string; average: number }>;
}

export function ExamsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [analytics, setAnalytics] = useState<ExamAnalytics | null>(null);

  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [term, setTerm] = useState("Term 1");

  const [resultExamId, setResultExamId] = useState("");
  const [resultStudentId, setResultStudentId] = useState("");
  const [marks, setMarks] = useState("0");
  const [grade, setGrade] = useState("A");
  const [gpaPoints, setGpaPoints] = useState("4");

  const loadData = async () => {
    const [subjectsResponse, studentsResponse, scheduleResponse] = await Promise.all([
      api.get<Subject[]>("/academics/subjects"),
      api.get<StudentOption[]>("/portal/students"),
      api.get<{ upcomingExams: ExamItem[] }>("/exams/schedule")
    ]);
    const analyticsResponse = await api.get<ExamAnalytics>("/exams/analytics");

    setSubjects(subjectsResponse.data);
    setStudents(studentsResponse.data);
    setExams(scheduleResponse.data.upcomingExams);
    setAnalytics(analyticsResponse.data);

    if (!subjectId && subjectsResponse.data.length > 0) {
      setSubjectId(subjectsResponse.data[0].id);
    }
    if (!resultStudentId && studentsResponse.data.length > 0) {
      setResultStudentId(studentsResponse.data[0].id);
    }
    if (!resultExamId && scheduleResponse.data.upcomingExams.length > 0) {
      setResultExamId(scheduleResponse.data.upcomingExams[0].id);
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  const createExam = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/exams/schedule", {
      subjectId,
      title,
      examDate: new Date(`${examDate}T08:00:00.000Z`).toISOString(),
      totalMarks: Number(totalMarks),
      term
    });
    setTitle("");
    setExamDate("");
    await loadData();
  };

  const submitResult = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/exams/results", {
      examId: resultExamId,
      studentId: resultStudentId,
      marks: Number(marks),
      grade,
      gpaPoints: Number(gpaPoints)
    });
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Examinations and Assessment</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <div className="card-surface p-4">Results: <strong>{analytics?.totalResults ?? 0}</strong></div>
        <div className="card-surface p-4">Average Marks: <strong>{analytics?.averageMarks?.toFixed(2) ?? "0.00"}</strong></div>
        <div className="card-surface p-4">Average GPA: <strong>{analytics?.averageGpa?.toFixed(2) ?? "0.00"}</strong></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form className="card-surface space-y-3 p-4" onSubmit={createExam}>
          <h3 className="font-heading text-lg font-bold">Schedule Exam</h3>
          <select className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.code} - {subject.name}</option>
            ))}
          </select>
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Exam Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} required />
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="number" min="1" value={totalMarks} onChange={(event) => setTotalMarks(event.target.value)} required />
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={term} onChange={(event) => setTerm(event.target.value)} required />
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Create Exam</button>
        </form>

        <form className="card-surface space-y-3 p-4" onSubmit={submitResult}>
          <h3 className="font-heading text-lg font-bold">Enter Result</h3>
          <select className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={resultExamId} onChange={(event) => setResultExamId(event.target.value)}>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>{exam.title} ({new Date(exam.examDate).toLocaleDateString()})</option>
            ))}
          </select>
          <select className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={resultStudentId} onChange={(event) => setResultStudentId(event.target.value)}>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.admissionNo} - {student.firstName} {student.lastName}</option>
            ))}
          </select>
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="number" min="0" value={marks} onChange={(event) => setMarks(event.target.value)} required />
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Grade" value={grade} onChange={(event) => setGrade(event.target.value)} required />
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="number" min="0" step="0.1" value={gpaPoints} onChange={(event) => setGpaPoints(event.target.value)} required />
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Submit Result</button>
        </form>
      </div>

      <div className="card-surface overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Exam</th>
              <th className="pb-2">Subject</th>
              <th className="pb-2">Date</th>
              <th className="pb-2">Term</th>
              <th className="pb-2">Total Marks</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{exam.title}</td>
                <td className="py-2">{exam.subject.name}</td>
                <td className="py-2">{new Date(exam.examDate).toLocaleDateString()}</td>
                <td className="py-2">{exam.term}</td>
                <td className="py-2">{exam.totalMarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card-surface p-4">
          <h3 className="mb-2 font-heading text-lg font-bold">Grade Distribution</h3>
          <ul className="space-y-1 text-sm">
            {Object.entries(analytics?.gradeDistribution ?? {}).map(([gradeKey, count]) => (
              <li key={gradeKey}>{gradeKey}: {count}</li>
            ))}
          </ul>
        </div>
        <div className="card-surface p-4">
          <h3 className="mb-2 font-heading text-lg font-bold">Top Performers</h3>
          <ul className="space-y-1 text-sm">
            {(analytics?.topPerformers ?? []).map((item) => (
              <li key={item.student}>{item.student}: {item.average}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
