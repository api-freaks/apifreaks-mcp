import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import { READ_ONLY, type Body, type Params } from "../constants.js";

const URL_DESC = "Full URL of the page to scrape (e.g. 'https://example.com').";
const TEXT_DESC =
  "If true, return extracted text instead of HTML. " +
  "Under JS rendering, a selector that matches exactly one element is always plain text regardless of this flag; " +
  "multi-element matches keep tags unless this is true.";
const PROXY_DESC =
  "Use a proxy. Pass true for the default rotating pool, false to disable, or a proxy URL to use that proxy.";
const EXTRACT_DESC =
  "Map of output field names to a CSS or XPath selector. " +
  "Each key becomes a field on extractedData: one match is a string, several matches are a string array, no match is omitted. " +
  "html, text, and (JS mode) user_data are valid key names; any other names work the same.";
const PLACE_DESC = "CSS selector or XPath of the target element.";

const CaptchaModel = z.enum([
  "Model_1",
  "Model_2",
  "Model_3",
  "Model_4",
  "Model_5",
  "Model_6",
  "basicTnImageProcessing",
  "basicPhImageProcessing",
]);

const ExtractFields = z.record(z.string(), z.string()).describe(EXTRACT_DESC);

const PlaceValue = z.object({
  place: z.string().describe(PLACE_DESC),
  value: z.string().describe("Value to fill, select, or match."),
});

const FormSubmission = z.object({
  selector: z.string().describe("CSS selector or XPath identifying the form."),
  data: z
    .record(z.string(), z.string())
    .describe("Form field names and the values to submit."),
});

const ImageCaptcha = z.object({
  imagePath: z
    .string()
    .optional()
    .describe("Selector for the CAPTCHA image element."),
  textField: z
    .string()
    .optional()
    .describe("Selector for the field where the solved text is entered."),
  imageUpdatePath: z
    .string()
    .optional()
    .describe("Selector to refresh or update the CAPTCHA image."),
  captchaFailedPath: z
    .string()
    .optional()
    .describe("Selector that indicates a failed CAPTCHA so the solver can retry."),
  model: CaptchaModel.optional().describe("CAPTCHA-solving model to use."),
});

const StaticInstruction = z.object({
  postForm: FormSubmission.optional().describe(
    "Submit the form with POST. Provide selector and field data.",
  ),
  getForm: FormSubmission.optional().describe(
    "Submit the form with GET. Provide selector and field data.",
  ),
  extract: ExtractFields.optional(),
  getPage: z
    .string()
    .optional()
    .describe(
      "Fetch page content. Optionally a URL or selector; omit instructions entirely to get the full page.",
    ),
});

const JsInstruction = z.object({
  fill: PlaceValue.optional().describe("Fill an input identified by place."),
  click: z.string().optional().describe("Click the element at this selector."),
  clickIfExist: z
    .string()
    .optional()
    .describe("Click the element only if it appears within a short timeout."),
  enter: z
    .string()
    .optional()
    .describe("Send Enter to the element at this selector."),
  newTab: z
    .boolean()
    .optional()
    .describe("Set true to switch to a newly opened tab."),
  moveToRelativeTab: z
    .number()
    .int()
    .optional()
    .describe("Move by relative tab index (1 next, -1 previous)."),
  wait: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Pause for this many milliseconds."),
  waitFor: z
    .string()
    .optional()
    .describe("Wait until this selector is visible."),
  select: PlaceValue.optional().describe(
    "Select a dropdown option: place is the control, value is the option to match.",
  ),
  jsExe: z
    .string()
    .optional()
    .describe("JavaScript to run in the page context."),
  conditionalCheck: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe(
      "Conditional steps with if-/else- keys, executed based on element state.",
    ),
  clickButtonByValue: PlaceValue.optional().describe(
    "Click a button whose text or value matches.",
  ),
  generalImageCaptcha: z
    .array(ImageCaptcha)
    .optional()
    .describe("Solve image CAPTCHAs. Requires captcha to be enabled."),
  fillImageCaptcha: z
    .array(ImageCaptcha)
    .optional()
    .describe("Capture and fill image CAPTCHAs. Requires captcha to be enabled."),
  switchToIframe: z
    .string()
    .optional()
    .describe("Switch into an iframe by name or ID."),
  switchToParentFrame: z
    .boolean()
    .optional()
    .describe("Set true to return from an iframe to its parent."),
  resolveAudioCaptcha: z
    .object({
      audioPath: z
        .string()
        .optional()
        .describe("Selector for the audio CAPTCHA element."),
      textField: z
        .string()
        .optional()
        .describe("Selector for the field to fill with the solved text."),
    })
    .optional()
    .describe("Solve an audio CAPTCHA. Requires captcha to be enabled."),
  screenshot: z
    .string()
    .optional()
    .describe(
      "Capture a screenshot of the current page. Pass a CSS/XPath selector, or a truthy string such as 'true' for the full page.",
    ),
  saveimage: z
    .string()
    .optional()
    .describe("Save an image from the page by CSS selector or element ID."),
  blockElement: z
    .array(z.string())
    .optional()
    .describe("CSS/XPath selectors for elements to hide on the page."),
  extract: ExtractFields.optional(),
});

