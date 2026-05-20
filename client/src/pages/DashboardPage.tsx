import { motion } from "framer-motion";
import { Bar, Line } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip
} from "chart.js";
import { KpiCard } from "@/components/KpiCard";
import { useLiveNotifications } from "@/hooks/useLiveNotifications";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const kpis = [
  { title: "Total Students", value: "4,238", delta: "+4.1% this term" },
  { title: "Fee Collection", value: "$1.42M", delta: "+7.9% vs last month" },
  { title: "Attendance", value: "93.6%", delta: "+1.2 pts weekly" },
  { title: "Pending Approvals", value: "29", delta: "8 escalated (SLA)" }
];

export function DashboardPage() {
  const messages = useLiveNotifications("demo-school");

  return (
    <section className="space-y-6">
      <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
        <h2 className="font-heading text-3xl font-extrabold">Executive Dashboard</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Real-time school operations across academics, finance, attendance, and compliance.</p>
      </motion.header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.title} {...item} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="card-surface p-4">
          <h3 className="mb-4 font-heading text-lg font-bold">Revenue Trends</h3>
          <Line
            data={{
              labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
              datasets: [
                {
                  label: "Revenue",
                  data: [23000, 27000, 30000, 26000, 32500, 35100],
                  borderColor: "#0f766e",
                  backgroundColor: "rgba(15, 118, 110, 0.25)",
                  tension: 0.35
                }
              ]
            }}
          />
        </div>

        <div className="card-surface p-4">
          <h3 className="mb-4 font-heading text-lg font-bold">Live Alerts</h3>
          <ul className="space-y-2 text-sm">
            {(messages.length > 0 ? messages : ["No new live alerts", "Attendance update stream active", "Workflow approvals within SLA"]).map((message) => (
              <li key={message} className="rounded-lg bg-[hsl(var(--muted))] px-3 py-2">
                {message}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-4 font-heading text-lg font-bold">Attendance Analytics</h3>
        <Bar
          data={{
            labels: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"],
            datasets: [
              {
                label: "Present",
                data: [91, 94, 92, 95, 94, 93],
                backgroundColor: "rgba(20, 184, 166, 0.75)"
              },
              {
                label: "Absent",
                data: [9, 6, 8, 5, 6, 7],
                backgroundColor: "rgba(239, 68, 68, 0.65)"
              }
            ]
          }}
        />
      </div>
    </section>
  );
}
