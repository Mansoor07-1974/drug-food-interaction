"""
pubchem.py — Async PubChem REST API client
Fetches SMILES for any drug/compound by name
"""

import logging
import httpx

logger = logging.getLogger(__name__)

PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"


class PubChemClient:
    """Async client for the PubChem PUG REST API."""

    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout

    async def get_smiles(self, compound_name: str) -> str | None:
        """
        Fetch the isomeric SMILES for a compound by name.
        Falls back to canonical SMILES if isomeric is unavailable.
        """
        name = compound_name.strip()
        urls = [
            f"{PUBCHEM_BASE}/compound/name/{name}/property/IsomericSMILES/JSON",
            f"{PUBCHEM_BASE}/compound/name/{name}/property/CanonicalSMILES/JSON",
        ]

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for url in urls:
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        props = data.get("PropertyTable", {}).get("Properties", [])
                        if props:
                            smiles = (props[0].get("IsomericSMILES")
                                      or props[0].get("CanonicalSMILES"))
                            if smiles:
                                logger.info(f"PubChem → '{name}': {smiles[:50]}...")
                                return smiles
                except httpx.TimeoutException:
                    logger.warning(f"PubChem timeout for '{name}'")
                except Exception as e:
                    logger.error(f"PubChem error for '{name}': {e}")

        logger.warning(f"PubChem: No SMILES found for '{name}'")
        return None

    async def get_cid(self, compound_name: str) -> int | None:
        """Get PubChem CID for a compound."""
        url = f"{PUBCHEM_BASE}/compound/name/{compound_name}/cids/JSON"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    cids = data.get("IdentifierList", {}).get("CID", [])
                    return cids[0] if cids else None
            except Exception as e:
                logger.error(f"PubChem CID error: {e}")
        return None
