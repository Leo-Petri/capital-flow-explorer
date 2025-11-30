# Oscilla
**Team Name: Maybe AI can solve this**

See how your money moves. Oscilla shows where your portfolio's money flows across different risk groups over time. Connect the dots between market news, interest rates, and your investments in one clear view.

---

## 0. Quick start

First, install and start the frontend app:

```sh
npm install
npm run dev
```

Open your browser and explore your capital flows.

---

For working with the data pipeline (Python sandbox):

1. (Recommended) Create a virtual environment and install all dependencies:

   ```shgit c
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r python_sandbox/requirements.txt
   ```

2. Run the Python data preparation scripts:

   ```sh
   python python_sandbox/data/access.py
   python python_sandbox/data/analyze_asset_buys_sells.py
   python python_sandbox/data/comprehensive_asset_analysis.py
   ```

The Python scripts are provided in a sandbox folder so you can easily explore and modify/extend the data pipeline as you wish.

---
## 1. Insight Discovery

<div align="center" style="width:100%; margin: 20px 0;">
  <img src="logos_readme/UI/mother.png" alt="Mother UI Concept" style="max-width:100%; height:auto; min-height:260px; min-width:350px; display:block; margin:0 auto; border-radius:16px; box-shadow:0 8px 36px 0 rgba(0,0,0,0.12);"/>
</div>

Our insight discovery is primarly focused on (one important variable in finance/economics), **the interest rate** and the idea of **grouping stocks** into **bundles of similar "risk"**. The main insight for the user of Oscilla is to understand his exposure across risk bundles of assets specially with respect to changes in interest rate levels and other **financial news** (e.g. Trump Tariffs, Tech. & Big Indexes).

<div align="center" style="width:100%; margin: 20px 0;">
  <img src="logos_readme/UI/insight.png" alt="Insight Discovery" style="max-width:100%; height:auto; min-height:260px; min-width:350px; display:block; margin:0 auto; border-radius:16px; box-shadow:0 8px 36px 0 rgba(0,0,0,0.12);"/>
</div>

---

## 2. Technical Execution

Built with **React** and **TypeScript** for a fast, responsive experience—even with lots of data. We stand out by going beyond standard dashboards: a **Python-based structure** that collects, manipulates, and analyzes all portfolio and news data, using **real NLP models** (from Hugging Face) to classify news by sentiment, importance, and topic. Our python scripts connect to APIs, scrappes websites, and make very simple insights. Everything is set up so you can tweak, extend, or swap data sources without headaches—future-proof by design. Most importantly everything built with **open-source** tools.

| <div style="text-align:center">Frontend<br/><span style="font-size:13px; font-weight:normal; color:#888;">(UI/UX)</span></div> | <div style="text-align:center">Data Processing &amp; AI<br/><span style="font-size:13px; font-weight:normal; color:#888;">(Automation &amp; Analytics)</span></div> | <div style="text-align:center">Deployment<br/><span style="font-size:13px; font-weight:normal; color:#888;">(Cloud Hosting)</span></div> | <div style="text-align:center">Sponsors<br/><span style="font-size:13px; font-weight:normal; color:#888;">(Support)</span></div> |
|:---:|:---:|:---:|:---:|
| <img src="logos_readme/ts_react.png" alt="TypeScript React" style="width:68px; height:68px; object-fit:contain;"/> | <img src="logos_readme/python.png" alt="Python" style="width:60px; height:60px; object-fit:contain;"/><br/><img src="logos_readme/hflogo.png" alt="Hugging Face" style="width:60px; height:60px; object-fit:contain;"/> | <img src="logos_readme/vercel.png" alt="Vercel" style="width:68px; height:68px; object-fit:contain;"/> | <img src="logos_readme/aws.png" alt="AWS" style="width:60px; height:32px; object-fit:contain; margin:2px 0;"/><br/><img src="logos_readme/lovable.png" alt="Loveable" style="width:60px; height:32px; object-fit:contain; margin:2px 0;"/><br/><img src="logos_readme/openai.png" alt="OpenAI" style="width:60px; height:32px; object-fit:contain; margin:2px 0;"/> |

