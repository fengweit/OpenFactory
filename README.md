# OpenFactory

AI Investment Intelligence Platform — detects emerging investment themes from news and filings, validates conviction through a swarm of AI agents, and executes trades automatically.

## What It Does

- **Theme Detection**: Monitors news + SEC filings → extracts investment themes using LLMs
- **MiroFish Swarm**: 20 AI agents independently score conviction → averaged result removes single-model bias  
- **Auto-Execution**: High-conviction themes → position sizing → paper/live trading via Alpaca

## Architecture

```
News / SEC Filings
       ↓
  Ingestion Pipeline (dedup + similarity filter)
       ↓
  LLM Theme Extraction (Claude Haiku)
       ↓
  MiroFish Swarm Conviction Scoring (20 agents)
       ↓
  Alpaca Trading Execution
```

## Status

Paper trading. v1 live 24/7. Implementation details coming soon.

## Repo Structure

```
/docs         — architecture docs, design decisions
/specs        — feature specs and PRDs
/research     — market research, competitor analysis
```
