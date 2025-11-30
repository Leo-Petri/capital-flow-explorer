import json
from pathlib import Path

# Input files
FULL_ANALYSIS_FILE = Path("python_sandbox/data/full_asset_analysis.json")
NEW_VOLATILITY_FILE = Path("python_sandbox/data/data/asset_volatility.json")
OUTPUT_FILE = Path("python_sandbox/data/full_asset_analysis_with_new_volatility.json")

def main():
    print(f"Loading full analysis from {FULL_ANALYSIS_FILE}...")
    if not FULL_ANALYSIS_FILE.exists():
        print(f"Error: File {FULL_ANALYSIS_FILE} not found!")
        return
    with open(FULL_ANALYSIS_FILE, "r") as f:
        full_data = json.load(f)

    print(f"Loading new volatility data from {NEW_VOLATILITY_FILE}...")
    if not NEW_VOLATILITY_FILE.exists():
        print(f"Error: File {NEW_VOLATILITY_FILE} not found!")
        return
    with open(NEW_VOLATILITY_FILE, "r") as f:
        volatility_data = json.load(f)

    # Build a mapping from asset name to volatility
    volatility_map = {item["asset"]: item["volatility"] for item in volatility_data}

    # Replace volatility in full_data
    updated = 0
    for asset in full_data:
        name = asset.get("asset")
        if name in volatility_map:
            asset["volatility"] = volatility_map[name]
            updated += 1
    print(f"Updated volatility for {updated} assets.")

    # Save result
    with open(OUTPUT_FILE, "w") as f:
        json.dump(full_data, f, indent=2)
    print(f"Saved updated analysis to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
