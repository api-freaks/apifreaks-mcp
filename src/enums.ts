import { z } from "zod";

export const ForecastPrecision = z.enum(["daily", "hourly", "minutely"]);
export const HistoricalPrecision = z.enum(["daily", "hourly"]);
export const GeoLang = z.enum([
  "en",
  "de",
  "ru",
  "ja",
  "fr",
  "cn",
  "es",
  "cs",
  "it",
]);
export const DistanceUnit = z.enum(["km", "mi", "yd", "m", "ft", "in"]);
export const WhoisReverseLookupMode = z.enum(["default", "mini"]);
export const DomainResultSource = z.enum(["whois", "dns"]);
export const CurrencyUpdateFrequency = z.enum(["1m", "10m", "1h", "1d"]);
export const ScreenshotFileType = z.enum(["PNG", "JPG", "WebP", "PDF"]);
export const ScrollingFileType = z.enum(["MP4", "WEBM", "GIF"]);
export const ScrollSpeed = z.enum(["fast", "normal", "slow"]);
export const WaitForEvent = z.enum(["load", "domcontentloaded", "networkidle"]);
