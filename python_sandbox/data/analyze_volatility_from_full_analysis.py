import json
from pathlib import Path

# Input file
INPUT_FILE = Path("python_sandbox/data/full_asset_analysis.json")
OUTPUT_FILE = Path("python_sandbox/data/data/asset_volatility_from_full_analysis.json")

def main():
    print(f"Loading data from {INPUT_FILE}...")
    if not INPUT_FILE.exists():
        print(f"Error: File {INPUT_FILE} not found!")
        return
    with open(INPUT_FILE, "r") as f:
        data = json.load(f)
    results = []
    for asset in data:
        name = asset.get("asset")
        volatility = asset.get("volatility")
        if name is not None and volatility is not None:
            results.append({"asset": name, "volatility": volatility})
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
