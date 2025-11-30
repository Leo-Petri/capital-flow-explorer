import os
import time
import requests
import math
from datetime import datetime, timedelta, timezone
import pandas as pd


# =====================
# CONFIGURATION
# =====================

# Try to get API key from environment variable first, fallback to hardcoded key
# Note: For production, use environment variables instead of hardcoding the key

API_KEY = os.getenv("NEWS_API_KEY") or "130cde4e7b8442b1b1d6b5a850faae07"

BASE_URL = "https://newsapi.org/v2/everything"

START_DATE = datetime(2025, 1, 1)
END_DATE   = datetime(2025, 11, 29)

# ---- UPDATED TOPICS ----
TOPICS = {
    "fed_interest_rates": {
        "query": '"Federal Reserve" AND ("interest rates" OR "rate hike" OR "rate cut" OR "FOMC")'
    },

    # Main US & European stock indices
    "us_eu_stock_indices": {
        "query": '('
                 '"S&P 500" OR '
                 '"Dow Jones" OR '
                 '"STOXX Europe 600" OR '
    },

    "geopolitics_major_events": {
        "query": '('
                 'COVID-19 OR coronavirus OR pandemic OR '
                 '"Russia invades Ukraine" OR "Ukraine war" OR "war in Ukraine" OR '
                 '"invasion of Ukraine" OR '
                 '"Middle East conflict" OR "Gaza war" OR "Israel Hamas"'
                 ')'
    }
}

PAGE_SIZE = 100
REQUEST_SLEEP = 1.0
OUTPUT_CSV = "financial_news_2023_2024_us_eu_indices.csv"


# =====================
# HELPER FUNCTIONS
# =====================

