import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface ClassRoom {
  id: string;
  name: string;
  gradeLevel: string;
  stream?: string;
}

interface AcademicsOverview {
  subjects: number;
  classes: number;
  timetableEntries: number;
}

export function AcademicsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [overview, setOverview] = useState<AcademicsOverview | null>(null);

  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [className, setClassName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [stream, setStream] = useState("");

  const loadData = async () => {
    const [overviewResponse, subjectsResponse, classesResponse] = await Promise.all([
      api.get<AcademicsOverview>("/academics/overview"),
      api.get<Subject[]>("/academics/subjects"),
      api.get<ClassRoom[]>("/academics/classes")
    ]);
    setOverview(overviewResponse.data);
    setSubjects(subjectsResponse.data);
    setClasses(classesResponse.data);
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  const addSubject = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/academics/subjects", { code: subjectCode, name: subjectName });
    setSubjectCode("");
    setSubjectName("");
    await loadData();
  };

  const addClass = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/academics/classes", {
      name: className,
      gradeLevel,
      stream: stream || undefined
    });
    setClassName("");
    setGradeLevel("");
    setStream("");
    await loadData();
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Academic Management</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-surface p-4 text-sm">Subjects: <strong>{overview?.subjects ?? 0}</strong></div>
        <div className="card-surface p-4 text-sm">Classes: <strong>{overview?.classes ?? 0}</strong></div>
        <div className="card-surface p-4 text-sm">Timetable Entries: <strong>{overview?.timetableEntries ?? 0}</strong></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form className="card-surface space-y-3 p-4" onSubmit={addSubject}>
          <h3 className="font-heading text-lg font-bold">Add Subject</h3>
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Code" value={subjectCode} onChange={(event) => setSubjectCode(event.target.value)} required />
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Name" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} required />
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Save Subject</button>
        </form>

        <form className="card-surface space-y-3 p-4" onSubmit={addClass}>
          <h3 className="font-heading text-lg font-bold">Add Class</h3>
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Class Name" value={className} onChange={(event) => setClassName(event.target.value)} required />
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Grade Level" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} required />
          <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Stream (optional)" value={stream} onChange={(event) => setStream(event.target.value)} />
          <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Save Class</button>
        </form>
      </div>

      <div className="card-surface grid gap-4 p-4 xl:grid-cols-2">
        <div>
          <h4 className="mb-2 font-semibold">Subjects</h4>
          <ul className="space-y-1 text-sm">
            {subjects.map((item) => (
              <li key={item.id}>{item.code} - {item.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-semibold">Classes</h4>
          <ul className="space-y-1 text-sm">
            {classes.map((item) => (
              <li key={item.id}>{item.name} ({item.gradeLevel}{item.stream ? `/${item.stream}` : ""})</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
