"""
Script to update assets with 0 volatility in full_asset_analysis.json
by matching them with non-zero volatility assets from preset_volatility.json
using last sell date as the matching criterion.
"""
import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

# File paths
SCRIPT_DIR = Path(__file__).parent
PRESET_FILE = SCRIPT_DIR / "preset_volatility.json"
FULL_ANALYSIS_FILE = SCRIPT_DIR / "full_asset_analysis.json"
OUTPUT_FILE = SCRIPT_DIR / "full_asset_analysis.json"


def parse_date(date_str: Optional[str]) -> Optional[str]:
    """Parse date string to YYYY-MM-DD format"""
    if not date_str:
        return None
    
    # Handle ISO format with timezone
    if 'T' in date_str:
        date_str = date_str.split('T')[0]
    
    # Try to parse and reformat
    try:
        # Try different formats
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y"]:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        return date_str
    except:
        return date_str


def extract_volatility_and_sell_date_from_preset(preset_data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Extract volatility values and last sell dates from preset data.
    Returns a dictionary mapping asset names to their volatility and sell date.
    """
    assets_map = {}
    
    def walk_lines(lines: Optional[list]):
        """Recursively walk through the nested line structure"""
        if not lines:
            return
        
        for line in lines:
            name = line.get("name")
            if name:
                # Look for volatility and last sell date in the values array
                values = line.get("values", [])
                volatility = None
                last_sell_date = None
                
                for value in values:
                    command = value.get("command", "")
                    
                    if command == "vola":
                        # Get the raw value
                        raw_value = value.get("rawValue")
                        if isinstance(raw_value, (int, float)) and raw_value != 0:
                            volatility = float(raw_value)
                        elif isinstance(raw_value, dict) and raw_value:
                            # If it's a time series, get the latest value
                            sorted_dates = sorted(raw_value.keys(), reverse=True)
                            if sorted_dates:
                                latest_value = raw_value[sorted_dates[0]]
                                if isinstance(latest_value, (int, float)) and latest_value != 0:
                                    volatility = float(latest_value)
                    
                    elif command == "last_sell_date":
                        raw_value = value.get("rawValue")
                        if raw_value:
                            last_sell_date = parse_date(str(raw_value))
                
                # Only store if we have non-zero volatility
                if volatility is not None and volatility != 0:
                    if name not in assets_map:
                        assets_map[name] = {
                            "volatility": volatility,
                            "last_sell_date": last_sell_date
                        }
                    else:
                        # If we have multiple entries, prefer the one with a sell date
                        if last_sell_date and not assets_map[name]["last_sell_date"]:
                            assets_map[name]["last_sell_date"] = last_sell_date
                        # Or prefer higher volatility if both have sell dates
                        elif last_sell_date and assets_map[name]["last_sell_date"]:
                            if volatility > assets_map[name]["volatility"]:
                                assets_map[name]["volatility"] = volatility
                                assets_map[name]["last_sell_date"] = last_sell_date
            
            # Recursively process sublines
            sublines = line.get("subLines")
            if sublines:
                walk_lines(sublines)
    
    # Start from resultLine
    result_line = preset_data.get("resultLine", {})
    walk_lines(result_line.get("subLines", []))
    
    return assets_map


def get_last_sell_date_from_asset(asset_data: Dict[str, Any]) -> Optional[str]:
    """Extract last sell date from asset data in full_asset_analysis.json"""
    transactions = asset_data.get("transactions_detail", [])
    if not transactions:
        return None
    
    # Get the latest sell date from all transactions
    sell_dates = []
    for trans in transactions:
        sell_date = trans.get("sell_date")
        if sell_date:
            sell_dates.append(parse_date(sell_date))
    
    if sell_dates:
        # Return the latest sell date
        try:
            parsed_dates = [datetime.strptime(d, "%Y-%m-%d") for d in sell_dates if d]
            if parsed_dates:
                return max(parsed_dates).strftime("%Y-%m-%d")
        except:
            return sell_dates[-1] if sell_dates else None
    
    return None


def find_matching_volatility(
    asset_name: str,
    sell_date: Optional[str],
    volatility_map: Dict[str, Dict[str, Any]],
    already_matched: set
) -> Optional[float]:
    """
    Find a matching volatility value for an asset.
    Priority:
    1. Exact name match with non-zero volatility
    2. Same sell date match with non-zero volatility
    3. Any asset with non-zero volatility (as fallback)
    """
    # First try: exact name match
    if asset_name in volatility_map:
        vol_data = volatility_map[asset_name]
        if vol_data["volatility"] != 0:
            return vol_data["volatility"]
    
    # Second try: match by sell date
    if sell_date:
        for name, vol_data in volatility_map.items():
            if name in already_matched:
                continue
            if vol_data["last_sell_date"] == sell_date and vol_data["volatility"] != 0:
                return vol_data["volatility"]
    
    # Third try: find any non-zero volatility (prefer assets with sell dates)
    candidates_with_date = [
        (name, vol_data) for name, vol_data in volatility_map.items()
        if vol_data["volatility"] != 0 and vol_data["last_sell_date"] and name not in already_matched
    ]
    if candidates_with_date:
        # Return the first one
        return candidates_with_date[0][1]["volatility"]
    
    # Last resort: any non-zero volatility
    candidates = [
        (name, vol_data) for name, vol_data in volatility_map.items()
        if vol_data["volatility"] != 0 and name not in already_matched
    ]
    if candidates:
        return candidates[0][1]["volatility"]
    
    return None


def update_zero_volatility_assets(
    full_analysis_data: List[Dict[str, Any]],
    volatility_map: Dict[str, Dict[str, Any]]
):
    """
    Update assets with 0 volatility.
    Returns updated data and statistics.
    """
    stats = {
        "total_assets": len(full_analysis_data),
        "zero_volatility_count": 0,
        "updated": 0,
        "not_updated": [],
        "matches": {
            "exact_name": 0,
            "by_sell_date": 0,
            "fallback": 0
        }
    }
    
    # Track which assets from volatility_map we've used
    already_matched = set()
    
    for asset_data in full_analysis_data:
        asset_name = asset_data.get("asset")
        current_volatility = asset_data.get("volatility", 0)
        
        # Only process assets with 0 volatility
        if current_volatility == 0:
            stats["zero_volatility_count"] += 1
            sell_date = get_last_sell_date_from_asset(asset_data)
            
            # Try to find matching volatility
            new_volatility = find_matching_volatility(
                asset_name, sell_date, volatility_map, already_matched
            )
            
            if new_volatility is not None:
                asset_data["volatility"] = new_volatility
                stats["updated"] += 1
                
                # Determine match type
                if asset_name in volatility_map:
                    stats["matches"]["exact_name"] += 1
                    already_matched.add(asset_name)
                elif sell_date:
                    # Find which asset we matched with
                    for name, vol_data in volatility_map.items():
                        if vol_data["last_sell_date"] == sell_date and vol_data["volatility"] == new_volatility:
                            stats["matches"]["by_sell_date"] += 1
                            already_matched.add(name)
                            break
                    else:
                        stats["matches"]["fallback"] += 1
                else:
                    stats["matches"]["fallback"] += 1
                
                print(f"  ✓ Updated '{asset_name}' (sell_date: {sell_date}): 0.0 → {new_volatility}")
            else:
                stats["not_updated"].append(asset_name)
                print(f"  ✗ Could not find match for '{asset_name}' (sell_date: {sell_date})")
    
    return full_analysis_data, stats


def main():
    """Main function to update zero volatility values"""
    print("=" * 60)
    print("Updating Zero Volatility Values from Preset")
    print("=" * 60)
    
    # Load preset data
    print(f"\n1. Loading preset data from {PRESET_FILE}...")
    if not PRESET_FILE.exists():
        print(f"✗ Error: {PRESET_FILE} not found!")
        return 1
    
    with open(PRESET_FILE, 'r') as f:
        preset_data = json.load(f)
    print(f"   ✓ Loaded preset data")
    
    # Extract volatility values and sell dates
    print(f"\n2. Extracting volatility values and sell dates from preset...")
    volatility_map = extract_volatility_and_sell_date_from_preset(preset_data)
    non_zero_count = sum(1 for v in volatility_map.values() if v["volatility"] != 0)
    print(f"   ✓ Found {len(volatility_map)} assets")
    print(f"   ✓ Found {non_zero_count} assets with non-zero volatility")
    
    # Show sample
    if volatility_map:
        print(f"\n   Sample volatilities:")
        for i, (name, vol_data) in enumerate(list(volatility_map.items())[:5]):
            print(f"     - {name}: {vol_data['volatility']} (sell_date: {vol_data['last_sell_date']})")
    
    # Load full analysis data
    print(f"\n3. Loading full asset analysis from {FULL_ANALYSIS_FILE}...")
    if not FULL_ANALYSIS_FILE.exists():
        print(f"✗ Error: {FULL_ANALYSIS_FILE} not found!")
        return 1
    
    with open(FULL_ANALYSIS_FILE, 'r') as f:
        full_analysis_data = json.load(f)
    print(f"   ✓ Loaded {len(full_analysis_data)} assets")
    
    # Count zero volatility assets
    zero_vol_count = sum(1 for a in full_analysis_data if a.get("volatility", 0) == 0)
    print(f"   ✓ Found {zero_vol_count} assets with 0 volatility")
    
    if zero_vol_count == 0:
        print("\n   No assets with 0 volatility found. Nothing to update.")
        return 0
    
    # Create backup
    backup_file = SCRIPT_DIR / f"full_asset_analysis_backup_before_zero_update.json"
    print(f"\n4. Creating backup to {backup_file}...")
    with open(backup_file, 'w') as f:
        json.dump(full_analysis_data, f, indent=2)
    print(f"   ✓ Backup created")
    
    # Update zero volatility values
    print(f"\n5. Updating zero volatility values...")
    updated_data, stats = update_zero_volatility_assets(full_analysis_data, volatility_map)
    
    # Save updated data
    print(f"\n6. Saving updated data to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(updated_data, f, indent=2)
    print(f"   ✓ Data saved")
    
    # Print statistics
    print(f"\n" + "=" * 60)
    print("Update Summary")
    print("=" * 60)
    print(f"Total assets in analysis: {stats['total_assets']}")
    print(f"Assets with 0 volatility: {stats['zero_volatility_count']}")
    print(f"Assets updated: {stats['updated']}")
    print(f"Assets not updated: {len(stats['not_updated'])}")
    print(f"\nMatch types:")
    print(f"  - Exact name match: {stats['matches']['exact_name']}")
    print(f"  - Matched by sell date: {stats['matches']['by_sell_date']}")
    print(f"  - Fallback match: {stats['matches']['fallback']}")
    
    if stats['not_updated']:
        print(f"\nAssets not updated (first 10):")
        for name in stats['not_updated'][:10]:
            print(f"  - {name}")
        if len(stats['not_updated']) > 10:
            print(f"  ... and {len(stats['not_updated']) - 10} more")
    
    print(f"\n✓ Update complete!")
    print(f"  Original file backed up to: {backup_file}")
    print(f"  Updated file: {OUTPUT_FILE}")
    
    return 0


if __name__ == "__main__":
    exit(main())

