import requests
import pandas as pd
from bs4 import BeautifulSoup
import re
from datetime import datetime

URL = "https://www.jdsupra.com/legalnews/trump-tariff-tracker-october-31-9019759/"
OUTPUT_CSV = "input_trump_tariffs.csv"


def extract_implemented_date(status_text):
    """Extract implemented date from status text. First tries 'Implemented' followed by date, then any date."""
    if not status_text:
        return None
    
    # First priority: Look for "Implemented" followed by a date pattern
    # Patterns: "Implemented 4/2/2025", "Implemented: 4/2/2025", etc.
    implemented_patterns = [
        r'Implemented[:\s]+(\d{1,2}/\d{1,2}/\d{4})',  # "Implemented 4/2/2025" or "Implemented: 4/2/2025"
        r'Implemented[:\s]+(\d{4}-\d{2}-\d{2})',      # "Implemented 2025-04-02"
    ]
    
    for pattern in implemented_patterns:
        match = re.search(pattern, status_text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            try:
                if '/' in date_str:
                    date_obj = datetime.strptime(date_str, "%m/%d/%Y")
                else:
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                return date_obj.strftime("%Y-%m-%d")
            except ValueError:
                continue
    
    # Second priority: Look for dates in parentheses like "(effective 11/1/2025)"
    effective_patterns = [
        r'\(effective\s+(\d{1,2}/\d{1,2}/\d{4})\)',  # "(effective 11/1/2025)"
        r'\(effective\s+(\d{4}-\d{2}-\d{2})\)',      # "(effective 2025-11-01)"
    ]
    
    for pattern in effective_patterns:
        match = re.search(pattern, status_text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            try:
                if '/' in date_str:
                    date_obj = datetime.strptime(date_str, "%m/%d/%Y")
                else:
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                return date_obj.strftime("%Y-%m-%d")
            except ValueError:
                continue
    
    # Third priority: Look for any date pattern in the text (MM/DD/YYYY or YYYY-MM-DD)
    # This will catch dates that appear anywhere in the status text
    general_date_patterns = [
        r'(\d{1,2}/\d{1,2}/\d{4})',  # MM/DD/YYYY or M/D/YYYY
        r'(\d{4}-\d{2}-\d{2})',      # YYYY-MM-DD
    ]
    
    for pattern in general_date_patterns:
        match = re.search(pattern, status_text)
        if match:
            date_str = match.group(1)
            try:
                if '/' in date_str:
                    date_obj = datetime.strptime(date_str, "%m/%d/%Y")
                else:
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                return date_obj.strftime("%Y-%m-%d")
            except ValueError:
                continue
    
    return None


def scrape_tariff_table():
    """Scrape the tariff table from the JD Supra website."""
    print(f"Fetching data from {URL}...")
    
    # Set headers to mimic a browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(URL, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching webpage: {e}")
        return pd.DataFrame()
    
    # Parse HTML
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find the table - it should be in a figure.table or similar structure
    table = soup.find('table')
    
    if not table:
        print("Could not find table in HTML")
        return pd.DataFrame()
    
    # Extract table rows
    rows = []
    tbody = table.find('tbody')
    if tbody:
        tr_elements = tbody.find_all('tr')
    else:
        tr_elements = table.find_all('tr')
    
    for tr in tr_elements:
        cells = tr.find_all(['td', 'th'])
        if len(cells) >= 3:
            # Column 1: Region/Country (e.g., "Global", "China")
            # Column 2: Tariff description (middle column) - this is what we want for "new"
            tariff_description = cells[1].get_text(strip=True)
            
            # Column 3: Status (contains "Implemented: Date")
            status_text = cells[2].get_text(strip=True)
            
            # Extract implemented date from status column
            implemented_date = extract_implemented_date(status_text)
            
            # Only include rows that have a tariff description
            if tariff_description:
                rows.append({
                    'new': tariff_description,
                    'implemented_date': implemented_date
                })
    
    if not rows:
        print("No data extracted from table")
        return pd.DataFrame(columns=['new', 'implemented_date'])
    
    df = pd.DataFrame(rows)
    return df


if __name__ == "__main__":
    try:
        df = scrape_tariff_table()
        if not df.empty:
            df.to_csv(OUTPUT_CSV, index=False)
            print(f"[DONE] Saved {len(df)} tariff records to {OUTPUT_CSV}")
            print(f"\nFirst few rows:")
            print(df.head())
        else:
            print("[WARNING] No data to save.")
    except Exception as e:
        print(f"[ERROR] Script failed: {e}")
        import traceback
        traceback.print_exc()
        raise