## 3. Visualization & Communication

**The River Chart** - Watch money flow across risk bands like a river over time. Interactive controls let you play through history, filter by asset type, and select different metrics.

**News Overlay** - Financial news appears as colored dots on the timeline. Green for good news, red for bad, gray for neutral. Click any dot to read the full story.

**Fed Rates** - Toggle interest rates on the chart to spot connections between policy changes and your investments.

**Inspector Panel** - Click any risk band to see individual assets, their performance, and transaction history.

---

## 4. Data Integration

We utilized four main data sources, three of which are fully independent from our primary challenger dataset provider, Qplix. From Qplix, we primarily extracted _time series_ data, which shaped our decision to emphasize patterns and historical context tied to shifts over time, "volatility bands / groups" and market dynamics (e.g. special events). Our analysis therefore focused on two key domains:

1. Interest rates (sourced directly from Qplix)
2. Financial news coverage (spanning geopolitics, major financial products such as tech stocks and major indexes, and other market events (interest rates))

A detailed breakdown of these data sources follows below:

### 4.1 Data Sources

| Data Category                                 | Source                                                                                                                                | Raw File(s)                                                       | Key Attributes & Datatypes                                                                                                                                         |
|-----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Portfolio, Transactions & Interest Rates**  | <img src="logos_readme/qplix.png" alt="Qplix API" height="24"/><br/>[Qplix API](https://qplix.com)                                   | (via API access)                                                  | **TimeSeries:**<br/>- `date` (`datetime`)<br/>- `nav`, `twr`, `irr`, `interest_rate`, ... (float)                                   |
| **Financial News**<br/>(Geopolitics, Indices) | <img src="logos_readme/newsapi.png" alt="NewsAPI.org" height="24"/> [NewsAPI.org](https://newsapi.org)                               | `input_*.csv`, `output_*.csv`                                      | - `timestamp` (`datetime`)<br/>- `new` (`string`)<br/>- `source` (`string`)<br/>- `link` (`string`)        |
| **US (Trump) Tariff Timeline**                | <img src="logos_readme/jdsupra.png" alt="JD Supra" height="24"/> [JD Supra](https://www.jdsupra.com/legalnews/trump-tariff-tracker-october-31-9019759/) | `output_trump_tariffs.csv`                                         | - `implemented_date` (`date`)<br/>- `event_description` (`string`)<br/>|
| **(Some) Market Data<br/>(on famous Assets)** | <img src="logos_readme/yfinance.png" alt="Yahoo Finance" height="36"/><br/>[Yahoo Finance](https://finance.yahoo.com/)              | `fed_rates_2023_2025.csv`,<br/>`yfinance_raw_daily.csv`,<br/>`indices_ohlc_2023_2025.csv` | - `timestamp` (`datetime`)<br/>- `new` (`string`)<br/>- `link` (`string`)                                |

### 4.2 Data Enrichment with Hugging Face <img src="logos_readme/hflogo.png" alt="Hugging Face" height="32"/>

Our raw news dataset was intentionally minimal, typically containing just:

| timestamp (datetime); new (text); source/link (string) |

To transform this sparse data into meaningful signals, we leveraged advanced _Natural Language Processing_ models from Hugging Face <img src="logos_readme/hflogo.png" alt="Hugging Face" height="18"/>. Each news entry was automatically analyzed and enriched with three new interpretive labels, adding vital context and analytic depth:

1. **Sentiment** — ["Positive", "Neutral", "Negative"]
2. **Importance** — ["Low", "Medium", "High"]
3. **Topic** — ["Financial Assets", "Macro", "Geopolitical"]

For this classification, we used the [facebook/bart-large-mnli](https://huggingface.co/facebook/bart-large-mnli) model via Hugging Face's _zero-shot-classification pipeline_. This approach enabled us to accurately assess and categorize news headlines without requiring custom model training, ensuring that our analytics reflect the nuance and impact of real-world events.

---
