import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface WorkflowInstance {
  id: string;
  workflowKey: string;
  title: string;
  status: string;
  currentStep: string;
}

export function WorkflowPage() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [workflowKey, setWorkflowKey] = useState("admission-approval");
  const [title, setTitle] = useState("");

  const loadData = async () => {
    const [templatesResponse, instancesResponse] = await Promise.all([
      api.get<string[]>("/workflows/templates"),
      api.get<WorkflowInstance[]>("/workflows/instances")
    ]);
    setTemplates(templatesResponse.data);
    setInstances(instancesResponse.data);
    if (templatesResponse.data.length > 0 && !templatesResponse.data.includes(workflowKey)) {
      setWorkflowKey(templatesResponse.data[0]);
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  const createWorkflow = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/workflows/instances", {
      workflowKey,
      title,
      currentStep: "submitted"
    });
    setTitle("");
    await loadData();
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Workflow Automation</h2>
      </header>

      <form className="card-surface grid gap-3 p-4 md:grid-cols-3" onSubmit={createWorkflow}>
        <select className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" value={workflowKey} onChange={(event) => setWorkflowKey(event.target.value)}>
          {templates.map((template) => (
            <option key={template} value={template}>{template}</option>
          ))}
        </select>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Workflow title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Start Workflow</button>
      </form>

      <div className="card-surface overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Template</th>
              <th className="pb-2">Title</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Step</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance) => (
              <tr key={instance.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{instance.workflowKey}</td>
                <td className="py-2">{instance.title}</td>
                <td className="py-2">{instance.status}</td>
                <td className="py-2">{instance.currentStep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
