export type ModuleTool = {
  name: string;
  summary: string;
};

export type ModuleCatalogEntry = {
  summary: string;
  tools: Array<ModuleTool>;
};

export const MODULE_CATALOG = {
  weather: {
    summary: "Current, forecast, historical, air quality, marine, flood",
    tools: [
      { name: "weather_current", summary: "Current weather for a location" },
      { name: "weather_bulk_current", summary: "Current weather for up to 50 locations" },
      { name: "weather_forecast", summary: "Forecast up to 16 days" },
      { name: "weather_historical", summary: "Historical weather for a past date" },
      { name: "weather_time_series", summary: "Historical weather over a date range" },
      { name: "weather_air_quality", summary: "Air quality index and pollutants" },
      { name: "weather_marine", summary: "Marine and ocean weather" },
      { name: "weather_flood_forecast", summary: "Flood forecast and river discharge" },
    ],
  },
  currency: {
    summary: "Live/historical rates, converters, time series, symbols, limits",
    tools: [
      { name: "currency_latest_rates", summary: "Latest exchange rates" },
      { name: "currency_historical_rates", summary: "Rates for a past date" },
      { name: "currency_latest_converter", summary: "Convert using live rates" },
      { name: "currency_historical_converter", summary: "Convert using a past date" },
      { name: "currency_time_series", summary: "Day-by-day rates over a range" },
      { name: "currency_fluctuation", summary: "Rate change over a period" },
      { name: "currency_geo_convert", summary: "Convert to an IP's local currency" },
      { name: "currency_supported", summary: "Supported currencies with metadata" },
      { name: "currency_symbols", summary: "Map of currency symbols to names" },
      { name: "currency_symbol_info", summary: "Look up one currency symbol" },
      { name: "currency_historical_data_limits", summary: "Historical availability for every currency" },
      { name: "currency_historical_data_limit_info", summary: "Historical availability for one currency" },
    ],
  },
  "ip-intelligence": {
    summary: "IP geolocation and threat intelligence (single + bulk)",
    tools: [
      { name: "ipgeolocation_lookup", summary: "Geolocation for an IP or hostname" },
      { name: "ipgeolocation_bulk_lookup", summary: "Geolocation for many IPs" },
      { name: "ip_security_lookup", summary: "Threat / VPN / proxy / Tor for one IP" },
      { name: "ip_security_bulk_lookup", summary: "Threat intelligence for many IPs" },
    ],
  },
  whois: {
    summary: "Domain, IP, ASN, history, reverse, bulk",
    tools: [
      { name: "whois_domain_lookup", summary: "Live WHOIS for a domain" },
      { name: "whois_ip_lookup", summary: "WHOIS for an IP address" },
      { name: "whois_asn_lookup", summary: "WHOIS for an ASN" },
      { name: "whois_domain_history", summary: "Historical WHOIS snapshots" },
      { name: "whois_reverse_lookup", summary: "Search WHOIS by owner or keyword" },
      { name: "whois_bulk_domain_lookup", summary: "Live WHOIS for many domains" },
    ],
  },
  dns: {
    summary: "Live lookup, history, reverse, bulk",
    tools: [
      { name: "dns_lookup", summary: "Live DNS records for a hostname" },
      { name: "dns_history", summary: "Historical DNS snapshots" },
      { name: "dns_reverse", summary: "Hostnames pointing at a record value" },
      { name: "dns_bulk_lookup", summary: "Live DNS for many hostnames" },
    ],
  },
  domain: {
    summary: "Availability checks, suggestions, bulk, subdomain lookup",
    tools: [
      { name: "domain_check_availability", summary: "Check if a domain is available" },
      { name: "domain_check_availability_with_suggestions", summary: "Availability plus name suggestions" },
      { name: "domain_bulk_check_availability", summary: "Availability for many domains" },
      { name: "domain_subdomain_lookup", summary: "Discovered subdomains for a domain" },
    ],
  },
  ssl: {
    summary: "Live certificate and full chain",
    tools: [
      { name: "ssl_live_lookup", summary: "Live SSL certificate for a domain" },
      { name: "ssl_live_chain_lookup", summary: "Full SSL certificate chain" },
    ],
  },
  commodity: {
    summary: "Symbols, quotes, latest/historical rates, fluctuation, time series",
    tools: [
      { name: "commodity_symbols", summary: "Supported commodity symbols" },
      { name: "commodity_symbol_info", summary: "Look up one commodity symbol" },
      { name: "commodity_quotes", summary: "Supported quote currencies" },
      { name: "commodity_latest_rates", summary: "Latest commodity prices" },
      { name: "commodity_historical_rates", summary: "Historical commodity prices" },
      { name: "commodity_fluctuation", summary: "Price change over a range" },
      { name: "commodity_time_series", summary: "Daily OHLC over a range" },
    ],
  },
  zipcode: {
    summary: "Lookup, radius, distance, city/region",
    tools: [
      { name: "zipcode_lookup", summary: "Look up a ZIP or postal code" },
      { name: "zipcode_bulk_lookup", summary: "Look up many ZIP codes" },
      { name: "zipcode_radius_search", summary: "ZIP codes within a radius" },
      { name: "zipcode_distance", summary: "Distance from a point to ZIP codes" },
      { name: "zipcode_distance_match", summary: "ZIP pairs within a distance" },
      { name: "zipcode_by_city", summary: "ZIP codes for a city" },
      { name: "zipcode_by_region", summary: "ZIP codes for a region" },
    ],
  },
  timezone: {
    summary: "Lookup and convert",
    tools: [
      { name: "timezone_lookup", summary: "Timezone for a location" },
      { name: "timezone_convert", summary: "Convert a time between timezones" },
    ],
  },
  screenshot: {
    summary: "Capture, scrolling capture, bulk",
    tools: [
      { name: "screenshot_capture", summary: "Static webpage screenshot URL" },
      { name: "screenshot_capture_scrolling", summary: "Scrolling video or GIF URL" },
      { name: "screenshot_bulk_capture", summary: "Screenshots for many URLs" },
    ],
  },
  scraper: {
    summary: "Static HTML scrape and JS-rendered scrape",
    tools: [
      { name: "scraper_scrape", summary: "Scrape static HTML" },
      { name: "scraper_scrape_js", summary: "Scrape with JavaScript rendering" },
    ],
  },
  "user-agent": {
    summary: "Parse single or bulk user-agent strings",
    tools: [
      { name: "user_agent_parse", summary: "Parse one user-agent string" },
      { name: "user_agent_bulk_parse", summary: "Parse many user-agent strings" },
    ],
  },
  astronomy: {
    summary: "Sunrise, sunset, moon phase, and related solar/lunar data",
    tools: [
      { name: "astronomy_lookup", summary: "Sunrise, sunset, moon phase, and positions" },
    ],
  },
  financial: {
    summary: "SWIFT, IBAN, VAT rates and validation, supported countries",
    tools: [
      { name: "financial_supported_countries", summary: "VAT, IBAN, and SWIFT country lists" },
      { name: "financial_supported_country_info", summary: "Look up one country in those lists" },
      { name: "financial_swift_lookup", summary: "Bank record for a SWIFT/BIC code" },
      { name: "financial_swift_finder", summary: "Find SWIFT/BIC codes by country/bank/city" },
      { name: "financial_iban_validate", summary: "Validate an IBAN" },
      { name: "financial_vat_validate", summary: "Validate an EU or UK VAT number" },
      { name: "financial_vat_rates_by_country", summary: "VAT rates for a country" },
      { name: "financial_vat_rates_bulk", summary: "VAT rates for many countries" },
      { name: "financial_vat_rates_by_ip", summary: "VAT rates from an IP address" },
    ],
  },
  "email-validation": {
    summary: "Single and bulk email validation",
    tools: [
      { name: "email_validate", summary: "Validate one email address" },
      { name: "email_bulk_validate", summary: "Validate many email addresses" },
    ],
  },
  "phone-validation": {
    summary: "Single and bulk phone validation",
    tools: [
      { name: "phone_validate", summary: "Validate one phone number" },
      { name: "phone_bulk_validate", summary: "Validate many phone numbers" },
    ],
  },
  geocoding: {
    summary: "Forward and reverse geocoding",
    tools: [
      { name: "geocode_forward", summary: "Address or place name to coordinates" },
      { name: "geocode_reverse", summary: "Coordinates to a street address" },
    ],
  },
  geodb: {
    summary: "Countries, cities, regions, admin units, flags",
    tools: [
      { name: "geodb_regions", summary: "List GeoDB regions" },
      { name: "geodb_subregions", summary: "List subregions" },
      { name: "geodb_countries", summary: "List countries and territories" },
      { name: "geodb_country_details", summary: "Metadata for one country" },
      { name: "geodb_admin_levels", summary: "Admin level types for a country" },
      { name: "geodb_admin_units", summary: "States, provinces, and other units" },
      { name: "geodb_admin_unit_details", summary: "Details for one admin unit" },
      { name: "geodb_cities", summary: "Cities for a country" },
      { name: "geodb_flags_supported", summary: "Supported flag identifiers" },
      { name: "geodb_flag", summary: "Country or organization flag image" },
    ],
  },
} as const satisfies Record<string, ModuleCatalogEntry>;

export type ModuleName = keyof typeof MODULE_CATALOG;

export const MODULE_NAMES = Object.keys(MODULE_CATALOG) as Array<ModuleName>;