const Cookie = z.object({
  name: z.string().describe("Cookie name."),
  value: z.string().describe("Cookie value."),
});

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "scraper_scrape",
    {
      title: "Web Scraper (Static HTML)",
      description:
        "Scrape a server-rendered page without a browser (POST /v1.0/scraping, jsEnabled omitted). " +
        "Cheaper than JS rendering — start here and switch to 'scraper_scrape_js' only if the response is an empty shell. " +
        "Empty instructions return the full page. Prefer an extract step so the client gets named fields instead of the whole document. " +
        "Each instruction must set exactly one of: extract, postForm, getForm, getPage. " +
        "Success is an extractedData object; extract keys become its fields (string, string array, or omitted). " +
        "A target URL that is not HTTP 200, or a bad CSS/XPath selector, comes back as 400. " +
        "Full-page HTML can be large — pass text=true to shrink it.",
      inputSchema: z.object({
        url: z.string().describe(URL_DESC),
        text: z.boolean().optional().describe(TEXT_DESC),
        proxy: z.union([z.boolean(), z.string()]).optional().describe(PROXY_DESC),
        instructions: z
          .array(StaticInstruction)
          .default([])
          .describe(
            "Ordered static steps. Empty array returns the full page. Example: [{\"extract\":{\"title\":\"h1\",\"links\":\"a\"}}]",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ url, text, proxy, instructions }) => {
      const data = await callApi(
        ENDPOINTS.SCRAPING,
        apiKey,
        scrapeQuery({ url, text, proxy }),
        { instructions: instructions.map(compactRecord) },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "scraper_scrape_js",
    {
      title: "Web Scraper (JavaScript Rendering)",
      description:
        "Scrape a page in a real browser (POST /v1.0/scraping, jsEnabled=true): run JavaScript, fill/click/wait, handle tabs and iframes, and optionally solve CAPTCHAs. " +
        "Use 'scraper_scrape' first for static HTML — this mode costs more. " +
        "Each instruction must set exactly one action (fill, click, clickIfExist, enter, wait, waitFor, select, clickButtonByValue, jsExe, newTab, moveToRelativeTab, switchToIframe, switchToParentFrame, blockElement, extract, screenshot, saveimage, generalImageCaptcha, fillImageCaptcha, resolveAudioCaptcha, or conditionalCheck). " +
        "Selectors are CSS or XPath. Success is extractedData; extract keys become its fields (string, string array, or omitted). " +
        "sslIgnore, windowSize, adBlock, cookies, and blockUrl only apply in this mode. " +
        "CAPTCHA steps require captcha=true (400 if those steps are sent without it); this tool sets that when those steps are present. " +
        "A target URL that is not HTTP 200, or a bad selector, comes back as 400.",
      inputSchema: z.object({
        url: z.string().describe(URL_DESC),
        text: z.boolean().optional().describe(TEXT_DESC),
        proxy: z.union([z.boolean(), z.string()]).optional().describe(PROXY_DESC),
        ssl_ignore: z
          .boolean()
          .optional()
          .describe("Ignore SSL certificate errors on the target site."),
        window_size: z
          .string()
          .optional()
          .describe(
            "Browser viewport as width/height, e.g. '1920,1080'. Only used in this JS mode.",
          ),
        ad_block: z
          .boolean()
          .optional()
          .describe("Block ads and trackers during page load."),
        captcha: z
          .boolean()
          .optional()
          .describe(
            "Allow CAPTCHA-solving instructions. Set automatically when those steps are present.",
          ),
        block_url: z
          .array(z.string())
          .optional()
          .describe("Script or URL patterns to block during page load."),
        cookies: z
          .array(Cookie)
          .optional()
          .describe("Cookies to set on the browser session before running instructions."),
        instructions: z
          .array(JsInstruction)
          .default([])
          .describe(
            "Ordered browser steps. Empty array returns the rendered page. Example: [{\"fill\":{\"place\":\"#q\",\"value\":\"weather\"}},{\"click\":\"button[type=submit]\"},{\"wait\":1000},{\"extract\":{\"results\":\".result\"}}]",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({
      url,
      text,
      proxy,
      ssl_ignore,
      window_size,
      ad_block,
      captcha,
      block_url,
      cookies,
      instructions,
    }) => {
      const steps = instructions.map(compactRecord);
      const data = await callApi(
        ENDPOINTS.SCRAPING,
        apiKey,
        scrapeQuery({
          url,
          text,
          proxy,
          jsEnabled: true,
          sslIgnore: ssl_ignore,
          windowSize: window_size,
          adBlock: ad_block,
          captcha:
            captcha === true || steps.some(instructionHasCaptcha)
              ? true
              : captcha,
        }),
        scrapeJsBody(steps, block_url, cookies),
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}

function scrapeQuery(input: {
  url: string;
  text?: boolean;
  proxy?: boolean | string;
  jsEnabled?: boolean;
  sslIgnore?: boolean;
  windowSize?: string;
  adBlock?: boolean;
  captcha?: boolean;
}): Params {
  const params: Params = { url: input.url };
  if (input.text !== undefined) params["text"] = input.text;
  if (input.proxy !== undefined) params["proxy"] = input.proxy;
  if (input.jsEnabled !== undefined) params["jsEnabled"] = input.jsEnabled;
  if (input.sslIgnore !== undefined) params["sslIgnore"] = input.sslIgnore;
  if (input.windowSize !== undefined) params["windowSize"] = input.windowSize;
  if (input.adBlock !== undefined) params["adBlock"] = input.adBlock;
  if (input.captcha !== undefined) params["captcha"] = input.captcha;
  return params;
}

function scrapeJsBody(
  instructions: Array<Body>,
  blockUrl: Array<string> | undefined,
  cookies: Array<{ name: string; value: string }> | undefined,
): Body {
  const body: Body = { instructions };
  if (blockUrl !== undefined) body["blockUrl"] = blockUrl;
  if (cookies !== undefined) body["cookies"] = cookies;
  return body;
}

function instructionHasCaptcha(step: Body): boolean {
  return (
    step["generalImageCaptcha"] !== undefined ||
    step["fillImageCaptcha"] !== undefined ||
    step["resolveAudioCaptcha"] !== undefined
  );
}

function compactRecord(input: object): Body {
  const out: Body = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}
