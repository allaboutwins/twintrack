import { Link, useLocation } from "wouter";
import { Home, Moon, Utensils, BookOpen, GraduationCap, Settings } from "lucide-react";

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/sleep", icon: Moon, label: "Sleep" },
  { path: "/feeding", icon: Utensils, label: "Feed" },
  { path: "/routines", icon: BookOpen, label: "Routines" },
  { path: "/learn", icon: GraduationCap, label: "Learn" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-[430px] mx-auto bg-background">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-border safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location === path || location.startsWith(path + "/");
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px] ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon
                  size={22}
                  className={`transition-transform ${active ? "scale-110" : ""}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px] ${
              location === "/settings" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="nav-settings"
          >
            <Settings
              size={22}
              strokeWidth={location === "/settings" ? 2.5 : 1.8}
              className={location === "/settings" ? "scale-110 transition-transform" : "transition-transform"}
            />
            <span className={`text-[10px] font-medium ${location === "/settings" ? "font-semibold" : ""}`}>
              Settings
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export function TwinTabs({
  twins,
  activeTwinId,
  onSelect,
}: {
  twins: Array<{ id: number; name: string; label: string; colorTheme: string }>;
  activeTwinId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex gap-2 px-4 py-3 bg-white border-b border-border">
      {twins.map((twin) => (
        <button
          key={twin.id}
          onClick={() => onSelect(twin.id)}
          data-testid={`twin-tab-${twin.id}`}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTwinId === twin.id
              ? "text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          style={activeTwinId === twin.id ? { backgroundColor: twin.colorTheme } : {}}
        >
          {twin.name || twin.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
