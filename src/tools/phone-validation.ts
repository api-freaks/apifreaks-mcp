import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY, type Body } from "../constants.js";

const NUMBER_DESC =
  "Phone number to validate. Accepts international format with + (e.g. '+14155552671'), " +
  "local format with region (e.g. '4155552671' + region='US'), " +
  "or IDD format with dialer_region (e.g. '011442071838750' + dialer_region='US').";
const REGION_DESC =
  "Two-letter ISO country code (e.g. 'US', 'GB', 'PK'). Required when the number is in local format without a + prefix. " +
  "Cannot be used together with dialer_region.";
const DIALER_REGION_DESC =
  "Two-letter ISO country code for the country the number is being dialed from. " +
  "Required when the number uses an IDD exit code. Cannot be used together with region.";

const PhoneEntry = z.object({
  phone_number: z.string().describe(NUMBER_DESC),
  region: z.string().optional().describe(REGION_DESC),
  dialer_region: z.string().optional().describe(DIALER_REGION_DESC),
});

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "phone_validate",
    {
      title: "Phone Validation",
      description:
        "Validate a single phone number and return carrier, line type, location, time zones, and four standardized formats. " +
        "Response fields include raw_input, possible, valid, country_prefix, national_number, country_code, location, " +
        "time_zones, line_type, formats (E164, International, National, RFC3966), area_code_length, ndc_length, " +
        "and can_be_internationally_dialled. " +
        "line_type is one of: MOBILE, FIXED_LINE, FIXED_LINE_OR_MOBILE, VOIP, TOLL_FREE, PREMIUM_RATE, " +
        "SHARED_COST, PERSONAL_NUMBER, PAGER, UAN, VOICEMAIL, UNKNOWN. " +
        "Use region for local numbers without +; use dialer_region for IDD numbers. Do not pass both.",
      inputSchema: PhoneEntry,
      annotations: READ_ONLY,
    },
    async ({ phone_number, region, dialer_region }) => {
      const data = await callApi(
        ENDPOINTS.PHONE_VALIDATION,
        apiKey,
        {},
        phoneBody({ phone_number, region, dialer_region }),
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "phone_bulk_validate",
    {
      title: "Bulk Phone Validation",
      description:
        "Validate up to 100 phone numbers in one request. Each number is processed independently — " +
        "invalid entries return per-number results without affecting the rest of the batch. " +
        "Each result uses the same structure as 'phone_validate'. Maximum 100 numbers per request. " +
        "region and dialer_region follow the same rules as the single-number tool and must not be combined on one entry.",
      inputSchema: z.object({
        numbers: z
          .array(PhoneEntry)
          .max(100)
          .describe(
            'List of phone objects (max 100). Each must include "phone_number". Example: [{"phone_number":"+14155552671"},{"phone_number":"4155552671","region":"US"}]',
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ numbers }) => {
      const data = await callApi(
        ENDPOINTS.PHONE_VALIDATION_BULK,
        apiKey,
        {},
        {
          numbers: numbers.map((entry) => phoneBody(entry)),
        },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}

function phoneBody(entry: {
  phone_number: string;
  region?: string;
  dialer_region?: string;
}): Body {
  const body: Body = { number: entry.phone_number };
  if (entry.region !== undefined) body["region"] = entry.region;
  if (entry.dialer_region !== undefined) {
    body["dialer_region"] = entry.dialer_region;
  }
  return body;
}
