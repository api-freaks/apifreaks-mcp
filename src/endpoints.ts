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

  // IP Threat Intelligence
  IP_SECURITY: "/v1.0/ip/security",

  // Geolocation
  GEO_IP_LOOKUP: "/v2.0/geolocation/lookup",
  GEO_ASTRONOMY: "/v2.0/geolocation/astronomy",
  GEO_TIMEZONE: "/v2.0/geolocation/timezone",
  GEO_TIMEZONE_CONVERTER: "/v1.0/timezone/converter",

  // User Agent
  USER_AGENT_LOOKUP: "/v1.0/user-agent/lookup",

  // WHOIS
  WHOIS_DOMAIN_LIVE: "/v2.0/domain/whois/live",
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
  DOMAIN_SUBDOMAIN_LOOKUP: "/v1.0/subdomains/lookup",

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
  CURRENCY_HISTORICAL_DATA_LIMITS: "/v1.0/currency/historical/data/limits",

  // ZIP Code
  ZIPCODE_LOOKUP: "/v1.0/zipcode/lookup",
  ZIPCODE_RADIUS: "/v1.0/zipcode/search/radius",
  ZIPCODE_DISTANCE: "/v1.0/zipcode/distance",
  ZIPCODE_DISTANCE_MATCH: "/v1.0/zipcode/distance/match",
  ZIPCODE_CITY: "/v1.0/zipcode/search/city",
  ZIPCODE_REGION: "/v1.0/zipcode/search/region",

  // Screenshot
  SCREENSHOT: "/v1.0/screenshot",

  // Scraper
  SCRAPING: "/v1.0/scraping",

  // Financial
  SWIFT_LOOKUP: "/v1.0/swift-code/lookup",
  SWIFT_FINDER: "/v1.0/swift-code/finder",
  IBAN_VALIDATION: "/v1.0/iban/validation",
  VAT_VALIDATION: "/v1.0/vat/validation",
  VAT_RATES_COUNTRY: "/v1.0/vat/rates/country",
  VAT_RATES_IP: "/v1.0/vat/rates/ip-address",
  FINANCIAL_SUPPORTED_COUNTRIES: "/v1.0/vat/supported-countries",

  // Email validation
  EMAIL_VALIDATION_SINGLE: "/v1.0/email-validation/single",
  EMAIL_VALIDATION_BULK: "/v1.0/email-validation/bulk",

  // Phone validation
  PHONE_VALIDATION: "/v1.0/phone/validation",
  PHONE_VALIDATION_BULK: "/v1.0/phone/validation/bulk",

  // Geocoding
  GEOCODER_SEARCH: "/v1.0/geocoder/search",
  GEOCODER_REVERSE: "/v1.0/geocoder/reverse",

  // GeoDB
  GEO_COUNTRIES: "/v1.0/geo/countries",
  GEO_COUNTRY_DETAILS: "/v1.0/geo/country/details",
  GEO_REGIONS: "/v1.0/geo/regions",
  GEO_SUBREGIONS: "/v1.0/geo/subregions",
  GEO_CITIES: "/v1.0/geo/cities",
  GEO_ADMIN_UNITS: "/v1.0/geo/admin-units",
  GEO_ADMIN_UNIT_DETAILS: "/v1.0/geo/admin-unit/details",
  GEO_ADMIN_LEVELS: "/v1.0/geo/admin-levels",
  GEO_FLAGS: "/v1.0/flags",
  GEO_FLAGS_SUPPORTED: "/v1.0/flags/supported",

} as const;
