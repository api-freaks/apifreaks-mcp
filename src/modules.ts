import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { READ_ONLY } from "./constants.js";
import { ENV, getModulesEnv } from "./env.js";
import {
  MODULE_CATALOG,
  MODULE_NAMES,
  type ModuleName,
  type ModuleTool,
} from "./module-catalog.js";

import { register as registerCommodity } from "./tools/commodity.js";
import { register as registerCurrency } from "./tools/currency.js";
import { register as registerDns } from "./tools/dns.js";
import { register as registerDomain } from "./tools/domain.js";
import { register as registerEmailValidation } from "./tools/email-validation.js";
import { register as registerFinancial } from "./tools/financial.js";
import { register as registerGeocoding } from "./tools/geocoding.js";
import { register as registerGeography } from "./tools/geodb.js";
import { register as registerIpIntelligence } from "./tools/ip-intelligence.js";
import { register as registerPdf } from "./tools/pdf.js";
import { register as registerPhoneValidation } from "./tools/phone-validation.js";
import { register as registerScraper } from "./tools/scraper.js";
import { register as registerScreenshot } from "./tools/screenshot.js";
import { register as registerSsl } from "./tools/ssl.js";
import { register as registerTimezone } from "./tools/timezone.js";
import { register as registerUserAgent } from "./tools/user-agent.js";
import { register as registerWeather } from "./tools/weather.js";
import { register as registerWhois } from "./tools/whois.js";
import { register as registerZipcode } from "./tools/zipcode.js";

const MODULES: Record<ModuleName, (server: McpServer, apiKey: string) => void> =
  {
    "ip-intelligence": registerIpIntelligence,
    geocoding: registerGeocoding,
    whois: registerWhois,
    dns: registerDns,
    scraper: registerScraper,
    "email-validation": registerEmailValidation,
    "phone-validation": registerPhoneValidation,
    ssl: registerSsl,
    domain: registerDomain,
    screenshot: registerScreenshot,
    pdf: registerPdf,
    currency: registerCurrency,
    commodity: registerCommodity,
    financial: registerFinancial,
    zipcode: registerZipcode,
    weather: registerWeather,
    geography: registerGeography,
    timezone: registerTimezone,
    "user-agent": registerUserAgent,
  };

const TOPICS = MODULE_NAMES.join(", ");

export type ModulesState = {
  enabled: Array<ModuleName>;
  unknown: Array<string>;
};

export function parseEnabledModules(): ModulesState {
  const raw = getModulesEnv();
  if (!raw?.trim()) {
    return { enabled: [], unknown: [] };
  }

  const enabled: Array<ModuleName> = [];
  const seen = new Set<string>();
  const unknown: Array<string> = [];

  for (const token of raw.split(",")) {
    const name = token.trim().toLowerCase().replaceAll("_", "-");
    if (!name) {
      continue;
    }
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    if (name in MODULES) {
      enabled.push(name as ModuleName);
    } else {
      unknown.push(name);
    }
  }

  return { enabled, unknown };
}

/** Short routing hint at MCP initialize (when the client supports it). */
export function buildServerInstructions(enabled: Array<ModuleName>): string {
  if (enabled.length === 0) {
    return (
      `APIFreaks MCP — modules: ${TOPICS}. ` +
      `${ENV.MODULES} (env) is unset, so only list_modules is registered. ` +
      `Call it for a paste-ready ${ENV.MODULES}=... line, then ask the user to set that env and restart to enable modules.`
    );
  }

  return (
    `APIFreaks MCP — modules: ${TOPICS}. ` +
    `Enabled via ${ENV.MODULES}: ${enabled.join(", ")}. ` +
    `If a needed module is missing, call list_modules and share its enable_line so the user can update ${ENV.MODULES} and restart.`
  );
}

export function registerEnabledModules(
  server: McpServer,
  apiKey: string,
  state: ModulesState = parseEnabledModules(),
): void {
  const { enabled, unknown } = state;

  if (unknown.length > 0) {
    console.error(
      `APIFreaks MCP: ignoring unknown ${ENV.MODULES} name(s): ${unknown.join(", ")}. ` +
        `Known: ${MODULE_NAMES.join(", ")}.`,
    );
  }

  registerListModules(server, enabled, unknown);

  for (const name of enabled) {
    MODULES[name](server, apiKey);
  }
}

function registerListModules(
  server: McpServer,
  enabled: Array<ModuleName>,
  unknown: Array<string>,
): void {
  const enabledSet = new Set<ModuleName>(enabled);
  const currentLine = enabled.length > 0 ? modulesEnvLine(enabled) : "";
  const exampleLine = modulesEnvLine([
    "ip-intelligence",
    "whois",
    "dns",
    "domain",
    "weather",
  ]);

  const description =
    `APIFreaks module catalog (opt-in via ${ENV.MODULES}). ` +
    `Call when a needed capability is missing from your tool list, or to check whether APIFreaks covers a topic. ` +
    `Live tools for enabled modules already appear in tools/list; this returns needs_enable[] with paste-ready enable_line values — give the user that ${ENV.MODULES}=... line and ask them to restart. ` +
    `Modules: ${TOPICS}.` +
    (enabled.length === 0
      ? ` ${ENV.MODULES} unset — only this tool is registered (example: ${exampleLine}).`
      : ` Currently enabled: ${enabled.join(", ")}.`);

  server.registerTool(
    "list_modules",
    {
      title: "Discover APIFreaks modules",
      description,
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async function () {
      const needs_enable: Array<{
        module: ModuleName;
        summary: string;
        tools: Array<ModuleTool>;
        enable_line: string;
      }> = [];

      for (const name of MODULE_NAMES) {
        if (enabledSet.has(name)) {
          continue;
        }
        needs_enable.push({
          module: name,
          summary: MODULE_CATALOG[name].summary,
          tools: MODULE_CATALOG[name].tools,
          enable_line: modulesEnvLine([...enabled, name]),
        });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              agent_hint:
                "Live tools are in tools/list. For anything missing, give the user needs_enable[].enable_line and ask them to restart.",
              env: ENV.MODULES,
              enabled,
              unknown,
              current: currentLine || null,
              example: exampleLine,
              needs_enable,
            }),
          },
        ],
      };
    },
  );
}

function modulesEnvLine(names: Array<string>): string {
  return `${ENV.MODULES}=${names.join(",")}`;
}
