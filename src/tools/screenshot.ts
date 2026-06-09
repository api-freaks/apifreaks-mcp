import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import {
  ScreenshotFileType,
  ScrollingFileType,
  ScrollSpeed,
  WaitForEvent,
} from "../enums.js";
import { READ_ONLY, type Params } from "../constants.js";

const URL_DESC =
  "Full URL of the webpage to screenshot (e.g. 'https://example.com').";
const WIDTH_DESC =
  "Viewport width in pixels (default 1680, max 7680). Use to simulate specific device widths (e.g. 375 for iPhone, 768 for tablet).";
const HEIGHT_DESC = "Viewport height in pixels (default 867, max 4320).";
const NO_COOKIE_DESC =
  "Block cookie consent banners before rendering for a clean, overlay-free screenshot.";
const BLOCK_ADS_DESC = "Block advertisements before rendering.";
const DARK_MODE_DESC =
  "Enable dark mode for websites that support it via CSS prefers-color-scheme.";
const DELAY_DESC =
  "Delay in milliseconds before rendering begins. Useful to let animations finish or dynamic content settle after page load.";
const LAZY_LOAD_DESC =
  "If true, automatically scrolls the page before rendering to trigger lazy-loaded images and off-screen content.";
const WAIT_EVENT_DESC =
  "'load' (default) — fires when the page load event completes. 'domcontentloaded' — fires earlier, before images/stylesheets finish. 'networkidle' — waits for all network activity to stop (slowest but most complete — good for heavy SPAs).";
const SELECTOR_DESC =
  "CSS selector to capture only a specific element on the page (e.g. '#hero', '.pricing-table'). Falls back to full-page capture if the selector is not found.";
const REMOVE_SELECTOR_DESC =
  "CSS selector(s) for elements to remove from the page before rendering (e.g. '.cookie-bar, #live-chat'). Multiple selectors separated by commas.";
const IMAGE_QUALITY_DESC =
  "JPEG compression quality from 0 (smallest file) to 100 (best quality), default 80. Only applies when file_type is JPG — ignored for PNG, WebP, and PDF.";
const FULL_PAGE_DESC =
  "If true, captures the entire scrollable page height — not just the visible viewport. Ideal for long landing pages, documentation, or blog posts.";
const FILE_TYPE_STATIC_DESC =
  "Output image format. PNG (default) — lossless with transparency support. JPG — smaller file size, lossy. WebP — modern format, good compression. PDF — renders the page as a PDF document.";
const EXTRACT_HTML_DESC =
  "If true, the response includes a URL to the raw HTML source of the page as a .html file. ⚠️ Token usage warning: downloading and reading that file can significantly increase token consumption — only enable if the user explicitly needs the HTML source.";
const EXTRACT_TEXT_DESC =
  "If true, the response includes a URL to the plain-text content of the page as a .txt file. ⚠️ Token usage warning: reading that content will increase token usage — only enable if the user explicitly needs the extracted text.";

