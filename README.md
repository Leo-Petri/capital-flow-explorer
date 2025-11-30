# Capital Flow Explorer

See how your money moves. Capital Flow Explorer shows where your portfolio's money flows across different risk levels over time. Connect the dots between market news, interest rates, and your investments in one clear view.

## 0. Quick start

First, run the Python data preparation scripts:

```sh
python python_sandbox/data/access.py
python python_sandbox/data/analyze_asset_buys_sells.py
python python_sandbox/data/comprehensive_asset_analysis.py
```

Then install and start the frontend:

```sh
npm install
npm run dev
```

Open your browser and explore your capital flows.

## 1. Insight Discovery

**See patterns others miss.** Watch how your portfolio shifts between safe and risky investments as markets change. Assets are grouped into five risk bands (from safe to very risky), revealing how money moves across risk levels over time.

**Connect events to outcomes.** News signals appear on the timeline, showing when market events happened. See how Fed rate changes, news sentiment, and market conditions line up with portfolio movements.

**Understand the why.** Drill into any risk band to see which assets drove performance, when you bought or sold them, and how they contributed to overall returns.

---

## 2. Technical Execution

Built with **React** and **TypeScript** for a fast, responsive experience—even with lots of data. We stand out by going beyond standard dashboards: a **Python-based structure** that collects, manipulates, and analyzes all portfolio and news data, using **real NLP models** (from Hugging Face) to classify news by sentiment, importance, and topic. Our python scripts connect to APIs, scrappes websites, and make very simple insights. Everything is set up so you can tweak, extend, or swap data sources without headaches—future-proof by design. Most importantly everything built with **open-source** tools.

|  <div style="text-align:center">Frontend<br/><span style="font-size:13px; font-weight:normal; color:#888;">(UI/UX)</span></div>  |                                    <div style="text-align:center">Data Processing &amp; AI<br/><span style="font-size:13px; font-weight:normal; color:#888;">(Automation &amp; Analytics)</span></div>                                     | <div style="text-align:center">Deployment<br/><span style="font-size:13px; font-weight:normal; color:#888;">(Cloud Hosting)</span></div> |
| :------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------: |
| <img src="logos_readme/ts_react.png" alt="TypeScript React" style="width:68px; height:68px; object-fit:contain; margin:4px 0;"/> | <img src="logos_readme/python.png" alt="Python" style="width:68px; height:68px; object-fit:contain; margin-bottom:4px;"/><br/><img src="logos_readme/hflogo.png" alt="Hugging Face" style="width:68px; height:68px; object-fit:contain;"/> |           <img src="logos_readme/vercel.png" alt="Vercel" style="width:68px; height:68px; object-fit:contain; margin:4px 0;"/>           |

---

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

| Data Category                                | Source                                                                                                                                                  | Raw File(s)                                                                       | Key Attributes                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Portfolio, Transactions & Interest Rates** | <img src="logos_readme/qplix.png" alt="Qplix API" height="24"/><br/>[Qplix API](https://qplix.com)                                                      | (via API access)                                                                  | Date, Asset, Transaction (Buy/Sell), Amount, Currency, Legal Entity, Interest Rate      |
| **Financial News** (Geopolitics, Indices)    | <img src="logos_readme/newsapi.png" alt="NewsAPI.org" height="24"/> [NewsAPI.org](https://newsapi.org)                                                  | `input_*.csv`, `output_*.csv`                                                     | Date, Title, Source, Text, Ticker/Topic                                                 |
| **US (Trump) Tariff Timeline**               | <img src="logos_readme/jdsupra.png" alt="JD Supra" height="24"/> [JD Supra](https://www.jdsupra.com/legalnews/trump-tariff-tracker-october-31-9019759/) | `output_trump_tariffs.csv`                                                        | Date, Event Description, Sentiment, Topic, Importance                                   |
| **(Some) Market Data (on famous Assets)**    | <img src="logos_readme/yfinance.png" alt="Yahoo Finance" height="36"/><br/>[Yahoo Finance](https://finance.yahoo.com/)                                  | `fed_rates_2023_2025.csv`, `yfinance_raw_daily.csv`, `indices_ohlc_2023_2025.csv` | Date, Rate, Event, Description, Symbol, Open, Close, Volume, Index Name, Sector, Region |

### 4.2 Data Enrichment with Hugging Face <img src="logos_readme/hflogo.png" alt="Hugging Face" height="32"/>

Our raw news dataset was intentionally minimal, typically containing just:

| timestamp (datetime); new (text); source/link (string) |

To transform this sparse data into meaningful signals, we leveraged advanced _Natural Language Processing_ models from Hugging Face <img src="logos_readme/hflogo.png" alt="Hugging Face" height="18"/>. Each news entry was automatically analyzed and enriched with three new interpretive labels, adding vital context and analytic depth:

1. **Sentiment** — ["Positive", "Neutral", "Negative"]
2. **Importance** — ["Low", "Medium", "High"]
3. **Topic** — ["Financial Assets", "Macro", "Geopolitical"]

For this classification, we used the [facebook/bart-large-mnli](https://huggingface.co/facebook/bart-large-mnli) model via Hugging Face's _zero-shot-classification pipeline_. This approach enabled us to accurately assess and categorize news headlines without requiring custom model training, ensuring that our analytics reflect the nuance and impact of real-world events.

---
