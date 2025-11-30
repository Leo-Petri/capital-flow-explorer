import json
from pathlib import Path

# Input file
SECURITY_FILE = Path("python_sandbox/data/data/volatility_692b51eb7b0feeedced7dd5a.json")
OUTPUT_FILE = Path("python_sandbox/data/data/asset_volatility.json")


def extract_volatility_index(headers):
    """Find the index of the volatility column in headers."""
    for i, header in enumerate(headers):
        if isinstance(header, dict):
            name = header.get("name", "").lower()
            cmd = header.get("command", "").lower()
        else:
            name = str(header).lower()
            cmd = name
        if "volatility" in name or "volatility" in cmd:
            return i
    return None


def walk_lines(lines, volatility_idx, results):
    if not lines:
        return
    for line in lines:
        name = line.get("name")
        values = line.get("values", [])
        volatility = None
        if name and volatility_idx is not None and volatility_idx < len(values):
            cell = values[volatility_idx]
            if isinstance(cell, dict):
                volatility = cell.get("rawValue") if cell.get("rawValue") is not None else cell.get("value")
            else:
                volatility = cell
            if volatility is not None:
                results.append({"asset": name, "volatility": volatility})
        # Recursively process sublines
        sublines = line.get("subLines")
        if sublines:
            walk_lines(sublines, volatility_idx, results)

def main():
    print(f"Loading data from {SECURITY_FILE}...")
    if not SECURITY_FILE.exists():
        print(f"Error: File {SECURITY_FILE} not found!")
        return
    with open(SECURITY_FILE, "r") as f:
        data = json.load(f)
    headers = data.get("headers", [])
    volatility_idx = extract_volatility_index(headers)
    if volatility_idx is None:
        print("Could not find volatility column in headers.")
        return
    results = []
    result_line = data.get("resultLine", {})
    walk_lines(result_line.get("subLines", []), volatility_idx, results)
    print(f"Found {len(results)} assets with volatility.")
    # Save results
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Saved asset volatility mapping to {OUTPUT_FILE}")
    # Print first few
    for asset in results[:5]:
        print(asset)

if __name__ == "__main__":
    main()