const ScreenshotRequestSchema = z.object({
  url: z.string().describe(URL_DESC),
  file_type: ScreenshotFileType.optional().describe(FILE_TYPE_STATIC_DESC),
  image_quality: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe(IMAGE_QUALITY_DESC),
  width: z.number().int().min(1).max(7680).optional().describe(WIDTH_DESC),
  height: z.number().int().min(1).max(4320).optional().describe(HEIGHT_DESC),
  full_page: z.boolean().optional().describe(FULL_PAGE_DESC),
  selector: z.string().optional().describe(SELECTOR_DESC),
  remove_selector: z.string().optional().describe(REMOVE_SELECTOR_DESC),
  no_cookie_banners: z.boolean().optional().describe(NO_COOKIE_DESC),
  block_ads: z.boolean().optional().describe(BLOCK_ADS_DESC),
  dark_mode: z.boolean().optional().describe(DARK_MODE_DESC),
  delay: z.number().int().min(0).default(0).describe(DELAY_DESC),
  lazy_load: z.boolean().default(false).describe(LAZY_LOAD_DESC),
  wait_for_event: WaitForEvent.default("load").describe(WAIT_EVENT_DESC),
  extract_html: z.boolean().default(false).describe(EXTRACT_HTML_DESC),
  extract_text: z.boolean().default(false).describe(EXTRACT_TEXT_DESC),
  scrolling_screenshot: z
    .boolean()
    .optional()
    .describe(
      "Set to true to record a scrolling video for this URL instead of a static screenshot.",
    ),
  scroll_speed: ScrollSpeed.optional().describe(
    "Scroll speed: 'fast', 'normal', or 'slow'. Only used when scrolling_screenshot is true.",
  ),
  duration: z
    .number()
    .int()
    .min(0)
    .max(60)
    .optional()
    .describe(
      "Scrolling duration in seconds (0–60). Only used when scrolling_screenshot is true.",
    ),
  scroll_back: z
    .boolean()
    .optional()
    .describe(
      "Scroll to bottom then back to top. Only used when scrolling_screenshot is true.",
    ),
});

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "screenshot_capture",
    {
      title: "Screenshot Capture",
      description:
        "Capture a static screenshot of a webpage and return a JSON response containing the " +
        "screenshot URL which can be downloaded or shared directly. " +
        "**Always ask the user before calling this tool:**\n" +
        "- Full page or just the visible viewport?\n" +
        "- Specific element, or the whole page? " +
        "(If a specific element is needed, help identify the CSS selector via web_fetch on the target URL first.)\n" +
        "- Image format: PNG, JPG, WebP, or PDF?\n" +
        "- Should ads or cookie banners be blocked for a cleaner result?\n" +
        "- Any viewport size / device to simulate?\n\n" +
        "Use `screenshot_capture_scrolling` instead when the user wants a scrolling video/GIF of the page.",
      inputSchema: z.object({
        url: z.string().describe(URL_DESC),
        full_page: z.boolean().optional().describe(FULL_PAGE_DESC),
        file_type: ScreenshotFileType.default("PNG").describe(
          FILE_TYPE_STATIC_DESC,
        ),
        image_quality: z
          .number()
          .int()
          .min(0)
          .max(100)
          .default(80)
          .describe(IMAGE_QUALITY_DESC),
        width: z
          .number()
          .int()
          .min(1)
          .max(7680)
          .default(1680)
          .describe(WIDTH_DESC),
        height: z
          .number()
          .int()
          .min(1)
          .max(4320)
          .default(867)
          .describe(HEIGHT_DESC),
        selector: z.string().optional().describe(SELECTOR_DESC),
        remove_selector: z.string().optional().describe(REMOVE_SELECTOR_DESC),
        no_cookie_banners: z.boolean().default(false).describe(NO_COOKIE_DESC),
        block_ads: z.boolean().default(false).describe(BLOCK_ADS_DESC),
        dark_mode: z.boolean().default(false).describe(DARK_MODE_DESC),
        delay: z.number().int().min(0).default(0).describe(DELAY_DESC),
        lazy_load: z.boolean().default(false).describe(LAZY_LOAD_DESC),
        wait_for_event: WaitForEvent.default("load").describe(WAIT_EVENT_DESC),
        extract_html: z.boolean().default(false).describe(EXTRACT_HTML_DESC),
        extract_text: z.boolean().default(false).describe(EXTRACT_TEXT_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({
      url,
      full_page,
      file_type,
      image_quality,
      width,
      height,
      selector,
      remove_selector,
      no_cookie_banners,
      block_ads,
      dark_mode,
      delay,
      lazy_load,
      wait_for_event,
      extract_html,
      extract_text,
    }) => {
      const params: Params = {
        url,
        output: "json",
        file_type,
        image_quality,
        width,
        height,
        no_cookie_banners,
        block_ads,
        dark_mode,
        delay,
        lazy_load,
        wait_for_event,
        extract_html,
        extract_text,
      };
      if (full_page !== undefined) params["full_page"] = full_page;
      if (selector !== undefined) params["selector"] = selector;
      if (remove_selector !== undefined)
        params["remove_selector"] = remove_selector;
      const data = await callApi(ENDPOINTS.SCREENSHOT, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "screenshot_capture_scrolling",
    {
      title: "Screenshot Capture Scrolling",
      description:
        "Record a scrolling video or animated GIF of a webpage and return a JSON response " +
        "containing the video download URL. " +
        "**Always ask the user before calling this tool:**\n" +
        "- What format? MP4 (default, best compatibility), WebM (smaller), or GIF (looping animation)?\n" +
        "- How long should it scroll — how many seconds (up to 60)?\n" +
        "- Scroll speed: slow, normal, or fast?\n" +
        "- Should it scroll back to the top after reaching the bottom (great for looping GIFs)?\n" +
        "- Any specific viewport size to simulate?\n\n" +
        "Use `screenshot_capture` instead for static screenshots (PNG, JPG, PDF).",
      inputSchema: z.object({
        url: z.string().describe(URL_DESC),
        file_type: ScrollingFileType.default("MP4").describe(
          "Output video format: MP4 (default, broadest compatibility), WEBM (smaller size), or GIF (looping animation).",
        ),
        scroll_speed: ScrollSpeed.default("normal").describe(
          "Scroll speed: 'fast', 'normal' (default), or 'slow'.",
        ),
        duration: z
          .number()
          .int()
          .min(0)
          .max(60)
          .optional()
          .describe(
            "How many seconds the scrolling should last (0–60). If left unset, it will take however long it takes to scroll the website.",
          ),
        scroll_back: z
          .boolean()
          .default(false)
          .describe(
            "If true, the page scrolls to the bottom then back to the top. Ideal for looping GIFs.",
          ),
        width: z
          .number()
          .int()
          .min(1)
          .max(7680)
          .default(1680)
          .describe(WIDTH_DESC),
        height: z
          .number()
          .int()
          .min(1)
          .max(4320)
          .default(867)
          .describe(HEIGHT_DESC),
        no_cookie_banners: z.boolean().default(false).describe(NO_COOKIE_DESC),
        block_ads: z.boolean().default(false).describe(BLOCK_ADS_DESC),
        dark_mode: z.boolean().default(false).describe(DARK_MODE_DESC),
        delay: z.number().int().min(0).default(0).describe(DELAY_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({
      url,
      file_type,
      scroll_speed,
      duration,
      scroll_back,
      width,
      height,
      no_cookie_banners,
      block_ads,
      dark_mode,
      delay,
    }) => {
      const params: Params = {
        url,
        output: "json",
        scrolling_screenshot: true,
        file_type,
        scroll_speed,
        scroll_back,
        width,
        height,
        no_cookie_banners,
        block_ads,
        dark_mode,
        delay,
      };
      if (duration !== undefined) params["duration"] = duration;
      const data = await callApi(ENDPOINTS.SCREENSHOT, apiKey, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  server.registerTool(
    "screenshot_bulk_capture",
    {
      title: "Bulk Screenshot Capture",
      description:
        "Capture screenshots of up to 50 webpages in a single request. " +
        "Returns a JSON response with per-URL results — each entry includes the screenshot download URL, " +
        "fulfillment status, and any error message.\n\n" +
        "If any URL needs a specific element targeted via CSS selector, " +
        "use web_fetch on that page first to identify the correct selector before calling this tool.\n\n" +
        "Note: `multiple_scrolling` is NOT supported in bulk mode — " +
        "for scrolling video captures prefer `screenshot_capture_scrolling` per URL instead.",
      inputSchema: z.object({
        urls: z
          .array(ScreenshotRequestSchema)
          .max(50)
          .describe(
            "List of screenshot config objects (max 50). Each object must include 'url'. All other fields are optional.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async ({ urls }) => {
      const sanitized = urls.map((req) => {
        const entry: Record<string, unknown> = { output: "json" };
        for (const [k, v] of Object.entries(req)) {
          if (v !== undefined && v !== null) entry[k] = v;
        }
        return entry;
      });
      const data = await callApi(
        ENDPOINTS.SCREENSHOT,
        apiKey,
        {},
        { urls: sanitized },
        "POST",
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );
}
