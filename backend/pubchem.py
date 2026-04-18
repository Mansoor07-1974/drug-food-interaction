import logging
import httpx
from urllib.parse import quote

logger = logging.getLogger(__name__)

PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"


class PubChemClient:
    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout

    async def get_smiles(self, compound_name: str) -> str | None:
        from urllib.parse import quote

        name_raw = compound_name.strip()
        name = quote(name_raw)

        url = f"{PUBCHEM_BASE}/compound/name/{name}/property/CanonicalSMILES/JSON"

        print("INPUT:", name_raw)
        print("URL:", url)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url)

                print("STATUS:", resp.status_code)
                print("BODY:", resp.text[:500])

                if resp.status_code == 200:
                    data = resp.json()
                    props = data.get("PropertyTable", {}).get("Properties", [])

                    if props:
                        smiles = (
                            props[0].get("IsomericSMILES")
                            or props[0].get("CanonicalSMILES")
                            or props[0].get("ConnectivitySMILES")
                        )
                        print("SMILES:", smiles)
                        return smiles

            except Exception as e:
                print("ERROR:", e)

        return None

    async def get_cid(self, compound_name: str):
        name = quote(compound_name.strip())

        url = f"{PUBCHEM_BASE}/compound/name/{name}/cids/JSON"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    cids = data.get("IdentifierList", {}).get("CID", [])
                    return cids[0] if cids else None
            except Exception as e:
                logger.error(f"CID error: {e}")

        return None