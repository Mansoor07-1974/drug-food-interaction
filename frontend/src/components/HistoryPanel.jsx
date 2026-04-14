// components/HistoryPanel.jsx
import { Clock, Trash2, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function HistoryPanel({ history, onSelect, onClear }) {
  if (!history.length) return null;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      animation: "fadeUp 0.4s ease both",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, fontFamily: "var(--font-mono)",
          letterSpacing: "0.12em", color: "var(--text-secondary)",
          textTransform: "uppercase",
        }}>
          <Clock size={13} />
          Recent Searches
        </div>
        <button
          onClick={onClear}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 11, color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--red)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Entries */}
      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        {history.map((h, i) => {
          const isSafe  = h.overall_label === "SAFE";
          const riskColor = isSafe ? "var(--teal)" : "var(--red)";
          return (
            <div
              key={h.id}
              onClick={() => onSelect(h.drug_name, h.food_name)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 20px",
                cursor: "pointer",
                borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--teal-dim)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {isSafe
                ? <CheckCircle2 size={14} color="var(--teal)" />
                : <AlertTriangle size={14} color="var(--red)" />}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {h.drug_name}
                  <span style={{ color: "var(--text-muted)", margin: "0 6px" }}>+</span>
                  {h.food_name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {timeAgo(h.timestamp)}
                </div>
              </div>

              <span style={{
                fontSize: 10, fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: riskColor,
                padding: "2px 8px",
                background: isSafe ? "var(--teal-dim)" : "var(--red-dim)",
                borderRadius: 99,
                border: `1px solid ${riskColor}40`,
                whiteSpace: "nowrap",
              }}>
                {h.overall_label}
              </span>

              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
