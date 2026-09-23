"""Tests for URL and SSRF validation."""
import pytest
from app.utils.errors import InvalidURLException, SSRFBlockedException
from app.utils.url_validator import is_ip_prohibited, validate_url


def test_valid_urls():
    assert validate_url("https://example.com").startswith("https://example.com")
    assert validate_url("http://example.com").startswith("http://example.com")
    assert validate_url("example.com").startswith("https://example.com")


def test_invalid_schemes():
    with pytest.raises(InvalidURLException):
        validate_url("ftp://example.com")
    with pytest.raises(InvalidURLException):
        validate_url("file:///etc/passwd")
    with pytest.raises(InvalidURLException):
        validate_url("gopher://127.0.0.1")


def test_ssrf_prohibited_hostnames():
    with pytest.raises(SSRFBlockedException):
        validate_url("http://localhost")
    with pytest.raises(SSRFBlockedException):
        validate_url("http://localhost.localdomain")
    with pytest.raises(SSRFBlockedException):
        validate_url("http://127.0.0.1")
    with pytest.raises(SSRFBlockedException):
        validate_url("http://metadata.google.internal")


def test_ssrf_prohibited_subnets():
    # RFC 1918 & Loopback
    assert is_ip_prohibited("127.0.0.1") is True
    assert is_ip_prohibited("10.0.0.5") is True
    assert is_ip_prohibited("172.16.0.1") is True
    assert is_ip_prohibited("192.168.1.1") is True
    # Cloud metadata
    assert is_ip_prohibited("169.254.169.254") is True
    # IPv6 loopback
    assert is_ip_prohibited("::1") is True
    # Public IP
    assert is_ip_prohibited("93.184.216.34") is False
    assert is_ip_prohibited("1.1.1.1") is False
