# openfactory-mcp

> Manufacturing as a function call. Connect Claude (or any MCP agent) to verified GBA factories.

```bash
npx openfactory-mcp
```

## Claude Desktop setup

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openfactory": {
      "command": "npx",
      "args": ["openfactory-mcp"],
      "env": {
        "OPENFACTORY_URL": "http://localhost:3000"
      }
    }
  }
}
```

Then ask Claude:
> *"Find me a verified PCB factory in Shenzhen with MOQ under 500, get a quote for 2000 units of an IoT sensor board, and place the order."*

## Tools

| Tool | What it does |
|------|-------------|
| `search_factories` | Filter 10+ verified GBA factories by category, MOQ, tier |
| `get_quote` | Request price quote → unit price, total, lead time |
| `place_order` | Place escrow-protected order |
| `track_order` | Get production status + full event history |
| `update_order_status` | Advance production milestone (factory-side) |
| `get_analytics` | Platform GMV, quote volume, factory stats |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENFACTORY_URL` | `http://localhost:3000` | OpenFactory API base URL |

## Run the API server

```bash
git clone https://github.com/fengweit/OpenFactory
cd OpenFactory && npm install && npm run api
```

Server starts at `http://localhost:3000` with 10 seeded GBA factories.
