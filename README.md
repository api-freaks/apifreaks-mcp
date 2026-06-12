# @apifreaks/mcp

[![npm version](https://img.shields.io/npm/v/@apifreaks/mcp?logo=npm&label=npm&color=CB3837)](https://www.npmjs.com/package/@apifreaks/mcp)
[![GitHub release](https://img.shields.io/github/v/release/api-freaks/apifreaks-mcp?logo=github&label=release&color=181717)](https://github.com/api-freaks/apifreaks-mcp/releases)
[![Glama](https://glama.ai/mcp/servers/api-freaks/apifreaks-mcp/badges/score.svg)](https://glama.ai/mcp/servers/api-freaks/apifreaks-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-5FA04E?logo=node.js&logoColor=white)](https://nodejs.org)
[![CI](https://github.com/api-freaks/apifreaks-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/api-freaks/apifreaks-mcp/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-16A34A)](https://github.com/api-freaks/apifreaks-mcp/blob/main/LICENSE)

The official [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [APIFreaks](https://apifreaks.com). Add it to Claude, Cursor, Windsurf, or any MCP-compatible client and your AI can instantly query live weather, domains, IPs, DNS records, SSL certs, currency rates, commodity prices, screenshots, and more.

**What can you ask once it's connected?**

| | |
|---|---|
| 🌦 | *"What's the 7-day forecast for Tokyo and should I bring an umbrella?"* |
| 🔒 | *"Check stripe.com's SSL cert — is it valid and when does it expire?"* |
| 🌍 | *"Who registered openai.com and when? Has the WHOIS record changed recently?"* |
| 💱 | *"Convert 2500 USD to EUR, GBP, and JPY at today's live rate."* |
| 🔍 | *"Check if these 20 domain names are available for registration."* |
| 📡 | *"What DNS records does github.com have? Show me the full MX and TXT records."* |

---

## Table of Contents

- [Requirements](#requirements)
- [Environment Variables](#environment-variables)
- [Getting Your API Key](#getting-your-api-key)
- [Quick Start](#quick-start)
- [Integration Guides](#integration-guides)
  - [Claude Code](#claude-code)
  - [Codex CLI](#codex-cli)
  - [Claude Desktop](#claude-desktop)
  - [Cursor](#cursor)
  - [Windsurf](#windsurf)
  - [Cline](#cline)
  - [OpenCode](#opencode)
  - [Gemini CLI](#gemini-cli)
  - [VS Code](#vs-code-github-copilot--continue)
  - [Glama](#glama)
- [Available Tools](#available-tools)
- [Support](#support)
- [License](#license)
- [Privacy Policy](#privacy-policy)

---

## Requirements

- [Node.js](https://nodejs.org) v20 or higher
- An APIFreaks API key — [sign up free](https://apifreaks.com)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `APIFREAKS_API_KEY` | Yes | Your APIFreaks API key — get one at [apifreaks.com](https://apifreaks.com) |

---

## Getting Your API Key

Sign in or create a free account at [apifreaks.com](https://apifreaks.com). Your API key is in the dashboard under **API Keys**.

Full API documentation: [apifreaks.com/docs](https://apifreaks.com/docs)

---

## Quick Start

The fastest way to connect it — via the Claude Code CLI:

```bash
claude mcp add apifreaks -e APIFREAKS_API_KEY=your_apikey_here -- npx -y @apifreaks/mcp
```

That's it. For Cursor, Windsurf, Cline, and others see the [Integration Guides](#integration-guides) below.

---

## Integration Guides

### Claude Code

**Via terminal (recommended):**

```bash
claude mcp add apifreaks -e APIFREAKS_API_KEY=your_apikey_here -- npx -y @apifreaks/mcp
```

**Via config file** (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "apifreaks": {
      "command": "npx",
      "args": ["-y", "@apifreaks/mcp"],
      "env": {
        "APIFREAKS_API_KEY": "your_apikey_here"
      }
    }
  }
}
```

---

### Codex CLI

```bash
codex mcp add apifreaks --env APIFREAKS_API_KEY=your_apikey_here -- npx -y @apifreaks/mcp
```

Start a new Codex session after adding the server.

---

### Claude Desktop

Edit `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "apifreaks": {
      "command": "npx",
      "args": ["-y", "@apifreaks/mcp"],
      "env": {
        "APIFREAKS_API_KEY": "your_apikey_here"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---

### Cursor

Create or edit `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` for global):

```json
{
  "mcpServers": {
    "apifreaks": {
      "command": "npx",
      "args": ["-y", "@apifreaks/mcp"],
      "env": {
        "APIFREAKS_API_KEY": "your_apikey_here"
      }
    }
  }
}
```

Or go to **Cursor Settings → MCP** and add the server via the UI.

---

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "apifreaks": {
      "command": "npx",
      "args": ["-y", "@apifreaks/mcp"],
      "env": {
        "APIFREAKS_API_KEY": "your_apikey_here"
      }
    }
  }
}
```

---

### Cline

Open the **MCP Servers** panel in Cline, click **Configure**, then **Advanced MCP Settings** to open `cline_mcp_settings.json`. Or edit it directly:

- **macOS:** `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Linux:** `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows:** `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "apifreaks": {
      "command": "npx",
      "args": ["-y", "@apifreaks/mcp"],
      "env": {
        "APIFREAKS_API_KEY": "your_apikey_here"
      }
    }
  }
}
```

Restart Cline after saving.

---

### OpenCode

Edit `~/.config/opencode/config.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "apifreaks": {
      "type": "local",
      "command": ["npx", "-y", "@apifreaks/mcp"],
      "environment": {
        "APIFREAKS_API_KEY": "your_apikey_here"
      }
    }
  }
}
```

---

### Gemini CLI

Edit `~/.gemini/settings.json` (or `.gemini/settings.json` in your project root for project-level config):

```json
{
  "mcpServers": {
    "apifreaks": {
      "command": "npx",
      "args": ["-y", "@apifreaks/mcp"],
      "env": {
        "APIFREAKS_API_KEY": "your_apikey_here"
      }
    }
  }
}
```

---

### VS Code (GitHub Copilot / Continue)

Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "apifreaks": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@apifreaks/mcp"],
      "env": {
        "APIFREAKS_API_KEY": "your_apikey_here"
      }
    }
  }
}
```

---

### Glama

The APIFreaks MCP server is listed on [Glama](https://glama.ai/mcp/servers/api-freaks/apifreaks-mcp). Glama provides one-click connection and automatic configuration for Claude Desktop and other MCP clients, along with regular security scans and tool quality scoring.

Click **Connect** on the Glama listing page and follow the prompts — it will generate the correct config for your client automatically.

---

## Available Tools

### Weather — 8 tools

Real-time conditions, forecasts, historical data, and environmental monitoring.

| Tool | Description |
|---|---|
| `weather_current` | Current weather for any location — temperature, humidity, wind, pressure, AQI |
| `weather_bulk_current` | Current weather for up to 50 locations in one request |
| `weather_forecast` | Forecast up to 16 days ahead with daily, hourly, or minutely precision |
| `weather_historical` | Historical weather for any past date (data back to 1940) |
| `weather_time_series` | Historical weather over a custom date range |
| `weather_air_quality` | Real-time or forecast air quality index and pollutant breakdown |
| `weather_marine` | Marine and ocean weather, real-time or forecast up to 16 days |
| `weather_flood_forecast` | Flood forecast with river discharge and flow percentile data |

---

### Currency — 10 tools

Live and historical exchange rates for 170+ fiat currencies and 830+ cryptocurrencies.

| Tool | Description |
|---|---|
| `currency_latest_rates` | Latest exchange rates for all supported currencies |
| `currency_historical_rates` | Exchange rates for a specific past date |
| `currency_latest_converter` | Convert an amount between currencies using live rates |
| `currency_historical_converter` | Convert using rates from a specific past date |
| `currency_time_series` | Day-by-day exchange rates over a custom date range |
| `currency_fluctuation` | Rate fluctuation metrics and percentage change over a period |
| `currency_geo_convert` | Convert to the local currency of an IP address's country |
| `currency_supported` | Full list of supported currencies with metadata |
| `currency_symbols` | Map of currency symbols to currency names |
| `currency_symbol_info` | Validate a currency symbol and get its full name |

---

### IP Intelligence — 2 tools

Geolocation, ISP, and network data for any IP address.

| Tool | Description |
|---|---|
| `ipgeolocation_lookup` | Geolocation data for an IP, IPv6 address, or hostname |
| `ipgeolocation_bulk_lookup` | Geolocation data for up to 50,000 IPs in one request |

---

### WHOIS — 6 tools

Domain and IP ownership data including historical records.

| Tool | Description |
|---|---|
| `whois_domain_lookup` | Live WHOIS record for a domain name |
| `whois_ip_lookup` | WHOIS ownership and network data for an IPv4 or IPv6 address |
| `whois_asn_lookup` | WHOIS data for an Autonomous System Number (ASN) |
| `whois_domain_history` | Historical WHOIS snapshots for a domain (data back to 1986) |
| `whois_reverse_lookup` | Search WHOIS records by owner name, email, company, or keyword |
| `whois_bulk_domain_lookup` | Live WHOIS data for up to 100 domains at once |

---

### DNS — 4 tools

Live DNS records, history, and reverse lookups.

| Tool | Description |
|---|---|
| `dns_lookup` | Real-time DNS records for a hostname — A, AAAA, MX, NS, TXT, CNAME, SOA, SPF |
| `dns_history` | Historical DNS record snapshots for a hostname |
| `dns_reverse` | Find all hostnames pointing to a specific DNS record value |
| `dns_bulk_lookup` | Real-time DNS records for up to 100 hostnames at once |

---

### Domain — 3 tools

Domain availability checks with bulk support and suggestions.

| Tool | Description |
|---|---|
| `domain_check_availability` | Check whether a domain name is available for registration |
| `domain_check_availability_with_suggestions` | Check availability and get alternative domain suggestions |
| `domain_bulk_check_availability` | Check availability for up to 100 domains at once |

---

### SSL — 2 tools

Live SSL certificate data for any domain.

| Tool | Description |
|---|---|
| `ssl_live_lookup` | Retrieve the live SSL certificate for a domain |
| `ssl_live_chain_lookup` | Retrieve the complete SSL certificate chain for a domain |

---

### Commodity — 7 tools

Real-time and historical prices for commodities like gold, oil, and agricultural products.

| Tool | Description |
|---|---|
| `commodity_symbols` | List all supported commodity symbols with metadata |
| `commodity_symbol_info` | Validate a commodity symbol and get its full details |
| `commodity_quotes` | List all supported quote currencies for commodity pricing |
| `commodity_latest_rates` | Real-time prices for one or more commodities |
| `commodity_historical_rates` | Historical OHLC prices for commodities on a specific date |
| `commodity_fluctuation` | Price fluctuation metrics over a date range |
| `commodity_time_series` | Daily OHLC prices over a date range (up to 365 days) |

---

### ZIP Code — 7 tools

Postal code lookups, radius searches, and distance calculations worldwide.

| Tool | Description |
|---|---|
| `zipcode_lookup` | Look up a ZIP or postal code — city, region, country, coordinates |
| `zipcode_bulk_lookup` | Look up up to 100 ZIP/postal codes at once |
| `zipcode_radius_search` | Find all ZIP codes within a given radius of a center point |
| `zipcode_distance` | Calculate distance from a base point to up to 100 ZIP codes |
| `zipcode_distance_match` | Find all ZIP code pairs within a given distance threshold |
| `zipcode_by_city` | Get all ZIP/postal codes for a city |
| `zipcode_by_region` | Get all ZIP/postal codes for a state, province, or region |

---

### Timezone — 2 tools

Timezone lookups and conversions using any location identifier.

| Tool | Description |
|---|---|
| `timezone_lookup` | Timezone info for a location — accepts IP, city, lat/long, IATA, ICAO, or UN/LOCODE |
| `timezone_convert` | Convert a date and time from one timezone to another |

---

### Screenshot — 3 tools

Capture screenshots and scrolling recordings of any webpage.

| Tool | Description |
|---|---|
| `screenshot_capture` | Capture a screenshot of a webpage and return the image URL |
| `screenshot_capture_scrolling` | Record a scrolling video or animated GIF of a webpage |
| `screenshot_bulk_capture` | Capture screenshots of up to 50 webpages in one request |

---

### User Agent — 2 tools

Parse user-agent strings to extract browser, OS, and device information.

| Tool | Description |
|---|---|
| `user_agent_parse` | Parse a user-agent string — browser, device, OS, engine |
| `user_agent_bulk_parse` | Parse up to 100 user-agent strings in a single request |

---

### Astronomy — 1 tool

Solar and lunar data for any location and date.

| Tool | Description |
|---|---|
| `astronomy_lookup` | Sunrise, sunset, moon phase, twilight, golden hour, solar noon, moonrise, and sun/moon positions |

---

## Support

- **Email:** support@apifreaks.com
- **Status:** [status.apifreaks.com](https://status.apifreaks.com)
- **Issues:** [github.com/api-freaks/apifreaks-mcp/issues](https://github.com/api-freaks/apifreaks-mcp/issues)

---

## License

This project is licensed under the [Apache License 2.0](./LICENSE). You are free to use, modify, and distribute this software in accordance with the terms of the license.

---

## Privacy Policy

Your API requests are processed by APIFreaks in accordance with their privacy policy. See [apifreaks.com/privacy-policy](https://apifreaks.com/privacy-policy) for details on how data is collected and handled.
