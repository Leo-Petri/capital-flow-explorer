import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from qplix_api_client import QplixAPIClient

# Configuration
url = "https://smd43.qplix.com"
F5Bearer = "m3brPHW19chc7Vr4Pd5LBaTmBQOLoIknjlW3pfG7UMzlaSJo22yXdJsKysorKCY5"
QUserUsername = "qplix@qplix.com"
QUserPassword = "Power4All"

# Preset IDs
SECURITY_PRESET_ID = "691dd48d3022610895c102ea"  # For NAV/P&L data
NEW_PRESET_ID = "692b51eb7b0feeedced7dd5a"  # For volatility, interest rate, purchase price
LEGAL_ENTITY_ID = "5cb71a8b2c94de98b02aff19"

# Files
DATA_DIR = Path("python_sandbox/data")
BUY_SELL_FILE = DATA_DIR / "asset_buy_sell_dates.json"
OUTPUT_FILE = DATA_DIR / "full_asset_analysis.json"
REFERENCE_END_DATE = datetime(2025, 11, 29)


def parse_timestamp(ts: str) -> datetime:
    """Parse ISO timestamp to datetime, extracting just the date part"""
    date_str = ts.split('T')[0]
    return datetime.strptime(date_str, "%Y-%m-%d")


def find_timestamp_key(date_str: str, time_series: Dict[str, float]) -> Optional[str]:
    """Find the timestamp key in time series: Exact match or last known value (closest past date)"""
    target_date = datetime.strptime(date_str, "%Y-%m-%d")
    sorted_keys = sorted(time_series.keys())
    
    best_match = None
    
    for ts_key in sorted_keys:
        ts_date = parse_timestamp(ts_key)
        
        # If we found an exact match, return it
        if ts_date.date() == target_date.date():
            return ts_key
        
        # If the current key is before the target, store it as a candidate
        if ts_date.date() < target_date.date():
            best_match = ts_key
        
        # If we passed the target date, stop looking
        if ts_date.date() > target_date.date():
            break
            
    # Return the best match found (closest past date)
    # If no past date exists (target is before all timestamps), return None
    return best_match


def get_cell_value(cell: Any) -> Any:
    """Extract value from a cell (can be dict or primitive)"""
    if isinstance(cell, dict):
        return cell.get("rawValue") if cell.get("rawValue") is not None else cell.get("value")
    return cell


def extract_metrics_from_asset(asset_data: Dict[str, Any], headers: List[Any]) -> Dict[str, Any]:
    """Extract volatility, interest rate, purchase price, and other metrics from asset data"""
    metrics = {}
    values = asset_data.get("values", [])
    
    # Find indices for different metrics
    metric_indices = {}
    for i, header in enumerate(headers):
        if isinstance(header, dict):
            cmd = header.get("command", "").lower()
            name = str(header.get("name", "")).lower()
        else:
            cmd = str(header).lower()
            name = cmd
        
        # Look for volatility
        if "volatility" in cmd or "volatility" in name:
            metric_indices["volatility"] = i
        
        # Look for interest rate
        if "interest" in cmd or "interest" in name or "interest_rate" in cmd:
            metric_indices["interest_rate"] = i
        
        # Look for purchase price
        if "purchase" in cmd or "purchase" in name or "buy" in cmd or "buy" in name:
            metric_indices["purchase_price"] = i
        
        # Look for price
        if ("price" in cmd or "price" in name) and "purchase" not in cmd and "purchase" not in name:
            metric_indices["price"] = i
    
    # Extract values
    for metric_name, idx in metric_indices.items():
        if idx < len(values):
            value = get_cell_value(values[idx])
            metrics[metric_name] = value
    
    # Also extract all time series
    time_series_dict = {}
    for idx, value in enumerate(values):
        if isinstance(value, dict):
            raw_value = value.get("rawValue")
            if isinstance(raw_value, dict):
                sample_key = next(iter(raw_value.keys())) if raw_value else None
                if sample_key and 'T' in sample_key and isinstance(raw_value[sample_key], (int, float)):
                    command = value.get("command", f"value_{idx}")
                    time_series_dict[command] = raw_value
                    time_series_dict[idx] = raw_value
    
    metrics["time_series"] = time_series_dict
    
    return metrics


