import { Bell, BookOpenText, Bot, Bus, CalendarCheck, ClipboardCheck, ClipboardList, Cog, DollarSign, GraduationCap, Home, School, Settings, ShieldUser, UserCircle2, Users, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const items = [
  { to: "/dashboard", label: "Executive Dashboard", icon: Home },
  { to: "/students", label: "SIS", icon: GraduationCap },
  { to: "/classrooms", label: "Classrooms", icon: School },
  { to: "/academics", label: "Academics", icon: BookOpenText },
  { to: "/library", label: "E-Library", icon: BookOpenText },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/exams", label: "Exams", icon: ClipboardCheck },
  { to: "/finance", label: "Finance", icon: DollarSign },
  { to: "/billing", label: "Billing", icon: ClipboardList },
  { to: "/portal", label: "Portal", icon: UserCircle2 },
  { to: "/workflow", label: "Workflow", icon: Workflow },
  { to: "/transport", label: "Transport", icon: Bus },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/users", label: "User Management", icon: Users },
  { to: "/organization", label: "School Profile", icon: Settings }
];

interface AppNotification {
  id: string;
  title: string;
  message: string;
  channel: string;
  sentAt: string;
}

interface OrganizationBranding {
  id: string;
  name: string;
  logoUrl: string | null;
  contactEmail?: string | null;
}

export function AppLayout() {
  const { toggle } = useTheme();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsPane, setShowNotificationsPane] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);

  const loadBranding = () => {
    api.get<OrganizationBranding>("/organization/profile")
      .then((response) => {
        setBranding(response.data);
      })
      .catch(() => {
        setBranding(null);
      });
  };

  useEffect(() => {
    api.get<AppNotification[]>("/notifications")
      .then((response) => {
        setNotifications(response.data);
      })
      .catch(() => {
        setNotifications([]);
      });

    loadBranding();

    const onBrandingUpdated = () => {
      loadBranding();
    };

    window.addEventListener("branding-updated", onBrandingUpdated);
    return () => {
      window.removeEventListener("branding-updated", onBrandingUpdated);
    };
  }, []);

  useEffect(() => {
    setShowProfileMenu(false);
  }, [pathname]);

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="School logo" className="h-11 w-11 rounded-md object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[hsl(var(--muted))] text-xs font-bold">
              {(branding?.name ?? "SMS").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-extrabold lg:text-lg">{branding?.name ?? "SMS Enterprise"}</p>
            <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{branding?.contactEmail ?? "Enterprise Console"}</p>
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <button type="button" onClick={toggle} className="rounded-xl border border-[hsl(var(--border))] p-2">
            <Cog size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowNotificationsPane(true)}
            className="relative rounded-xl border border-[hsl(var(--border))] p-2"
          >
            <Bell size={16} />
            {notifications.length > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{Math.min(notifications.length, 99)}</span> : null}
          </button>

          <button
            type="button"
            onClick={() => setShowProfileMenu((current) => !current)}
            className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-2 py-1.5"
          >
            <ShieldUser size={16} />
            <span className="max-w-32 truncate text-xs font-semibold">{user?.fullName}</span>
          </button>

          {showProfileMenu ? (
            <div className="absolute right-0 top-12 z-30 w-72 space-y-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-xl">
              <div className="rounded-lg bg-[hsl(var(--muted))] p-3 text-xs">
                <p className="font-semibold">{user?.fullName}</p>
                <p className="text-[hsl(var(--muted-foreground))]">{user?.email}</p>
                <p className="mt-1 text-[hsl(var(--muted-foreground))]">{user?.role}</p>
              </div>
              <Link to="/settings?tab=profile" className="flex w-full items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-left text-sm">
                <Settings size={14} />
                <span>Settings</span>
              </Link>
              <Link to="/settings?tab=preferences" className="flex w-full items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-left text-sm">
                <Cog size={14} />
                <span>System Preferences</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout().catch(() => undefined);
                }}
                className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 p-4 lg:min-h-[calc(100vh-68px)] lg:border-b-0 lg:border-r">
        <nav className="grid gap-2">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                pathname === to ? "bg-brand text-white" : "hover:bg-[hsl(var(--muted))]"
              )}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        </aside>

        <div className="min-w-0">
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
      </div>

      <div className={cn("pointer-events-none fixed inset-0 z-40 bg-black/40 opacity-0 transition-opacity", showNotificationsPane ? "pointer-events-auto opacity-100" : "")}
        onClick={() => setShowNotificationsPane(false)}
        aria-hidden="true"
      />
      <aside className={cn("fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 shadow-2xl transition-transform", showNotificationsPane ? "translate-x-0" : "translate-x-full")}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold">Notifications</h3>
          <button type="button" className="rounded-lg border border-[hsl(var(--border))] px-3 py-1 text-sm" onClick={() => setShowNotificationsPane(false)}>Close</button>
        </div>

        <div className="space-y-3 overflow-y-auto pb-6">
          {notifications.length === 0 ? <p className="text-sm text-[hsl(var(--muted-foreground))]">No notifications available.</p> : null}
          {notifications.map((item) => (
            <article key={item.id} className="rounded-xl border border-[hsl(var(--border))] p-3">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{item.message}</p>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{item.channel} • {new Date(item.sentAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}
