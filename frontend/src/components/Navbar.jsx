// components/Navbar.jsx
import { Link, useLocation } from "react-router-dom";
import { FlaskConical, LayoutDashboard, Info, Search } from "lucide-react";

const LINKS = [
  { to: "/",          label: "Check",     icon: Search          },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/about",     label: "About",     icon: Info            },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 90,
      background: "rgba(5,10,15,0.85)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        maxWidth: 960, margin: "0 auto",
        padding: "0 24px",
        display: "flex", alignItems: "center",
        height: 56,
      }}>
        {/* Logo */}
        <Link to="/" style={{
          display: "flex", alignItems: "center", gap: 10,
          textDecoration: "none", marginRight: 40,
        }}>
          <FlaskConical size={22} color="var(--teal)" />
          <span style={{
            fontSize: 18, fontWeight: 800,
            background: "linear-gradient(135deg,#e8f4f0,var(--teal))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}>
            MolGuard
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {LINKS.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8,
                textDecoration: "none",
                fontSize: 13, fontWeight: active ? 700 : 400,
                color: active ? "var(--teal)" : "var(--text-secondary)",
                background: active ? "var(--teal-dim)" : "none",
                border: `1px solid ${active ? "var(--border-glow)" : "transparent"}`,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "none"; } }}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Version badge */}
        <span style={{
          fontSize: 10, fontFamily: "var(--font-mono)",
          color: "var(--text-muted)", letterSpacing: "0.1em",
        }}>
          v3.0
        </span>
      </div>
    </nav>
  );
}
