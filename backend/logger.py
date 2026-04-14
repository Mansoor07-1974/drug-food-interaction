"""
logger.py — Structured logging setup for MolGuard backend
Writes JSON-structured logs to logs/app.log for production monitoring.
"""

import logging
import logging.handlers
import json
import os
from datetime import datetime, timezone

LOG_DIR  = os.path.join(os.path.dirname(__file__), "logs")
LOG_FILE = os.path.join(LOG_DIR, "app.log")
os.makedirs(LOG_DIR, exist_ok=True)


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON for easy parsing."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "ts":      datetime.now(timezone.utc).isoformat(),
            "level":   record.levelname,
            "logger":  record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_obj["exc"] = self.formatException(record.exc_info)
        if hasattr(record, "drug"):
            log_obj["drug"] = record.drug
        if hasattr(record, "food"):
            log_obj["food"] = record.food
        if hasattr(record, "duration_ms"):
            log_obj["duration_ms"] = record.duration_ms
        return json.dumps(log_obj)


def get_logger(name: str) -> logging.Logger:
    """Return a logger writing to console + rotating log file."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # already configured

    logger.setLevel(logging.INFO)

    # Console handler
    console = logging.StreamHandler()
    console.setFormatter(logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    ))
    logger.addHandler(console)

    # File handler — rotate at 5 MB, keep 3 backups
    try:
        file_handler = logging.handlers.RotatingFileHandler(
            LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
        )
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)
    except OSError:
        pass  # Silently skip if log dir not writable (e.g. read-only container)

    return logger


# ── Prediction audit log ───────────────────────────────────────────────────────
_audit = get_logger("molguard.audit")


def log_prediction(drug: str, food: str, label: str,
                   risk: str, prob: float, duration_ms: float):
    """Log every prediction for audit / monitoring."""
    extra = {"drug": drug, "food": food, "duration_ms": round(duration_ms, 1)}
    _audit.info(
        f"PREDICT | {label} | risk={risk} | prob={prob:.3f} | "
        f"{drug} + {food} | {duration_ms:.0f}ms",
        extra=extra,
    )
