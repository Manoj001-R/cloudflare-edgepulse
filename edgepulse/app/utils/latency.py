"""Latency calculations and classification helpers."""
import statistics
from typing import List, Tuple
from app.core.config import settings


def classify_latency(avg_ms: float) -> str:
    """Classify average response time into standard operational bands."""
    if avg_ms < settings.LATENCY_LOW_THRESHOLD_MS:
        return "LOW"
    elif avg_ms <= settings.LATENCY_MODERATE_THRESHOLD_MS:
        return "MODERATE"
    elif avg_ms <= settings.LATENCY_HIGH_THRESHOLD_MS:
        return "HIGH"
    return "CRITICAL"


def compute_latency_stats(samples: List[float]) -> Tuple[float, float, float, float, str]:
    """Computes min, max, avg, median, and category for latency samples."""
    if not samples:
        return 0.0, 0.0, 0.0, 0.0, "UNKNOWN"

    min_ms = round(min(samples), 2)
    max_ms = round(max(samples), 2)
    avg_ms = round(statistics.mean(samples), 2)
    median_ms = round(statistics.median(samples), 2)
    classification = classify_latency(avg_ms)

    return min_ms, max_ms, avg_ms, median_ms, classification
