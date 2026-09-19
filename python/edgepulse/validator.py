"""
URL Validator with SSRF Protection for EdgePulse Python.

Validates target URLs and strictly blocks access to private/internal networks,
link-local addresses, cloud metadata endpoints, and dangerous internal service ports.
"""

from __future__ import annotations
import ipaddress
import re
from typing import NamedTuple, Optional
from urllib.parse import urlparse


class UrlValidationResult(NamedTuple):
    valid: bool
    sanitized_url: Optional[str] = None
    hostname: Optional[str] = None
    error: Optional[str] = None


BLOCKED_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
    "metadata.google.internal",
    "metadata.google",
    "kubernetes.default.svc",
    "kubernetes.default",
    "kubernetes",
}

BLOCKED_HOSTNAME_SUFFIXES = (
    ".internal",
    ".local",
    ".localhost",
    ".arpa",
)

BLOCKED_PATHS = (
    "/latest/meta-data",
    "/metadata/v1",
    "/computemetadata",
    "/openstack",
)

BLOCKED_PORTS = {22, 23, 25, 110, 143, 445, 3306, 5432, 6379, 27017}

IPV4_REGEX = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")


CGNAT_NET = ipaddress.ip_network("100.64.0.0/10")


def is_blocked_ip(ip_str: str) -> bool:
    """Check whether an IP address belongs to any private, loopback, or reserved range."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
            or (isinstance(ip, ipaddress.IPv4Address) and ip in CGNAT_NET)
        )
    except ValueError:
        return False


def validate_url(raw_url: str) -> UrlValidationResult:
    """
    Validate a URL against SSRF vulnerabilities and security rules.
    """
    if not raw_url or len(raw_url) > 2048:
        return UrlValidationResult(
            valid=False, error="URL is empty or exceeds maximum length (2048 characters)"
        )

    try:
        parsed = urlparse(raw_url.strip())
    except Exception as exc:
        return UrlValidationResult(valid=False, error=f"Invalid URL format: {exc}")

    # Enforce allowed protocols
    if parsed.scheme.lower() not in ("http", "https"):
        return UrlValidationResult(
            valid=False, error="Only http:// and https:// protocols are allowed"
        )

    # Disallow embedded credentials
    if parsed.username or parsed.password:
        return UrlValidationResult(
            valid=False, error="URLs containing user credentials are not allowed"
        )

    hostname = parsed.hostname
    if not hostname:
        return UrlValidationResult(valid=False, error="Hostname is required")

    hostname_lower = hostname.lower()

    # Block well-known internal hostnames
    if hostname_lower in BLOCKED_HOSTNAMES:
        return UrlValidationResult(
            valid=False, error=f"Blocked hostname: {hostname_lower}"
        )

    # Block dangerous suffixes
    if any(hostname_lower.endswith(suffix) for suffix in BLOCKED_HOSTNAME_SUFFIXES):
        return UrlValidationResult(
            valid=False, error=f"Blocked internal hostname suffix for: {hostname_lower}"
        )

    # Check for direct IP addresses (IPv4 or IPv6)
    clean_ip = hostname_lower.strip("[]")
    if is_blocked_ip(clean_ip):
        return UrlValidationResult(
            valid=False, error="Access to private or reserved IP addresses is prohibited"
        )

    # Check for cloud metadata paths
    path_lower = parsed.path.lower()
    if any(path_lower.startswith(bp) for bp in BLOCKED_PATHS):
        return UrlValidationResult(
            valid=False, error="Access to cloud metadata endpoints is prohibited"
        )

    # Check restricted ports
    if parsed.port and parsed.port in BLOCKED_PORTS:
        return UrlValidationResult(
            valid=False, error=f"Access to restricted port {parsed.port} is not allowed"
        )

    sanitized_url = parsed.geturl()
    return UrlValidationResult(
        valid=True,
        sanitized_url=sanitized_url,
        hostname=hostname_lower,
    )


def validate_redirect_url(redirect_url: str, original_url: str) -> UrlValidationResult:
    """Validate a redirect target URL to prevent SSRF via open redirects."""
    return validate_url(redirect_url)
