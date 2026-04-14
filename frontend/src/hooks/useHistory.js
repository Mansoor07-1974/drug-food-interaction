// hooks/useHistory.js
// Persists recent searches to localStorage

import { useState, useEffect } from "react";

const KEY      = "molguard_history";
const MAX_HIST = 20;

export function useHistory() {
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  });

  const addEntry = (result) => {
    setHistory((prev) => {
      const entry = {
        id:           Date.now(),
        drug_name:    result.drug_name,
        food_name:    result.food_name,
        overall_label: result.overall_label,
        overall_risk:  result.overall_risk,
        max_probability: result.max_probability,
        timestamp:    new Date().toISOString(),
      };
      const deduped = prev.filter(
        (h) => !(h.drug_name === entry.drug_name && h.food_name === entry.food_name)
      );
      const updated = [entry, ...deduped].slice(0, MAX_HIST);
      localStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem(KEY);
    setHistory([]);
  };

  return { history, addEntry, clearHistory };
}
