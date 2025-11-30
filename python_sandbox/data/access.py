import json
from pathlib import Path
from qplix_api_client import QplixAPIClient

# Configuration from API_Access_Examples.py
url = "https://smd43.qplix.com"
F5Bearer = "m3brPHW19chc7Vr4Pd5LBaTmBQOLoIknjlW3pfG7UMzlaSJo22yXdJsKysorKCY5"
QUserUsername = "qplix@qplix.com"
QUserPassword = "Power4All"

# Preset IDs from API_Access_Examples.py
PRESET_IDS = {
    # "performance": "691dd7473022610895c23ad9",
    # "classification": "691dd5953022610895c1aeff",
    "security": "691dd48d3022610895c102ea",
    # "common_property": "692b22447b0feeedcebd07bc",
    "volatility": "692b51eb7b0feeedced7dd5a"
}
LEGAL_ENTITY_ID = "5cb71a8b2c94de98b02aff19"

# Output directory
DATA_DIR = Path("python_sandbox/data/data")


def extract_common_property_data(payload: dict) -> list:
    """
    Extract common_property metric from evaluation preset response.
    """
    rows = []
    headers = payload.get("headers", [])
    
    # Find indices for common_property
    common_property_indices = []
    
    for i, header in enumerate(headers):
        if isinstance(header, dict):
            cmd = header.get("command", "")
            name = header.get("name", "")
        else:
            cmd = str(header)
            name = str(header)
        
        if cmd == "common_property" or name == "Common Property" or "common_property" in cmd.lower() or "common property" in name.lower():
            common_property_indices.append(i)
    
    def get_cell_value(cell):
        """Extract value from a cell (can be dict or primitive)"""
        if isinstance(cell, dict):
            return cell.get("rawValue") if cell.get("rawValue") is not None else cell.get("value")
        return cell
    
    def walk_lines(lines):
        """Recursively walk through result lines and sublines"""
        if not lines:
            return
        
        for line in lines:
            name = line.get("name")
            values = line.get("values", [])
            
            if name and isinstance(values, list):
                common_property = None
                
                # Extract common_property
                for idx in common_property_indices:
                    if idx < len(values):
                        common_property = get_cell_value(values[idx])
                        break
                
                # Add row if common_property is present
                if common_property is not None:
                    rows.append({
                        "asset": name,
                        "common_property": common_property
                    })
            
            # Recursively process sublines
            sublines = line.get("subLines")
            if sublines:
                walk_lines(sublines)
    
    # Start walking from resultLine subLines
    result_line = payload.get("resultLine", {})
    walk_lines(result_line.get("subLines", []))
    
    return rows


def main():
    """Main function to fetch and extract data"""
    # Create data directory if it doesn't exist
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
    
    # Collect extracted common_property data
    common_property_data = []
    
    # Process each preset
    for preset_name, preset_id in PRESET_IDS.items():
        print(f"\nFetching data from {preset_name} preset (ID: {preset_id})...")
        try:
            # Get evaluation preset data
            result = client.get_evaluation_preset_legal_entity(
                preset_id=preset_id,
                legal_entity_id=LEGAL_ENTITY_ID
            )
            
            # Save full response to data folder
            output_file = DATA_DIR / f"{preset_name}_{preset_id}.json"
            print(f"  Saving full response to {output_file}...")
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"  Saved {output_file}")
            
            # Extract common_property if this is the common_property preset
            if preset_name == "common_property":
                print(f"  Extracting common_property metric...")
                extracted = extract_common_property_data(result)
                if extracted:
                    print(f"  Found {len(extracted)} records with common_property")
                    common_property_data.extend(extracted)
                else:
                    print(f"  No common_property found in this preset")
                
        except Exception as e:
            print(f"  Error fetching {preset_name} preset: {e}")
            import traceback
            traceback.print_exc()
    
    # Save extracted common_property data if any
    if common_property_data:
        common_property_file = DATA_DIR / "common_property_extracted.json"
        print(f"\nWriting {len(common_property_data)} common_property records to {common_property_file}...")
        with open(common_property_file, 'w') as f:
            json.dump(common_property_data, f, indent=2)
        print(f"Done! Common property data saved to {common_property_file}")
    
    # Print summary
    print(f"\nSummary:")
    print(f"  Total presets processed: {len(PRESET_IDS)}")
    print(f"  Data files saved to: {DATA_DIR.absolute()}")
    if common_property_data:
        print(f"  Common property records extracted: {len(common_property_data)}")
        print(f"\nFirst few common_property records:")
        for i, record in enumerate(common_property_data[:5]):
            print(f"  {i+1}. {record}")


if __name__ == "__main__":
    main()
