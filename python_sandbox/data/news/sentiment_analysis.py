import pandas as pd
import os
import glob
from transformers import pipeline

def classify_sentiment(text, classifier, neutral_threshold=0.7):
    result = classifier(text)[0]
    label, score = result['label'], result['score']
    
    if score < neutral_threshold:
        neutral_score = 1.0 - abs(score - 0.5) * 2
        return {'label': 'NEUTRAL', 'score': neutral_score}
    return {'label': label, 'score': score}

def detect_text_column(df):
    """Auto-detect the text column to use for sentiment analysis."""
    # Priority order: title > new > description > first text-like column
    preferred_columns = ['title', 'new', 'description', 'text', 'content', 'headline']
    
    for col in preferred_columns:
        if col in df.columns:
            return col
    
    # If no preferred column found, look for columns that might contain text
    # (exclude common non-text columns)
    exclude_cols = ['date', 'timestamp', 'link', 'source', 'url', 'id', 'index']
    for col in df.columns:
        if col.lower() not in exclude_cols:
            # Check if column contains string data
            if df[col].dtype == 'object':
                return col
    
    raise ValueError(f"Could not find a suitable text column. Available columns: {list(df.columns)}")

def analyze_news_sentiment(csv_path, text_column=None, output_path=None):
    print(f"\n{'='*60}")
    print(f"Processing: {csv_path}")
    print(f"{'='*60}")
    
    df = pd.read_csv(csv_path)
    
    # Auto-detect text column if not provided
    if text_column is None:
        text_column = detect_text_column(df)
        print(f"Auto-detected text column: '{text_column}'")
    
    if text_column not in df.columns:
        raise ValueError(f"Column '{text_column}' not found in CSV. Available columns: {list(df.columns)}")
    
    print("Initializing sentiment analysis model...")
    classifier = pipeline("sentiment-analysis")
    
    print(f"Analyzing sentiment for {len(df)} news articles using column '{text_column}'...")
    results = [classify_sentiment(str(row[text_column]), classifier) for _, row in df.iterrows()]
    
    df['sentiment'] = [r['label'] for r in results]
    df['sentiment_score'] = [r['score'] for r in results]
    
    print("\n" + "="*50)
    print("Sentiment Analysis Summary")
    print("="*50)
    print(f"Total articles analyzed: {len(df)}")
    print("\nSentiment distribution:")
    for sentiment, count in df['sentiment'].value_counts().items():
        print(f"  {sentiment}: {count} ({(count/len(df)*100):.1f}%)")
    
    if not output_path:
        # Generate output filename: input_xxx.csv -> output_xxx.csv
        if csv_path.startswith('input_'):
            output_path = csv_path.replace('input_', 'output_', 1)
        else:
            output_path = csv_path.replace('.csv', '_with_sentiment.csv')
    
    df.to_csv(output_path, index=False)
    print(f"\n✅ Results saved to {output_path}")
    
    return df

def find_input_csv_files(directory='.'):
    """Find all CSV files matching input_*.csv pattern."""
    pattern = os.path.join(directory, 'input_*.csv')
    files = glob.glob(pattern)
    return sorted(files)

if __name__ == "__main__":
    import sys
    
    # Determine directory (default to script's directory)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check if input files are in script directory, otherwise use current working directory
    script_dir_inputs = find_input_csv_files(script_dir)
    cwd_inputs = find_input_csv_files('.')
    
    if script_dir_inputs:
        work_dir = script_dir
        input_files = script_dir_inputs
    elif cwd_inputs:
        work_dir = '.'
        input_files = cwd_inputs
    else:
        # Try script directory as fallback
        work_dir = script_dir
        input_files = []
    
    if not input_files:
        print("❌ No input_*.csv files found!")
        print(f"   Searched in: {os.path.abspath(work_dir)}")
        sys.exit(1)
    
    print(f"📁 Found {len(input_files)} input file(s):")
    for f in input_files:
        print(f"   - {f}")
    
    # Process each file
    all_results = []
    for csv_file in input_files:
        try:
            results_df = analyze_news_sentiment(csv_file)
            all_results.append(results_df)
            
            # Show sample results
            print("\n" + "="*50)
            print("Sample Results (first 5 articles):")
            print("="*50)
            # Determine which columns to display
            date_col = 'timestamp' if 'timestamp' in results_df.columns else 'date'
            text_col = detect_text_column(results_df)
            display_cols = [date_col, text_col, 'sentiment', 'sentiment_score']
            available_cols = [col for col in display_cols if col in results_df.columns]
            print(results_df[available_cols].head(5).to_string(index=False))
            
        except Exception as e:
            print(f"\n❌ Error processing {csv_file}: {e}")
            continue
    
    print(f"\n{'='*60}")
    print(f"✅ Completed processing {len(all_results)} file(s)")
    print(f"{'='*60}")