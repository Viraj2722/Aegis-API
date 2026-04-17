import pandas as pd
import random
import json
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass

@dataclass(frozen=True)
class ApiProfile:
    paths: list[str]
    methods: list[str]
    method_weights: list[int]
    response_codes: list[int]
    code_weights: list[int]
    response_time_range: tuple[int, int]
    payload_size_range: tuple[int, int]
    ip_pool: list[str]
    days_back: int
    weight: float                        # sampling weight (must sum to 1.0)

# Pre-build IP pools once — avoids repeated f-string formatting in the hot loop
_INTERNAL_IPS = [f"192.168.1.{i}" for i in range(1, 256)]
_EXTERNAL_IPS = [f"10.0.0.{i}"    for i in range(1, 256)]

USER_AGENTS = [
    "Mozilla/5.0",
    "PostmanRuntime/7.32.3",
    "curl/7.68.0",
]

PROFILES: dict[str, ApiProfile] = {
    "normal": ApiProfile(
        paths=[
            "/user/login", "/user/register",
            "/payments/process", "/payments/status",
            "/orders/create", "/orders/history",
        ],
        methods=["GET", "POST", "PUT", "DELETE"],
        method_weights=[30, 45, 15, 10],        # POST-heavy: realistic CRUD traffic
        response_codes=[200, 201, 500],
        code_weights=[80, 15, 5],
        response_time_range=(80, 220),
        payload_size_range=(200, 1_200),
        ip_pool=_INTERNAL_IPS,
        days_back=5,
        weight=0.70,
    ),
    "zombie": ApiProfile(
        paths=["/legacy/payment", "/legacy/userdata"],
        methods=["GET", "POST", "PUT", "DELETE"],
        method_weights=[50, 30, 10, 10],
        response_codes=[200, 404],
        code_weights=[75, 25],
        response_time_range=(150, 350),
        payload_size_range=(100, 600),
        ip_pool=_INTERNAL_IPS,
        days_back=90,                           # old timestamps signal zombie traffic
        weight=0.20,
    ),
    "suspicious": ApiProfile(
        paths=["/debug/test-api", "/internal/admin-secret"],
        methods=["GET", "POST", "PUT", "DELETE"],
        method_weights=[20, 50, 20, 10],
        response_codes=[401, 403, 429, 500],
        code_weights=[30, 30, 25, 15],
        response_time_range=(300, 1_200),
        payload_size_range=(1_000, 6_000),
        ip_pool=_EXTERNAL_IPS,                  # external IPs flag suspicious origin
        days_back=1,                            # recent spike
        weight=0.10,
    ),
}

# -----------------------------
# FAST TIMESTAMP GENERATOR
# -----------------------------
_NOW_TS: float = datetime.now(timezone.utc).timestamp()

def _random_timestamp(days_back: int) -> str:
    """Epoch arithmetic is faster than timedelta construction per call."""
    offset = random.random() * days_back * 86_400
    return datetime.fromtimestamp(_NOW_TS - offset, tz=timezone.utc).isoformat()

# -----------------------------
# LOG FACTORY
# -----------------------------
def build_log(profile: ApiProfile) -> dict:
    # Keys mapped to match the pandas ML pipeline requirements
    return {
        "log_id":             str(uuid.uuid4()),
        "endpoint":           random.choice(profile.paths),
        "method":             random.choices(profile.methods, weights=profile.method_weights, k=1)[0],
        "status_code":        random.choices(profile.response_codes, weights=profile.code_weights, k=1)[0],
        "response_time_ms":   random.randint(*profile.response_time_range),
        "payload_size_bytes": random.randint(*profile.payload_size_range),
        "ip_address":         random.choice(profile.ip_pool),
        "user_agent":         random.choice(USER_AGENTS),
        "timestamp":          _random_timestamp(profile.days_back),
    }

# -----------------------------
# MAIN ENTRY POINTS
# -----------------------------
def generate_logs(total: int) -> list[dict]:
    profile_weights = [p.weight for p in PROFILES.values()]
    profile_objs    = list(PROFILES.values())

    # Pick all categories at once — one call vs. 3000 random.random() calls
    chosen = random.choices(profile_objs, weights=profile_weights, k=total)
    return [build_log(p) for p in chosen]

def generate_mock_logs(num_logs=5000) -> pd.DataFrame:
    """
    Wrapper to make this compatible with the existing AegisAPI ML pipeline.
    Generates logs and returns a pandas DataFrame with localized datetimes.
    """
    logs = generate_logs(num_logs)
    df = pd.DataFrame(logs)
    
    # Convert ISO strings to datetime objects and remove tzinfo to allow pandas 
    # dt subtraction with datetime.now() in ml_pipeline.py
    df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize(None)
    return df
