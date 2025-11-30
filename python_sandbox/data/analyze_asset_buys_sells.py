import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional

# Input and output files
SECURITY_FILE = Path("python_sandbox/data/data/security_691dd48d3022610895c102ea.json")
OUTPUT_FILE = Path("python_sandbox/data/data/asset_buy_sell_dates.json")
REFERENCE_END_DATE = datetime(2025, 11, 29)


def parse_timestamp(ts: str) -> datetime:
    """Parse ISO timestamp to datetime, extracting just the date part"""
    # Remove timezone and time, keep just date
    date_str = ts.split('T')[0]
    return datetime.strptime(date_str, "%Y-%m-%d")


def find_buy_sell_dates(time_series: Dict[str, float]) -> List[Dict[str, str]]:
    """
    Analyze time series data to find buy and sell dates.
    
    Rules:
    - First day with value = bought
    - Gap in dates (e.g., Nov 28, then Dec 1) = sold on last day before gap, rebought on first day after gap
    - If last day isn't 2025-11-29, it was sold on the last day
    """
    if not time_series:
        return []
    
    # Parse and sort dates
    dates = sorted([parse_timestamp(ts) for ts in time_series.keys()])
    
    if not dates:
        return []
    
    transactions = []
    first_date = dates[0]
    last_date = dates[-1]
    
    # First transaction: bought on first day
    transactions.append({
        "action": "bought",
        "date": first_date.strftime("%Y-%m-%d")
    })
    
    # Check for gaps in dates
    for i in range(len(dates) - 1):
        current_date = dates[i]
        next_date = dates[i + 1]
        days_diff = (next_date - current_date).days
        
        # If gap is more than 1 day, it was sold and rebought
        if days_diff > 1:
            # Sold on the last day before gap
            transactions.append({
                "action": "sold",
                "date": current_date.strftime("%Y-%m-%d")
            })
            # Rebought on the first day after gap
            transactions.append({
                "action": "bought",
                "date": next_date.strftime("%Y-%m-%d")
            })
    
    # If last day isn't 2025-11-29, it was sold
    if last_date.date() != REFERENCE_END_DATE.date():
        transactions.append({
            "action": "sold",
            "date": last_date.strftime("%Y-%m-%d")
        })
    
    return transactions


def extract_asset_time_series(asset_data: Dict[str, Any]) -> Optional[Dict[str, float]]:
    """Extract time series rawValue from asset data"""
    values = asset_data.get("values", [])
    
    for value in values:
        if isinstance(value, dict):
            raw_value = value.get("rawValue")
            # Check if rawValue is a time series (dict with timestamp keys)
            if isinstance(raw_value, dict):
                # Check if keys look like timestamps
                sample_key = next(iter(raw_value.keys())) if raw_value else None
                if sample_key and 'T' in sample_key and isinstance(raw_value[sample_key], (int, float)):
                    return raw_value
    
    return None


def process_assets(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Recursively process all assets in the data structure"""
    results = []
    seen = set()  # Track seen assets to avoid duplicates
    
    def walk_lines(lines: List[Dict[str, Any]]):
        if not lines:
            return
        
        for line in lines:
            name = line.get("name")
            if name:
                # Try to extract time series
                time_series = extract_asset_time_series(line)
                
                if time_series:
                    transactions = find_buy_sell_dates(time_series)
                    if transactions:
                        first_date = min([parse_timestamp(ts) for ts in time_series.keys()]).strftime("%Y-%m-%d")
                        last_date = max([parse_timestamp(ts) for ts in time_series.keys()]).strftime("%Y-%m-%d")
                        
                        # Create a unique key based on asset name, dates, and transactions
                        # Convert transactions to a tuple for hashing
                        trans_key = tuple((t["action"], t["date"]) for t in transactions)
                        unique_key = (name, first_date, last_date, trans_key)
                        
                        # Only add if we haven't seen this exact combination before
                        if unique_key not in seen:
                            seen.add(unique_key)
                            results.append({
                                "asset": name,
                                "transactions": transactions,
                                "first_date": first_date,
                                "last_date": last_date
                            })
            
            # Recursively process sublines
            sublines = line.get("subLines")
            if sublines:
                walk_lines(sublines)
    
    # Start from resultLine
    result_line = data.get("resultLine", {})
    walk_lines(result_line.get("subLines", []))
    
    return results


def main():
    """Main function to analyze asset buy/sell dates"""
    print(f"Loading security data from {SECURITY_FILE}...")
    
    if not SECURITY_FILE.exists():
        print(f"Error: File {SECURITY_FILE} not found!")
        return
    
    with open(SECURITY_FILE, 'r') as f:
        data = json.load(f)
    
    print("Processing all assets...")
    results = process_assets(data)
    
    print(f"Found {len(results)} unique assets with time series data")
    
    # Save results
    print(f"Saving results to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Done! Results saved to {OUTPUT_FILE}")
    
    # Print summary
    print(f"\nSummary:")
    print(f"  Total assets analyzed: {len(results)}")
    
    # Count transactions
    total_buys = sum(len([t for t in asset["transactions"] if t["action"] == "bought"]) for asset in results)
    total_sells = sum(len([t for t in asset["transactions"] if t["action"] == "sold"]) for asset in results)
    print(f"  Total buy transactions: {total_buys}")
    print(f"  Total sell transactions: {total_sells}")
    
    # Show first few examples
    if results:
        print(f"\nFirst few assets:")
        for i, asset in enumerate(results[:5]):
            print(f"  {i+1}. {asset['asset']}")
            print(f"     First date: {asset['first_date']}, Last date: {asset['last_date']}")
            print(f"     Transactions: {len(asset['transactions'])}")
            for trans in asset['transactions'][:3]:  # Show first 3 transactions
                print(f"       - {trans['action']} on {trans['date']}")
            if len(asset['transactions']) > 3:
                print(f"       ... and {len(asset['transactions']) - 3} more")


if __name__ == "__main__":
    main()

