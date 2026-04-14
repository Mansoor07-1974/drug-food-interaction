// components/ExportButton.jsx
import { useState } from "react";
import { Download, ChevronDown, FileJson, FileText } from "lucide-react";

export default function ExportButton({ result }) {
  const [open, setOpen] = useState(false);

  if (!result) return null;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    triggerDownload(blob, `molguard_${result.drug_name}_${result.food_name}.json`);
    setOpen(false);
  };

  const exportCSV = () => {
    const rows = [
      ["Drug", "Food", "Overall Result", "Risk Level", "Max Probability"],
      [result.drug_name, result.food_name, result.overall_label, result.overall_risk, result.max_probability],
      [],
      ["Constituent", "Label", "Probability", "Severity", "Interaction Effect"],
      ...result.constituents_checked.map(c => [
        c.constituent_name, c.label, c.probability, c.severity, `"${c.interaction_effect}"`,
      ]),
    ];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    triggerDownload(blob, `molguard_${result.drug_name}_${result.food_name}.csv`);
    setOpen(false);
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px",
          background: "var(--bg-card2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--text-secondary)",
          fontSize: 12, fontFamily: "var(--font-mono)",
          cursor: "pointer", transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.color = "var(--teal)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Download size={13} />
        Export
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 4,
          background: "var(--bg-card)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          zIndex: 40, minWidth: 160,
        }}>
          {[
            { label: "Export as CSV",  icon: FileText, action: exportCSV  },
            { label: "Export as JSON", icon: FileJson, action: exportJSON },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: "100%", padding: "11px 16px",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                fontSize: 13, color: "var(--text-primary)",
                fontFamily: "var(--font-display)", textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--teal-dim)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <Icon size={14} color="var(--teal)" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
