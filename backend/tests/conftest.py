"""
conftest.py — pytest configuration and shared fixtures
"""
import sys, os, pytest
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="session")
def client():
    """Shared test client — startup runs once for all tests."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def known_drug():
    return "Warfarin"

@pytest.fixture
def known_food():
    return "Spinach"

@pytest.fixture
def known_unsafe_pair():
    return {"drug_name": "Warfarin", "food_name": "Spinach"}

@pytest.fixture
def known_safe_pair():
    return {"drug_name": "Metformin", "food_name": "Tomato"}

@pytest.fixture
def valid_smiles_pair():
    return {
        "drug_smiles":        "CC1(C2CC3CC(C2)(CC3C1=O)OC(=O)c1ccccc1)O",  # Warfarin
        "constituent_smiles": "CC1(CCC(=C)C(C1)OC(=O)/C=C/c1ccc(O)cc1)C",  # Vitamin K
    }
