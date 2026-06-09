export const ENDPOINTS = {
  // Commodity
  COMMODITY_SYMBOLS: "/v1.0/commodity/symbols",
  COMMODITY_LATEST: "/v1.0/commodity/rates/latest",
  COMMODITY_HISTORICAL: "/v1.0/commodity/rates/historical",
  COMMODITY_FLUCTUATION: "/v1.0/commodity/fluctuation",
  COMMODITY_TIMESERIES: "/v1.0/commodity/time-series",

  // Weather
  WEATHER_CURRENT: "/v1.0/weather/current",
  WEATHER_FORECAST: "/v1.0/weather/forecast",
  WEATHER_HISTORICAL: "/v1.0/weather/historical",
  WEATHER_TIMESERIES: "/v1.0/weather/time-series",
  WEATHER_AIR_QUALITY: "/v1.0/weather/air-quality",
  WEATHER_MARINE: "/v1.0/weather/marine",
  WEATHER_FLOOD: "/v1.0/weather/flood",

  // Geolocation
  GEO_IP_LOOKUP: "/v1.0/geolocation/lookup",
  GEO_ASTRONOMY: "/v1.0/geolocation/astronomy",
  GEO_TIMEZONE: "/v1.0/geolocation/timezone",
  GEO_TIMEZONE_CONVERTER: "/v1.0/timezone/converter",

  // User Agent
  USER_AGENT_LOOKUP: "/v1.0/user-agent/lookup",

  // WHOIS
  WHOIS_DOMAIN_LIVE: "/v1.0/domain/whois/live",
  WHOIS_IP_LIVE: "/v1.0/ip/whois/live",
  WHOIS_ASN_LIVE: "/v1.0/asn/whois/live",
  WHOIS_DOMAIN_HISTORY: "/v1.0/domain/whois/history",
  WHOIS_DOMAIN_REVERSE: "/v1.0/domain/whois/reverse",

  // DNS
  DNS_LIVE: "/v1.0/domain/dns/live",
  DNS_HISTORY: "/v1.0/domain/dns/history",
  DNS_REVERSE: "/v1.0/domain/dns/reverse",

  // SSL
  SSL_LIVE: "/v1.0/domain/ssl/live",
  SSL_LIVE_CHAIN: "/v1.0/domain/ssl/live/chain",

  // Domain
  DOMAIN_AVAILABILITY: "/v1.0/domain/availability",
  DOMAIN_AVAILABILITY_SUGGESTIONS: "/v1.0/domain/availability/suggestions",

  // Currency
  CURRENCY_RATES_LATEST: "/v1.0/currency/rates/latest",
  CURRENCY_RATES_HISTORICAL: "/v1.0/currency/rates/historical",
  CURRENCY_CONVERTER_LATEST: "/v1.0/currency/converter/latest/prices",
  CURRENCY_CONVERTER_HISTORICAL: "/v1.0/currency/converter/historical/prices",
  CURRENCY_TIME_SERIES: "/v1.0/currency/time-series",
  CURRENCY_FLUCTUATION: "/v1.0/currency/fluctuation",
  CURRENCY_GEO_CONVERT: "/v1.0/currency/converter/ip-to-currency",
  CURRENCY_SUPPORTED: "/v1.0/currency/supported",
  CURRENCY_SYMBOLS: "/v1.0/currency/symbols",

  // ZIP Code
  ZIPCODE_LOOKUP: "/v1.0/zipcode/lookup",
  ZIPCODE_RADIUS: "/v1.0/zipcode/search/radius",
  ZIPCODE_DISTANCE: "/v1.0/zipcode/distance",
  ZIPCODE_DISTANCE_MATCH: "/v1.0/zipcode/distance/match",
  ZIPCODE_CITY: "/v1.0/zipcode/search/city",
  ZIPCODE_REGION: "/v1.0/zipcode/search/region",

  // Screenshot
  SCREENSHOT: "/v1.0/screenshot",

} as const;

export type Endpoint = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];
