"""
Pytest configuration and fixtures.
"""

import pytest

@pytest.fixture(scope="session")
def project_root():
    from pathlib import Path
    return Path(__file__).parent.parent
