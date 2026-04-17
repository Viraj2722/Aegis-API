import json
import requests
import os
import sys
import webbrowser
from typing import List, Dict, Any

# Correct ingest endpoint
AGENT_SERVER_URL = "http://192.168.1.169:8000/api/agent/ingest?redirect=true"

BASE_DIR = (
    os.path.dirname(sys.executable)
    if getattr(sys, "frozen", False)
    else os.path.dirname(os.path.abspath(__file__))
)

def load_config() -> Dict[str, Any]:
    config_candidates = ["config.json", "data.json"]
    config_path = None
    for name in config_candidates:
        candidate = os.path.join(BASE_DIR, name)
        if os.path.exists(candidate):
            config_path = candidate
            break

    if not config_path:
        raise FileNotFoundError("config.json or data.json not found")

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

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
        "timestamp": ["timestamp", "time", "date"]
    }

    for log in logs:
        new_log = {}
        for canonical, keys in aliases.items():
            value = None
            for key in keys:
                if key in log:
                    value = log[key]
                    break
            new_log[canonical] = value

        new_log["api"] = str(new_log.get("api") or "").strip()
        new_log["method"] = str(new_log.get("method") or "GET").upper()

        try:
            new_log["response_code"] = int(new_log.get("response_code") or 200)
        except Exception:
            new_log["response_code"] = 200

        try:
            new_log["response_time"] = float(new_log.get("response_time") or 0)
        except Exception:
            new_log["response_time"] = 0.0

        try:
            new_log["payload_size"] = float(new_log.get("payload_size") or 0)
        except Exception:
            new_log["payload_size"] = 0.0

        new_log["timestamp"] = new_log.get("timestamp") or ""
        if new_log["api"] == "":
            continue

        normalized.append(new_log)

    return normalized

def send_to_agent(secret_key: str, normalized_logs: List[Dict[str, Any]]):
    payload = {
        "secret_key": secret_key,
        "logs": normalized_logs
    }

    try:
        print(f"Sending {len(normalized_logs)} logs to server...")
        response = requests.post(
            AGENT_SERVER_URL,
            json=payload,
            timeout=15,
            allow_redirects=False,
        )

        if response.status_code in (301, 302, 303, 307, 308):
            location = response.headers.get("location")
            print(f"Redirect received ({response.status_code})")
            if location:
                print(f"Dashboard URL: {location}")
                try:
                    webbrowser.open(location)
                    print("Opened dashboard in default browser")
                except Exception as open_err:
                    print(f"Could not open browser automatically: {open_err}")
            else:
                print("Redirect response had no Location header")
            return

        if response.status_code == 200:
            print("Success")
            body = response.json()
            print(body)
            dashboard_url = body.get("dashboard_url") if isinstance(body, dict) else None
            if dashboard_url:
                print(f"Dashboard URL: {dashboard_url}")
        else:
            print(f"Server Error ({response.status_code})")
            print(response.text)

    except requests.exceptions.Timeout:
        print("Request timed out")
    except requests.exceptions.ConnectionError:
        print("Could not connect to server")
    except Exception as e:
        print("Unexpected error:", str(e))

def main():
    print("Starting Log Processing Agent")
    try:
        config = load_config()
        secret_key = config.get("secret_key") or config.get("secret-key")

        # Accept either key name to avoid config mismatch
        log_path = config.get("log_path") or config.get("log_file_path")

        if not secret_key or not log_path:
            raise ValueError("Invalid config (missing secret_key/secret-key or log_path)")

        raw_logs = load_raw_logs(log_path)
        print(f"Loaded {len(raw_logs)} raw logs")

        normalized_logs = normalize_logs(raw_logs)
        print(f"Normalized {len(normalized_logs)} logs")

        if not normalized_logs:
            print("No valid logs to send")
            return

        send_to_agent(secret_key, normalized_logs)

    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    main()