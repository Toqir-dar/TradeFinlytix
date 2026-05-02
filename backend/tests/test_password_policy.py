import pytest

from app.utils.helpers import validate_password_strength


def test_password_rejects_when_over_72_bytes():
    pwd = "a" * 80
    assert len(pwd.encode("utf-8")) > 72
    with pytest.raises(ValueError, match="72 bytes"):
        validate_password_strength(pwd)


def test_password_accepts_plain_ascii():
    p = validate_password_strength("Validpass1!")
    assert p == "Validpass1!"
