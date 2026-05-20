import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface TransportStatus {
  activeRoutes: number;
  assignedStudents: number;
  gpsEnabledBuses: number;
}

interface Bus {
  id: string;
  routeName: string;
  plateNumber: string;
  capacity: number;
  gpsEnabled: boolean;
}

export function TransportPage() {
  const [status, setStatus] = useState<TransportStatus | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);

  const [routeName, setRouteName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [capacity, setCapacity] = useState("30");
  const [gpsEnabled, setGpsEnabled] = useState(false);

  const loadData = async () => {
    const [statusResponse, busesResponse] = await Promise.all([
      api.get<TransportStatus>("/transport/status"),
      api.get<Bus[]>("/transport/buses")
    ]);
    setStatus(statusResponse.data);
    setBuses(busesResponse.data);
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  const createBus = async (event: FormEvent) => {
    event.preventDefault();
    await api.post("/transport/buses", {
      routeName,
      plateNumber,
      capacity: Number(capacity),
      gpsEnabled
    });
    setRouteName("");
    setPlateNumber("");
    setCapacity("30");
    setGpsEnabled(false);
    await loadData();
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="font-heading text-3xl font-extrabold">Transport Management</h2>
      </header>

      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <div className="card-surface p-4">Active Routes: <strong>{status?.activeRoutes ?? 0}</strong></div>
        <div className="card-surface p-4">Assigned Students: <strong>{status?.assignedStudents ?? 0}</strong></div>
        <div className="card-surface p-4">GPS Buses: <strong>{status?.gpsEnabledBuses ?? 0}</strong></div>
      </div>

      <form className="card-surface grid gap-3 p-4 md:grid-cols-4" onSubmit={createBus}>
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Route Name" value={routeName} onChange={(event) => setRouteName(event.target.value)} required />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" placeholder="Plate Number" value={plateNumber} onChange={(event) => setPlateNumber(event.target.value)} required />
        <input className="rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2" type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} required />
        <label className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 py-2">
          <input type="checkbox" checked={gpsEnabled} onChange={(event) => setGpsEnabled(event.target.checked)} /> GPS Enabled
        </label>
        <button className="rounded-xl bg-brand px-3 py-2 font-semibold text-white md:col-span-4" type="submit">Add Bus</button>
      </form>

      <div className="card-surface overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[hsl(var(--muted-foreground))]">
              <th className="pb-2">Route</th>
              <th className="pb-2">Plate</th>
              <th className="pb-2">Capacity</th>
              <th className="pb-2">GPS</th>
            </tr>
          </thead>
          <tbody>
            {buses.map((bus) => (
              <tr key={bus.id} className="border-t border-[hsl(var(--border))]">
                <td className="py-2">{bus.routeName}</td>
                <td className="py-2">{bus.plateNumber}</td>
                <td className="py-2">{bus.capacity}</td>
                <td className="py-2">{bus.gpsEnabled ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