def extract_all_assets_with_metrics(data: Dict[str, Any], headers: List[Any]) -> Dict[str, Dict[str, Any]]:
    """Extract all assets with their metrics from the preset data"""
    assets_dict = {}
    
    def walk_lines(lines: List[Dict[str, Any]]):
        if not lines:
            return
        
        for line in lines:
            name = line.get("name")
            if name:
                metrics = extract_metrics_from_asset(line, headers)
                if metrics:
                    # Use asset name as key, store metrics
                    if name not in assets_dict:
                        assets_dict[name] = metrics
                    else:
                        # Merge metrics if asset appears multiple times
                        for key, value in metrics.items():
                            if key not in assets_dict[name] or assets_dict[name][key] is None:
                                assets_dict[name][key] = value
            
            # Recursively process sublines
            sublines = line.get("subLines")
            if sublines:
                walk_lines(sublines)
    
    result_line = data.get("resultLine", {})
    walk_lines(result_line.get("subLines", []))
    
    return assets_dict


def calculate_daily_changes(nav_time_series: Dict[str, float]) -> List[Dict[str, Any]]:
    """Calculate daily changes from NAV time series"""
    if not nav_time_series:
        return []
    
    # Sort by date
    sorted_dates = sorted(nav_time_series.keys(), key=lambda x: parse_timestamp(x))
    
    daily_changes = []
    prev_nav = None
    prev_date = None
    
    for date_key in sorted_dates:
        nav = nav_time_series[date_key]
        date_str = parse_timestamp(date_key).strftime("%Y-%m-%d")
        
        change = None
        change_percent = None
        if prev_nav is not None:
            change = nav - prev_nav
            if prev_nav != 0:
                change_percent = (change / prev_nav) * 100
        
        daily_changes.append({
            "date": date_str,
            "nav": nav,
            "change": change,
            "change_percent": change_percent
        })
        
        prev_nav = nav
        prev_date = date_str
    
    return daily_changes


def calculate_profit_and_prices(asset_name: str, transactions: List[Dict], 
                                nav_time_series: Dict[str, float],
                                purchase_price: Optional[float] = None) -> Dict[str, Any]:
    """Calculate profit/loss and selling prices for an asset"""
    if not nav_time_series:
        return {
            "asset": asset_name,
            "total_profit": 0.0,
            "transactions_detail": [],
            "error": "No NAV time series found"
        }
    
    total_profit = 0.0
    transactions_detail = []
    
    # Process transactions in pairs (buy, sell)
    i = 0
    while i < len(transactions):
        if transactions[i]["action"] == "bought":
            buy_date = transactions[i]["date"]
            buy_ts = find_timestamp_key(buy_date, nav_time_series)
            buy_nav = nav_time_series.get(buy_ts, 0.0) if buy_ts else 0.0
            
            # Find corresponding sell
            sell_date = None
            sell_nav = None
            if i + 1 < len(transactions) and transactions[i + 1]["action"] == "sold":
                sell_date = transactions[i + 1]["date"]
                sell_ts = find_timestamp_key(sell_date, nav_time_series)
                sell_nav = nav_time_series.get(sell_ts, 0.0) if sell_ts else 0.0
                i += 2
            else:
                # No sell found, use last available NAV
                last_ts = sorted(nav_time_series.keys())[-1]
                sell_date = parse_timestamp(last_ts).strftime("%Y-%m-%d")
                sell_nav = nav_time_series[last_ts]
                i += 1
            
            # Calculate profit using NAV
            profit = sell_nav - buy_nav if sell_nav is not None and buy_nav is not None else 0.0
            total_profit += profit

            # Determine purchase price: prefer preset value, fallback to buy NAV
            # Fix: Treat 0.0 as None so we calculate based on NAV
            if purchase_price is not None and purchase_price > 0:
                actual_purchase_price = purchase_price
            else:
                actual_purchase_price = buy_nav

            # Calculate selling price
            selling_price = actual_purchase_price + profit

            transactions_detail.append({
                "buy_date": buy_date,
                "sell_date": sell_date,
                "purchase_price": actual_purchase_price,
                "selling_price": selling_price,
                "buy_nav": buy_nav,
                "sell_nav": sell_nav,
                "profit": profit
            })
            
            # --- REMOVED DUPLICATE BLOCK HERE ---
            
        else:
            i += 1
    
    return {
        "asset": asset_name,
        "total_profit": total_profit,
        "transactions_detail": transactions_detail
    }