def parse_timestamp(published_at_str: str):
    """
    Parse the published_at string into concrete timestamp fields.
    Returns a dict with multiple timestamp representations.
    """
    if not published_at_str:
        return {
            "published_at": None,
            "timestamp": None,
            "published_datetime": None,
            "published_date": None,
            "published_time": None,
            "published_year": None,
            "published_month": None,
            "published_day": None,
        }
    
    try:
        # Parse ISO 8601 format (e.g., "2024-01-15T10:30:00Z" or "2024-01-15T10:30:00+00:00")
        # Handle Z suffix (UTC) and timezone offsets
        dt_str = published_at_str.replace("Z", "+00:00")
        
        if "T" in dt_str:
            # Full datetime with time
            if "+" in dt_str or dt_str.endswith("00:00"):
                dt = datetime.fromisoformat(dt_str)
            else:
                # No timezone info, assume UTC
                dt = datetime.fromisoformat(dt_str).replace(tzinfo=timezone.utc)
        else:
            # Date only - assume midnight UTC
            dt = datetime.strptime(dt_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        
        # Ensure timezone-aware (convert to UTC if not already)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        
        return {
            "published_at": published_at_str,  # Original string
            "timestamp": int(dt.timestamp()),  # Unix timestamp (seconds since epoch)
            "published_datetime": dt.isoformat(),  # ISO 8601 format
            "published_date": dt.strftime("%Y-%m-%d"),  # Date only
            "published_time": dt.strftime("%H:%M:%S"),  # Time only
            "published_year": dt.year,
            "published_month": dt.month,
            "published_day": dt.day,
        }
    except (ValueError, AttributeError) as e:
        print(f"[WARN] Failed to parse timestamp '{published_at_str}': {e}")
        return {
            "published_at": published_at_str,
            "timestamp": None,
            "published_datetime": None,
            "published_date": None,
            "published_time": None,
            "published_year": None,
            "published_month": None,
            "published_day": None,
        }


def month_ranges(start: datetime, end: datetime):
    current = datetime(start.year, start.month, 1)
    while current <= end:
        if current.month == 12:
            next_month = datetime(current.year + 1, 1, 1)
        else:
            next_month = datetime(current.year, current.month + 1, 1)

        chunk_from = max(current, start)
        chunk_to = min(next_month - timedelta(days=1), end)
        yield chunk_from, chunk_to
        current = next_month


def fetch_news_chunk(query: str, from_dt: datetime, to_dt: datetime, topic_key: str):
    articles_all = []
    page = 1

    while True:
        params = {
            "apiKey": API_KEY,
            "q": query,
            "from": from_dt.strftime("%Y-%m-%d"),
            "to": to_dt.strftime("%Y-%m-%d"),
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": PAGE_SIZE,
            "page": page,
        }

        resp = requests.get(BASE_URL, params=params)
        if resp.status_code != 200:
            print(f"[ERROR] {resp.status_code} for topic={topic_key}, "
                  f"{from_dt.date()}..{to_dt.date()}, page {page}")
            print(resp.text)
            break

        data = resp.json()
        raw_articles = data.get("articles", [])
        total_results = data.get("totalResults", 0)

        if not raw_articles:
            break

        for art in raw_articles:
            published_at_raw = art.get("publishedAt")
            timestamp_data = parse_timestamp(published_at_raw)
            
            # Combine title and description for the "new" (news text) field
            title = art.get("title") or ""
            description = art.get("description") or ""
            # Use title, or title + description if both exist
            news_text = title
            if description and description != title:
                news_text = f"{title}. {description}" if title else description
            
            # Clean up the news text (remove extra whitespace, newlines)
            news_text = " ".join(news_text.split())
            
            source_name = (art.get("source") or {}).get("name") or "Unknown"
            url = art.get("url") or ""
            
            # Use published_datetime (ISO format with date and time) as timestamp
            # Format: YYYY-MM-DD HH:MM:SS for better readability
            timestamp_str = timestamp_data.get("published_datetime")
            if timestamp_str:
                # Convert ISO format to readable date-time format
                try:
                    # Handle various ISO formats
                    dt_str_clean = timestamp_str.replace("Z", "+00:00")
                    # Remove timezone info for formatting (we already converted to UTC)
                    if "+" in dt_str_clean or dt_str_clean.endswith("-00:00"):
                        dt = datetime.fromisoformat(dt_str_clean)
                        # Convert to UTC if timezone-aware
                        if dt.tzinfo:
                            dt = dt.astimezone(timezone.utc)
                        else:
                            dt = dt.replace(tzinfo=timezone.utc)
                    else:
                        dt = datetime.fromisoformat(dt_str_clean).replace(tzinfo=timezone.utc)
                    # Format as YYYY-MM-DD HH:MM:SS (remove timezone info for display)
                    timestamp = dt.replace(tzinfo=None).strftime("%Y-%m-%d %H:%M:%S")
                except (ValueError, AttributeError) as e:
                    print(f"[WARN] Failed to format timestamp '{timestamp_str}': {e}")
                    # Fallback: try to extract date and time from original published_at
                    if published_at_raw:
                        try:
                            # Try parsing the original string directly
                            dt_orig = datetime.fromisoformat(published_at_raw.replace("Z", "+00:00"))
                            if dt_orig.tzinfo:
                                dt_orig = dt_orig.astimezone(timezone.utc)
                            timestamp = dt_orig.replace(tzinfo=None).strftime("%Y-%m-%d %H:%M:%S")
                        except:
                            # Last resort: use the date part only
                            timestamp = timestamp_data.get("published_date", published_at_raw[:10] if published_at_raw else None)
                    else:
                        timestamp = None
            else:
                # Fallback to published_date if datetime is not available
                timestamp = timestamp_data.get("published_date")
                if timestamp:
                    timestamp = f"{timestamp} 00:00:00"  # Add default time
            
            # Store columns: timestamp (date-time), new, source, link
            article_data = {
                "timestamp": timestamp,
                "new": news_text,
                "source": source_name,
                "link": url,
            }
            
            articles_all.append(article_data)

        max_pages = math.ceil(total_results / PAGE_SIZE) if total_results else 1
        print(f"[INFO] topic={topic_key}, {from_dt.date()}..{to_dt.date()}, "
              f"page {page}/{max_pages}, got {len(raw_articles)} articles")

        if page >= max_pages:
            break

        page += 1
        time.sleep(REQUEST_SLEEP)

    return articles_all


def scrape_all_topics():
    all_records = []

    for topic_key, cfg in TOPICS.items():
        query = cfg["query"]

        for chunk_from, chunk_to in month_ranges(START_DATE, END_DATE):
            print(f"[TOPIC {topic_key}] {chunk_from.date()} .. {chunk_to.date()}")
            chunk_articles = fetch_news_chunk(query, chunk_from, chunk_to, topic_key)
            all_records.extend(chunk_articles)

    if not all_records:
        print("[WARN] No articles collected.")
        return pd.DataFrame()

    if not all_records:
        print("[WARN] No articles collected.")
        return pd.DataFrame(columns=["timestamp", "new", "source", "link"])
    
    try:
        df = pd.DataFrame(all_records)
        
        # Check if required columns exist
        required_cols = ["timestamp", "new", "source", "link"]
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            print(f"[ERROR] Missing required columns: {missing_cols}")
            print(f"[INFO] Available columns: {df.columns.tolist()}")
            return pd.DataFrame(columns=required_cols)
        
        # Remove duplicates based on news text and source
        df.drop_duplicates(subset=["new", "source"], inplace=True)
        
        # Remove rows with missing timestamps
        initial_count = len(df)
        df = df.dropna(subset=["timestamp"])
        removed_count = initial_count - len(df)
        if removed_count > 0:
            print(f"[INFO] Removed {removed_count} rows with missing timestamps")
        
        # Sort by timestamp (date-time string) for chronological ordering
        df = df.sort_values(by="timestamp", na_position="last")
        
        # Ensure columns are in the correct order: timestamp, new, source, link
        df = df[required_cols]
        
        return df
    except Exception as e:
        print(f"[ERROR] Failed to process DataFrame: {e}")
        import traceback
        traceback.print_exc()
        return pd.DataFrame(columns=["timestamp", "new", "source", "link"])


if __name__ == "__main__":
    try:
        df_news = scrape_all_topics()
        if not df_news.empty:
            df_news.to_csv(OUTPUT_CSV, index=False)
            print(f"[DONE] Saved {len(df_news)} articles to {OUTPUT_CSV}")
        else:
            print("[DONE] No data to save.")
    except Exception as e:
        print(f"[ERROR] Script failed: {e}")
        import traceback
        traceback.print_exc()
        raise