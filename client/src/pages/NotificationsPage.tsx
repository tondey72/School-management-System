import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Notification {
  id: string;
  title: string;
  message: string;
  channel: string;
  audience: string;
  sentAt: string;
}

interface Channels {
  email: boolean;
  smsReady: boolean;
  pushReady: boolean;
  emergencyAlerts: boolean;
}

export function NotificationsPage() {
  const [channels, setChannels] = useState<Channels | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const [channelsResponse, notificationsResponse] = await Promise.all([
      api.get<Channels>("/notifications/channels"),
      api.get<Notification[]>("/notifications")
    ]);
    setChannels(channelsResponse.data);
    setNotifications(notificationsResponse.data);
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  const createNotification = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/notifications", {
      title,
      message,
      channel: "IN_APP",
      audience: "ALL"
    });
    setTitle("");
    setMessage("");
    await loadData();
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Communication and Alerts</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-4 text-sm">
        <div className="card-surface p-4">Email: <strong>{channels?.email ? "On" : "Off"}</strong></div>
        <div className="card-surface p-4">SMS: <strong>{channels?.smsReady ? "Ready" : "Off"}</strong></div>
        <div className="card-surface p-4">Push: <strong>{channels?.pushReady ? "Ready" : "Off"}</strong></div>
        <div className="card-surface p-4">Emergency: <strong>{channels?.emergencyAlerts ? "On" : "Off"}</strong></div>
      </div>

      <form className="card-surface space-y-3 p-4" onSubmit={createNotification}>
        <input className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <textarea className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Message" value={message} onChange={(event) => setMessage(event.target.value)} required rows={3} />
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white" type="submit">Send Notification</button>
      </form>

      <div className="card-surface overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Title</th>
              <th className="pb-2">Channel</th>
              <th className="pb-2">Audience</th>
              <th className="pb-2">Sent</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((item) => (
              <tr key={item.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{item.title}</td>
                <td className="py-2">{item.channel}</td>
                <td className="py-2">{item.audience}</td>
                <td className="py-2">{new Date(item.sentAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