def main():
    """Main function to perform comprehensive asset analysis"""
    DATA_DIR.mkdir(exist_ok=True)
    
    # Initialize API client
    client = QplixAPIClient(
        base_url=url,
        f5_bearer=F5Bearer,
        username=QUserUsername,
        password=QUserPassword
    )
    
    # Authenticate
    print("Authenticating...")
    client.authenticate()
    print("Authentication successful!")
    
    # Load buy/sell data
    if not BUY_SELL_FILE.exists():
        print(f"Error: {BUY_SELL_FILE} not found! Please run analyze_asset_buys_sells.py first.")
        return
    
    with open(BUY_SELL_FILE, 'r') as f:
        buy_sell_data = json.load(f)
    
    # Create lookup for buy/sell transactions
    buy_sell_lookup = {}
    for item in buy_sell_data:
        asset_name = item.get("asset")
        if asset_name:
            key = (asset_name, item.get("first_date"), item.get("last_date"))
            if key not in buy_sell_lookup:
                buy_sell_lookup[key] = item
    
    # Fetch new preset data
    print(f"\nFetching data from new preset (ID: {NEW_PRESET_ID})...")
    try:
        new_preset_data = client.get_evaluation_preset_legal_entity(
            preset_id=NEW_PRESET_ID,
            legal_entity_id=LEGAL_ENTITY_ID
        )
        
        # Save new preset data
        new_preset_file = DATA_DIR / f"new_preset_{NEW_PRESET_ID}.json"
        print(f"Saving new preset data to {new_preset_file}...")
        with open(new_preset_file, 'w') as f:
            json.dump(new_preset_data, f, indent=2)
        
        headers = new_preset_data.get("headers", [])
        print(f"Found {len(headers)} headers in new preset")
        print("Headers:", [str(h) if not isinstance(h, dict) else h.get("name", h.get("command", "")) for h in headers[:10]])
        
        # Extract assets with metrics from new preset
        assets_with_metrics = extract_all_assets_with_metrics(new_preset_data, headers)
        print(f"Extracted metrics for {len(assets_with_metrics)} assets from new preset")
        
    except Exception as e:
        print(f"Error fetching new preset: {e}")
        import traceback
        traceback.print_exc()
        assets_with_metrics = {}
    
    # Fetch security preset data for NAV/P&L
    print(f"\nFetching security preset data (ID: {SECURITY_PRESET_ID})...")
    try:
        security_data = client.get_evaluation_preset_legal_entity(
            preset_id=SECURITY_PRESET_ID,
            legal_entity_id=LEGAL_ENTITY_ID
        )
    except Exception as e:
        print(f"Error: Security preset file not found. Loading from disk...")
        security_file = DATA_DIR / f"security_{SECURITY_PRESET_ID}.json"
        if security_file.exists():
            with open(security_file, 'r') as f:
                security_data = json.load(f)
        else:
            print(f"Error: {security_file} not found!")
            return
    
    # Process all assets
    print("\nProcessing assets and calculating comprehensive metrics...")
    results = []
    
    def walk_security_lines(lines: List[Dict[str, Any]]):
        if not lines:
            return
        
        for line in lines:
            name = line.get("name")
            if name:
                # Extract NAV and P&L time series from security data
                values = line.get("values", [])
                nav_ts = None
                pnl_ts = None
                
                for idx, value in enumerate(values):
                    if isinstance(value, dict):
                        raw_value = value.get("rawValue")
                        if isinstance(raw_value, dict):
                            sample_key = next(iter(raw_value.keys())) if raw_value else None
                            if sample_key and 'T' in sample_key:
                                if idx == 3 or value.get("command") == "nav_history":
                                    nav_ts = raw_value
                                elif idx == 5 or value.get("command") == "pl_history":
                                    pnl_ts = raw_value
                
                if nav_ts:
                    # Find matching buy/sell data
                    transactions = None
                    for key, buy_sell_item in buy_sell_lookup.items():
                        if key[0] == name:
                            transactions = buy_sell_item.get("transactions")
                            break
                    
                    if transactions:
                        # Get metrics from new preset
                        asset_metrics = assets_with_metrics.get(name, {})
                        purchase_price = asset_metrics.get("purchase_price")
                        
                        # Calculate profit and prices
                        profit_data = calculate_profit_and_prices(name, transactions, nav_ts, purchase_price)
                        
                        # Calculate daily changes
                        daily_changes = calculate_daily_changes(nav_ts)
                        
                        # Combine all data
                        comprehensive_data = {
                            "asset": name,
                            "volatility": asset_metrics.get("volatility"),
                            "interest_rate": asset_metrics.get("interest_rate"),
                            "purchase_price": purchase_price,
                            "total_profit": profit_data.get("total_profit", 0.0),
                            "transactions_detail": profit_data.get("transactions_detail", []),
                            "daily_changes": daily_changes
                        }
                        
                        results.append(comprehensive_data)
            
            # Recursively process sublines
            sublines = line.get("subLines")
            if sublines:
                walk_security_lines(sublines)
    
    result_line = security_data.get("resultLine", {})
    walk_security_lines(result_line.get("subLines", []))
    
    print(f"Processed {len(results)} assets")
    
    # Save results
    print(f"\nSaving comprehensive analysis to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Done! Results saved to {OUTPUT_FILE}")
    
    # Print summary
    print(f"\nSummary:")
    print(f"  Total assets analyzed: {len(results)}")
    
    assets_with_volatility = sum(1 for r in results if r.get("volatility") is not None)
    assets_with_interest = sum(1 for r in results if r.get("interest_rate") is not None)
    assets_with_purchase_price = sum(1 for r in results if r.get("purchase_price") is not None)
    
    print(f"  Assets with volatility: {assets_with_volatility}")
    print(f"  Assets with interest rate: {assets_with_interest}")
    print(f"  Assets with purchase price: {assets_with_purchase_price}")
    
    total_profit = sum(r.get("total_profit", 0.0) for r in results)
    print(f"  Total profit (sum of all assets): {total_profit:,.2f}")
    
    # Show examples
    if results:
        print(f"\nFirst few assets with complete data:")
        for i, asset in enumerate(results[:5]):
            print(f"  {i+1}. {asset['asset']}")
            print(f"     Volatility: {asset.get('volatility')}")
            print(f"     Interest Rate: {asset.get('interest_rate')}")
            print(f"     Purchase Price: {asset.get('purchase_price')}")
            print(f"     Total Profit: {asset.get('total_profit', 0.0):,.2f}")
            if asset.get('transactions_detail'):
                trans = asset['transactions_detail'][0]
                print(f"     First Transaction - Buy: {trans.get('purchase_price')}, Sell: {trans.get('selling_price')}, Profit: {trans.get('profit', 0.0):,.2f}")


if __name__ == "__main__":
    main()
