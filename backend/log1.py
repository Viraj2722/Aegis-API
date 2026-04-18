import json
import os
import sys
import time
import requests
from typing import Any, Dict, List

AGENT_SERVER_URL = "http://192.168.1.169:8000/api/agent/ingest?redirect=true"

BASE_DIR = (
    os.path.dirname(sys.executable)
    if getattr(sys, "frozen", False)
    else os.path.dirname(os.path.abspath(__file__))
)


def load_config() -> Dict[str, Any]:
    for name in ("config.json", "data.json"):
        path = os.path.join(BASE_DIR, name)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("config.json or data.json not found")


def load_raw_logs(path: str) -> List[Dict[str, Any]]:
    full_path = path if os.path.isabs(path) else os.path.join(BASE_DIR, path)
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"{path} not found")
    with open(full_path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_logs(logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized = []
    aliases = {
        "api": ["api", "path", "endpoint", "url", "uri", "route"],
        "method": ["method", "http_method", "verb"],
        "response_code": ["response_code", "status_code", "status"],
        "response_time": ["response_time", "latency", "duration"],
        "payload_size": ["payload_size", "bytes", "size"],
        "timestamp": ["timestamp", "time", "date"],
    }

    for log in logs:
        row = {}
        for canonical, keys in aliases.items():
            value = None
            for key in keys:
                if key in log:
                    value = log[key]
                    break
            row[canonical] = value

        row["api"] = str(row.get("api") or "").strip()
        row["method"] = str(row.get("method") or "GET").upper()

        try:
            row["response_code"] = int(row.get("response_code") or 200)
        except Exception:
            row["response_code"] = 200

        try:
            row["response_time"] = float(row.get("response_time") or 0)
        except Exception:
            row["response_time"] = 0.0

        try:
            row["payload_size"] = float(row.get("payload_size") or 0)
        except Exception:
            row["payload_size"] = 0.0

        row["timestamp"] = row.get("timestamp") or ""
        if row["api"]:
            normalized.append(row)

    return normalized


def send_to_agent(secret_key: str, normalized_logs: List[Dict[str, Any]]) -> None:
    payload = {
        "secret_key": secret_key,
        "logs": normalized_logs,
    }
    response = requests.post(AGENT_SERVER_URL, json=payload, timeout=120)
    if response.status_code >= 400:
        raise RuntimeError(f"Server error {response.status_code}: {response.text}")


def run_scan() -> None:
    config = load_config()
    secret_key = config.get("secret_key") or config.get("secret-key") or config.get("api_key")
    log_path = config.get("log_path") or config.get("log_file_path")

    if not secret_key or not log_path:
        raise ValueError("config missing secret_key/api_key and/or log_path")

    raw_logs = load_raw_logs(log_path)
    normalized = normalize_logs(raw_logs)
    if not normalized:
        return

    send_to_agent(secret_key, normalized)


def main() -> None:
    config = load_config()
    interval_seconds = int(config.get("scan_interval_seconds") or 86400)
    max_scan_runs = int(config.get("max_scan_runs") or 1)

    if interval_seconds <= 0:
        raise ValueError("scan_interval_seconds must be > 0")
    if max_scan_runs == 0 or max_scan_runs < -1:
        raise ValueError("max_scan_runs must be -1 or a positive integer")

    runs = 0
    while max_scan_runs <= 0 or runs < max_scan_runs:
        try:
            run_scan()
        except Exception:
            pass

        runs += 1
        if max_scan_runs > 0 and runs >= max_scan_runs:
            break
        time.sleep(interval_seconds)


if __name__ == "__main__":
    main()
