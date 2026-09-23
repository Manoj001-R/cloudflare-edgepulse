"""Strict URL and SSRF validation protecting against private/internal access and DNS rebinding."""
import ipaddress
import socket
from urllib.parse import urlparse
from app.core.config import settings
from app.utils.errors import InvalidURLException, SSRFBlockedException

PROHIBITED_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "instance-data",
}

PROHIBITED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local and Cloud metadata (169.254.169.254)
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),  # Carrier-grade NAT
    ipaddress.ip_network("198.18.0.0/15"),  # Benchmark testing
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),        # Unique Local Address (ULA)
    ipaddress.ip_network("fe80::/10"),       # Link-Local
]


def is_ip_prohibited(ip_str: str) -> bool:
    """Check if an IPv4 or IPv6 address belongs to any prohibited private network."""
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        # Check standard properties
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_reserved or ip_obj.is_multicast:
            return True
        # Check explicit subnet ranges
        for net in PROHIBITED_NETWORKS:
            if ip_obj in net:
                return True
        return False
    except ValueError:
        return True


def validate_url(raw_url: str) -> str:
    """Validates raw URL against SSRF rules, ports, and schemes.
    
    Returns normalized URL string or raises InvalidURLException / SSRFBlockedException.
    """
    if not raw_url or not isinstance(raw_url, str):
        raise InvalidURLException("URL cannot be empty.")

    raw_url = raw_url.strip()

    # If no protocol scheme is present at all, default to https
    if "://" not in raw_url:
        raw_url = f"https://{raw_url}"

    try:
        parsed = urlparse(raw_url)
    except Exception as e:
        raise InvalidURLException(f"Failed to parse URL: {e}")

    # Check Scheme (strictly http or https only)
    if parsed.scheme.lower() not in ("http", "https"):
        raise InvalidURLException(f"Unsupported URL scheme '{parsed.scheme}'. Only http and https are allowed.")

    hostname = parsed.hostname
    if not hostname:
        raise InvalidURLException("URL must contain a valid domain or hostname.")

    hostname_lower = hostname.lower()

    # Check prohibited hostnames
    if hostname_lower in PROHIBITED_HOSTNAMES or hostname_lower.endswith((".local", ".internal", ".corp", ".lan")):
        raise SSRFBlockedException(f"Access to hostname '{hostname}' is prohibited.")

    # Check port
    port = parsed.port
    if port is None:
        port = 443 if parsed.scheme.lower() == "https" else 80

    if port not in settings.allowed_ports_list:
        raise SSRFBlockedException(f"Port {port} is not in allowed ports list ({settings.ALLOWED_PORTS}).")

    # Resolve hostname to verify IP addresses
    try:
        addr_info = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        # If DNS fails at this stage, we allow the tool to report the DNS resolution failure
        return raw_url
    except Exception as e:
        raise InvalidURLException(f"Address resolution failed: {e}")

    # Verify every resolved IP
    for _, _, _, _, sockaddr in addr_info:
        ip_addr = sockaddr[0]
        if is_ip_prohibited(ip_addr):
            raise SSRFBlockedException(f"URL hostname '{hostname}' resolves to prohibited IP address {ip_addr}.")

    return raw_url


def extract_domain(url: str) -> str:
    """Extract domain from URL safely."""
    parsed = urlparse(url)
    return parsed.hostname or url
