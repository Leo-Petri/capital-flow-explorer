import pandas as pd
import os
import glob
from transformers import pipeline

SENTIMENT_LABELS = ["Positive", "Neutral", "Negative"]
IMPORTANCE_LABELS = ["Low", "Medium", "High"]
TOPIC_LABELS = ["Financial Assets", "Macro", "Geopolitical"]

def classify_sentiment(text, classifier):
    candidate_labels = SENTIMENT_LABELS
    result = classifier(text, candidate_labels)
    idx = result['scores'].index(max(result['scores']))
    return {'label': result['labels'][idx], 'score': result['scores'][idx]}

def classify_importance(text, classifier):
    candidate_labels = IMPORTANCE_LABELS
    result = classifier(text, candidate_labels)
    idx = result['scores'].index(max(result['scores']))
    return {'label': result['labels'][idx], 'score': result['scores'][idx]}

def classify_topic(text, classifier):
    candidate_labels = TOPIC_LABELS
    result = classifier(text, candidate_labels)
    idx = result['scores'].index(max(result['scores']))
    return {'label': result['labels'][idx], 'score': result['scores'][idx]}

def detect_text_column(df):
    if 'new' in df.columns:
        return 'new'
    preferred_columns = ['title', 'description', 'text', 'content', 'headline']
    for col in preferred_columns:
        if col in df.columns:
            return col
    exclude_cols = ['date', 'timestamp', 'link', 'source', 'url', 'id', 'index']
    for col in df.columns:
        if col.lower() not in exclude_cols and df[col].dtype == 'object':
            return col
    raise ValueError(f"Could not find a suitable text column. Available columns: {list(df.columns)}")

def analyze_news_sentiment(csv_path, text_column=None, output_path=None):
    df = pd.read_csv(csv_path)
    if text_column is None:
        if 'new' in df.columns:
            text_column = 'new'
        else:
            text_column = detect_text_column(df)
    if text_column not in df.columns:
        raise ValueError(f"Column '{text_column}' not found in CSV. Available columns: {list(df.columns)}")
    classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    sentiment_results = [classify_sentiment(str(row[text_column]), classifier) for _, row in df.iterrows()]
    importance_results = [classify_importance(str(row[text_column]), classifier) for _, row in df.iterrows()]
    topic_results = [classify_topic(str(row[text_column]), classifier) for _, row in df.iterrows()]
    df['sentiment'] = [r['label'] for r in sentiment_results]
    df['sentiment_score'] = [r['score'] for r in sentiment_results]
    df['importance'] = [r['label'] for r in importance_results]
    df['importance_score'] = [r['score'] for r in importance_results]
    df['topic'] = [r['label'] for r in topic_results]
    df['topic_score'] = [r['score'] for r in topic_results]
    if not output_path:
        base_name = os.path.basename(csv_path)
        dir_name = os.path.dirname(csv_path)
        if base_name.startswith('input_'):
            if base_name == 'input_tech_news_2025.csv':
                output_filename = 'output_financial_news_2025.csv'
            else:
                output_filename = base_name.replace('input_', 'output_', 1)
            output_path = os.path.join(dir_name, output_filename)
        else:
            output_filename = base_name.replace('.csv', '_with_sentiment.csv')
            output_path = os.path.join(dir_name, output_filename)
    df.to_csv(output_path, index=False)
    return df

def find_input_csv_files(directory='.'):
    pattern = os.path.join(directory, 'input_*.csv')
    return sorted(glob.glob(pattern))

if __name__ == "__main__":
    import sys
    script_dir = os.path.dirname(os.path.abspath(__file__))
    script_dir_inputs = find_input_csv_files(script_dir)
    cwd_inputs = find_input_csv_files('.')
    if script_dir_inputs:
        input_files = script_dir_inputs
    elif cwd_inputs:
        input_files = cwd_inputs
    else:
        input_files = []
    if not input_files:
        sys.exit(1)
    all_results = []
    for csv_file in input_files:
        try:
            results_df = analyze_news_sentiment(csv_file)
            all_results.append(results_df)
        except Exception:
            continue