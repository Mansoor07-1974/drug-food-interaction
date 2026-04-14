// components/ErrorBoundary.jsx
import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("MolGuard ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg)", padding: 24,
      }}>
        <div style={{
          maxWidth: 480, width: "100%",
          background: "var(--bg-card)",
          border: "1px solid var(--red-border)",
          borderRadius: "var(--radius-lg)",
          padding: 40, textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--red-dim)",
            border: "2px solid var(--red)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <AlertTriangle size={28} color="var(--red)" />
          </div>

          <h2 style={{
            fontSize: 22, fontWeight: 800, marginBottom: 12,
            color: "var(--text-primary)",
          }}>
            Something went wrong
          </h2>

          <p style={{
            fontSize: 14, color: "var(--text-secondary)",
            lineHeight: 1.6, marginBottom: 24,
          }}>
            {this.state.error?.message || "An unexpected error occurred in the UI."}
          </p>

          <div style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8, padding: "10px 14px",
            marginBottom: 24, textAlign: "left",
          }}>
            <pre style={{
              fontSize: 10, fontFamily: "var(--font-mono)",
              color: "var(--text-muted)", wordBreak: "break-all",
              whiteSpace: "pre-wrap", margin: 0, maxHeight: 120, overflow: "auto",
            }}>
              {this.state.error?.stack?.slice(0, 500)}
            </pre>
          </div>

          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "12px 28px",
              background: "var(--teal)", color: "var(--bg)",
              border: "none", borderRadius: "var(--radius)",
              fontSize: 14, fontWeight: 700,
              fontFamily: "var(--font-display)",
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      </div>
    );
  }
}
