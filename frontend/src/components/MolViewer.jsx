// components/MolViewer.jsx
// Renders a SMILES string as a 2D molecular structure using the
// RDKit.js WebAssembly library loaded from CDN.

import { useEffect, useRef, useState } from "react";
import { Loader2, FlaskConical } from "lucide-react";

// Load RDKit.js once globally
let rdkitPromise = null;

function getRDKit() {
  if (!rdkitPromise) {
    rdkitPromise = new Promise((resolve, reject) => {
      if (window.RDKit) { resolve(window.RDKit); return; }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js";
      script.onload = () => {
        window.initRDKitModule().then((RDKit) => {
          window.RDKit = RDKit;
          resolve(RDKit);
        }).catch(reject);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return rdkitPromise;
}

export default function MolViewer({ smiles, label = "", width = 260, height = 180, highlight = false }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  useEffect(() => {
    if (!smiles) { setStatus("error"); return; }
    setStatus("loading");

    getRDKit()
      .then((RDKit) => {
        const mol = RDKit.get_mol(smiles);
        if (!mol) { setStatus("error"); return; }

        // Generate SVG with dark-mode friendly colors
        const svg = mol.get_svg_with_highlights(JSON.stringify({
          width, height,
          bondLineWidth: 1.5,
          addStereoAnnotation: true,
          atomColourPalette: {
            // Element colours that pop on dark background
            6:  [0.82, 0.95, 0.88],   // C  — light teal-white
            7:  [0.30, 0.75, 1.00],   // N  — blue
            8:  [1.00, 0.35, 0.35],   // O  — red
            16: [1.00, 0.85, 0.00],   // S  — yellow
            9:  [0.50, 1.00, 0.50],   // F  — green
            17: [0.50, 1.00, 0.50],   // Cl — green
            35: [0.80, 0.40, 0.10],   // Br — brown
            53: [0.60, 0.00, 0.60],   // I  — purple
          },
        }));

        mol.delete();

        // Inject SVG into container
        const container = canvasRef.current;
        if (container) {
          // Replace SVG background to be transparent
          const cleaned = svg
            .replace(/rect.*?fill='#FFFFFF'.*?\/>/g, "")
            .replace(/background-color:\s*white/g, "background-color: transparent");
          container.innerHTML = cleaned;

          // Style the SVG element
          const svgEl = container.querySelector("svg");
          if (svgEl) {
            svgEl.style.width  = "100%";
            svgEl.style.height = "100%";
          }
        }
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [smiles, width, height]);

  return (
    <div style={{
      width: "100%",
      background: "var(--bg)",
      border: `1px solid ${highlight ? "var(--teal)" : "var(--border)"}`,
      borderRadius: "var(--radius)",
      overflow: "hidden",
      position: "relative",
      minHeight: height,
      display: "flex",
      flexDirection: "column",
      boxShadow: highlight ? "0 0 16px rgba(0,200,170,0.1)" : "none",
      transition: "box-shadow 0.2s",
    }}>
      {/* Label bar */}
      {label && (
        <div style={{
          padding: "6px 12px",
          borderBottom: "1px solid var(--border)",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-secondary)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <FlaskConical size={10} color="var(--teal)" />
          {label}
        </div>
      )}

      {/* Molecule render area */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {status === "loading" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 8,
            color: "var(--text-muted)",
          }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} color="var(--teal)" />
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>Rendering...</span>
          </div>
        )}

        {status === "error" && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", minHeight: 80,
            color: "var(--text-muted)", fontSize: 12,
            flexDirection: "column", gap: 6, padding: 12, textAlign: "center",
          }}>
            <FlaskConical size={20} color="var(--text-muted)" />
            <span>Could not render structure</span>
          </div>
        )}

        {/* SVG rendered here */}
        <div
          ref={canvasRef}
          style={{
            width: "100%",
            minHeight: height,
            display: status === "ready" ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        />
      </div>

      {/* SMILES string at bottom */}
      <div style={{
        padding: "4px 10px",
        borderTop: "1px solid var(--border)",
        fontSize: 9,
        fontFamily: "var(--font-mono)",
        color: "var(--text-muted)",
        wordBreak: "break-all",
        lineHeight: 1.4,
        maxHeight: 36,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {smiles}
      </div>
    </div>
  );
}
