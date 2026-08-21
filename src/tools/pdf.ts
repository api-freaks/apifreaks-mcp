import { createReadStream, openAsBlob } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ENDPOINTS } from "../endpoints.js";
import { callApi } from "../client.js";
import {
  PdfCompressionLevel,
  PdfImageFormat,
  PdfRotateAngle,
} from "../enums.js";
import { DESTRUCTIVE, READ_ONLY, WRITE, type Params } from "../constants.js";

const ABS_PATH_DESC =
  "Absolute filesystem path on this machine (e.g. '/home/you/docs/invoice.pdf'). " +
  "Relative paths are rejected. This only works when the MCP server can read the local disk (stdio).";
const FILE_ID_DESC =
  "ID of a PDF already stored on APIFreaks (from a previous job's inputIds/outputIds, pdf_files, the dashboard, pdf_upload, or pdf_upload_binary).";
const DONT_UPLOAD_FIRST_DESC =
  "Do not call pdf_upload or pdf_upload_binary first unless the user explicitly asked to upload first. ";
const PATH_ARG_DESC =
  "Local PDF on disk. Use this for a one-off job — this tool uploads the file. " +
  DONT_UPLOAD_FIRST_DESC +
  ABS_PATH_DESC;
const FILE_ID_ARG_DESC =
  "Use when the user gave this stored file ID and asked you to use it, " +
  "or after they explicitly asked you to upload first (pdf_upload or pdf_upload_binary). " +
  "Do not call pdf_upload or pdf_upload_binary just to fill this. " +
  FILE_ID_DESC;
const FILE_FLOW_DESC =
  "File input: local PDF on this machine → pass 'path' (or 'paths' on merge). This job uploads it. " +
  DONT_UPLOAD_FIRST_DESC +
  "Pass 'file_id' (or 'file_ids') only if the user provided those IDs and told you to use them, " +
  "or after they explicitly told you to upload first with pdf_upload or pdf_upload_binary. " +
  "Do not invent a file_id. Need a path or a file_id. ";
const DESTROY_DESC =
  "If true, delete the input file(s) on APIFreaks immediately after the output is generated. inputIds are then omitted.";
const OUTPUT_DESC =
  "Output file base name without extension. The API assigns a default if omitted.";
const PAGES_SPLIT_DESC =
  "Where to cut. Each string is one output file: pages/ranges in any order, comma-separated " +
  "(e.g. '1-4,9-5,16-last'), or one keyword. 'all' (default) = one file per page; " +
  "'even' / 'odd' = split on those pages and must be used alone; " +
  "'last' may mix with numbers/ranges ('5-last', '1,last-2'). '1,odd' is invalid. " +
  "Pass several strings for several output files.";
const PAGES_EXTRACT_DESC =
  "Required. Pages/ranges in any order, comma-separated (e.g. '1-4,9-5,16-last'), or one keyword. " +
  "'all' = every page as its own file; 'even' / 'odd' = those pages and must be used alone; " +
  "'last' may mix with numbers/ranges ('5-last', '1,last-2'). '2,even' is invalid.";
const PAGES_REMOVE_DESC =
  "Required. Pages and ascending ranges, comma-separated, any order (e.g. '1,3-5,7'). Reverse ranges like '5-3' are rejected. " +
  "'even' / 'odd' must be used alone; 'last' may mix with numbers/ranges ('5-last', '1,last'). " +
  "'all' is not supported. '1,even' is invalid.";
const PAGES_ROTATE_DESC =
  "Optional, default 'all'. Pages and ascending ranges, comma-separated, any order (e.g. '1,3-5,7'). " +
  "'all' = every page; 'even' / 'odd' must be used alone; 'last' may mix with numbers/ranges ('5-last', '1,last'). " +
  "'1,odd' is invalid.";
const PAGES_IMAGE_DESC =
  "Optional, default 'all'. Pages/ranges, comma-separated (e.g. '1,3-5,7' or '1,4-2,last'). " +
  "Duplicates are dropped; original order is kept. Keywords used alone: 'even', 'odd', 'last' (last page only), 'all'. " +
  "Do not mix even/odd/all with page numbers ('1,odd' is invalid).";
const JOB_ASYNC_DESC =
  "Starts one background job and returns JSON with 'taskId' (and 'inputIds' unless destroy is true). " +
  "This tool does not wait and does not poll. " +
  "After it returns, ask whether to check that one taskId with 'pdf_task_status'. Large files can take a long time.";
const PASSWORD_DESC =
  "Password, 6–128 characters. For an already-protected input, prefer the owner password over the user password.";
const RESTRICTIONS_DESC =
  "Comma-separated restrictions (what the user may not do): print_high, print_low, edit_document_assembly, " +
  "fill_form_fields, edit_annotations, modify_content, copy_and_extract_content, use_accessibility.";

const IMAGE_ENDPOINTS: Record<z.infer<typeof PdfImageFormat>, string> = {
  png: ENDPOINTS.PDF_PNG,
  jpg: ENDPOINTS.PDF_JPG,
  tif: ENDPOINTS.PDF_TIF,
  bmp: ENDPOINTS.PDF_BMP,
  gif: ENDPOINTS.PDF_GIF,
};

export function register(server: McpServer, apiKey: string): void {
  server.registerTool(
    "pdf_merge",
    {
      title: "Merge PDFs",
      description:
        "Merge PDF files into one, in the order given. Total upload payload up to 1GB. " +
        FILE_FLOW_DESC +
        JOB_ASYNC_DESC,
      inputSchema: z.object({
        paths: z
          .array(z.string())
          .optional()
          .describe(
            "Local PDFs on disk, in merge order. This job uploads them. " +
              DONT_UPLOAD_FIRST_DESC +
              ABS_PATH_DESC,
          ),
        file_ids: z
          .array(z.string())
          .optional()
          .describe(
            "Stored file IDs, in merge order. Only if the user gave them and asked you to use them. " +
              FILE_ID_ARG_DESC,
          ),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({ paths, file_ids, output, destroy }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_MERGE, apiKey, {
          paths,
          fileIds: file_ids,
          minFiles: 1,
          params: jobParams({ output, destroy, fileIds: file_ids }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_split",
    {
      title: "Split PDF",
      description:
        "Split a PDF into smaller files by page numbers or ranges. " +
        FILE_FLOW_DESC +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        pages: z.array(z.string()).optional().describe(PAGES_SPLIT_DESC),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({ path: filePath, file_id, pages, output, destroy }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_SPLIT, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({
            output,
            destroy,
            fileIds: file_id,
            extra: { pages },
          }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_extract_pages",
    {
      title: "Extract PDF Pages",
      description:
        "Extract pages into a new PDF (or one PDF per page as a ZIP when separated is true). " +
        FILE_FLOW_DESC +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        pages: z.string().describe(PAGES_EXTRACT_DESC),
        separated: z
          .boolean()
          .optional()
          .describe(
            "If true, each extracted page is a separate PDF in a ZIP. Default false: one PDF.",
          ),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({ path: filePath, file_id, pages, separated, output, destroy }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_EXTRACT_PAGES, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({
            output,
            destroy,
            fileIds: file_id,
            extra: { pages, separated },
          }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_remove_pages",
    {
      title: "Remove PDF Pages",
      description:
        "Remove pages from a PDF. " + FILE_FLOW_DESC + JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        pages: z.string().describe(PAGES_REMOVE_DESC),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({ path: filePath, file_id, pages, output, destroy }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_REMOVE_PAGES, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({
            output,
            destroy,
            fileIds: file_id,
            extra: { pages },
          }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_to_image",
    {
      title: "PDF to Image",
      description:
        "Convert PDF pages to PNG, JPG, TIFF, BMP, or GIF (ZIP of images). " +
        FILE_FLOW_DESC +
        "Resolution 20–1200 DPI. Large or high-DPI jobs take longer. " +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        format: PdfImageFormat.describe(
          "Image format: png, jpg, tif, bmp, or gif. Each format has its own API path.",
        ),
        pages: z.string().optional().describe(PAGES_IMAGE_DESC),
        resolution: z
          .number()
          .int()
          .min(20)
          .max(1200)
          .optional()
          .describe("DPI (20–1200). Default 150, or 100 for gif."),
        image_smoothing: z
          .string()
          .optional()
          .describe(
            "Anti-aliasing: 'none', 'all', or a comma-separated mix of 'text', 'line', 'image'. Default none.",
          ),
        profile: z
          .string()
          .optional()
          .describe(
            "Color profile. PNG/BMP/GIF: bw, gray, rgb, rgba, 4-bit, 8-bit. " +
              "JPG: gray, rgb, cmyk. TIF: bw, gray, rgb, rgba, cmyk. Default rgb.",
          ),
        quality: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe(
            "JPG only (format='jpg'). Compression 1–100, default 70. Do not set this for png, tif, bmp, or gif.",
          ),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({
      path: filePath,
      file_id,
      format,
      pages,
      resolution,
      image_smoothing,
      profile,
      quality,
      output,
      destroy,
    }) => {
      const extra: Params = {};
      if (pages !== undefined) extra["pages"] = pages;
      if (resolution !== undefined) extra["resolution"] = resolution;
      if (image_smoothing !== undefined)
        extra["image_smoothing"] = image_smoothing;
      if (profile !== undefined) extra["profile"] = profile;
      if (quality !== undefined && format === "jpg") extra["quality"] = quality;
      return jsonResult(
        await runPdfJob(IMAGE_ENDPOINTS[format], apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({ output, destroy, fileIds: file_id, extra }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_generate",
    {
      title: "Generate PDF from Template",
      description:
        "Render an APIFreaks PDF template and return a hosted 'pdf_url' plus created_at and expiration_time. " +
        "This call is synchronous (no taskId). Provide JSON 'data' or a 'data_url' (one is required). " +
        "template_id comes from the PDF Template Builder. Pin 'version' (must start with v, e.g. v2) so later edits " +
        "do not change production output; omit version to use latest. Generation can take up to 100 seconds.",
      inputSchema: z.object({
        template_id: z
          .string()
          .describe(
            "Template ID from the APIFreaks PDF Template Builder dashboard.",
          ),
        version: z
          .string()
          .optional()
          .describe(
            "Template version starting with 'v' (e.g. 'v2'). Omit for latest. The literal 'latest' is rejected.",
          ),
        data_url: z
          .string()
          .optional()
          .describe("HTTPS URL the API fetches JSON from instead of 'data'."),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            "JSON object whose keys match fields bound in the template. Required unless data_url is set.",
          ),
      }),
      annotations: WRITE,
    },
    async ({ template_id, version, data_url, data }) => {
      if (data === undefined && data_url === undefined) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "Provide 'data' (JSON object) or 'data_url'.",
        );
      }
      const params: Params = { template_id };
      if (version !== undefined) params["version"] = version;
      if (data_url !== undefined) params["data_url"] = data_url;
      const result = await callApi(
        ENDPOINTS.PDF_GENERATE,
        apiKey,
        params,
        data,
        "POST",
      );
      return jsonResult(result);
    },
  );

  server.registerTool(
    "pdf_generate_bulk",
    {
      title: "Bulk Generate PDFs from CSV",
      description:
        "Render one PDF per CSV row against a template. Returns an array of results with 'pdf_url' per row; " +
        "one row failing does not stop the rest. Synchronous (no taskId). CSV path must be absolute. " +
        "CSV must be 10 MB or smaller. Can take up to 100 seconds.",
      inputSchema: z.object({
        template_id: z
          .string()
          .describe(
            "Template ID from the APIFreaks PDF Template Builder dashboard.",
          ),
        path: z
          .string()
          .describe("Absolute path to a CSV file. " + ABS_PATH_DESC),
        version: z
          .string()
          .optional()
          .describe(
            "Template version starting with 'v' (e.g. 'v2'). Omit for latest.",
          ),
      }),
      annotations: WRITE,
    },
    async ({ template_id, path: csvPath, version }) => {
      const params: Params = { template_id };
      if (version !== undefined) params["version"] = version;
      const form = await filesToFormData([csvPath], "text/csv");
      return jsonResult(
        await callApi(
          ENDPOINTS.PDF_GENERATE_BULK,
          apiKey,
          params,
          form,
          "POST",
        ),
      );
    },
  );

  server.registerTool(
    "pdf_compress",
    {
      title: "Compress PDF",
      description:
        "Reduce PDF file size. compression_level is required: low, balanced, high, or extreme. " +
        FILE_FLOW_DESC +
        "Extreme on a large file can take a long time. " +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        compression_level: PdfCompressionLevel.describe(
          "How hard to compress: low (keep quality), balanced, high, extreme (smallest).",
        ),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({ path: filePath, file_id, compression_level, output, destroy }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_COMPRESS, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({
            output,
            destroy,
            fileIds: file_id,
            extra: { compression_level },
          }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_rotate",
    {
      title: "Rotate PDF Pages",
      description:
        "Rotate pages clockwise by 0, 90, 180, 270, or the negative of those. " +
        FILE_FLOW_DESC +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        rotate: PdfRotateAngle.describe(
          "Clockwise angle in degrees: 0, 90, 180, 270, -90, -180, or -270.",
        ),
        pages: z.string().optional().describe(PAGES_ROTATE_DESC),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({ path: filePath, file_id, rotate, pages, output, destroy }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_ROTATE, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({
            output,
            destroy,
            fileIds: file_id,
            extra: { rotate, pages },
          }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_encrypt",
    {
      title: "Encrypt PDF",
      description:
        "Password-protect a PDF (AES-256). user_password is required to open the file. " +
        FILE_FLOW_DESC +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        user_password: z
          .string()
          .describe("Password required to open the PDF. " + PASSWORD_DESC),
        owner_password: z
          .string()
          .optional()
          .describe(
            "Full-access password. If omitted, user_password is also used as the owner password. " +
              PASSWORD_DESC,
          ),
        file_password: z
          .string()
          .optional()
          .describe(
            "Password if the input PDF is already protected. " + PASSWORD_DESC,
          ),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({
      path: filePath,
      file_id,
      user_password,
      owner_password,
      file_password,
      output,
      destroy,
    }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_ENCRYPT, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({
            output,
            destroy,
            fileIds: file_id,
            extra: { user_password, owner_password, file_password },
          }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_restrict",
    {
      title: "Restrict PDF Permissions",
      description:
        "Apply permission restrictions (print, copy, edit, …). user_password and restrictions are required. " +
        FILE_FLOW_DESC +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        user_password: z
          .string()
          .describe("Password to open the PDF. " + PASSWORD_DESC),
        restrictions: z.string().describe(RESTRICTIONS_DESC),
        owner_password: z
          .string()
          .optional()
          .describe(
            "Password that can remove restrictions. Defaults to user_password. " +
              PASSWORD_DESC,
          ),
        file_password: z
          .string()
          .optional()
          .describe(
            "Password if the input PDF is already protected. " + PASSWORD_DESC,
          ),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({
      path: filePath,
      file_id,
      user_password,
      restrictions,
      owner_password,
      file_password,
      output,
      destroy,
    }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_RESTRICT, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({
            output,
            destroy,
            fileIds: file_id,
            extra: {
              user_password,
              restrictions,
              owner_password,
              file_password,
            },
          }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_decrypt",
    {
      title: "Decrypt PDF",
      description:
        "Remove encryption (open password and restrictions). file_password is required. " +
        FILE_FLOW_DESC +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        file_password: z
          .string()
          .describe(
            "Owner or user password of the protected PDF. " + PASSWORD_DESC,
          ),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({ path: filePath, file_id, file_password, output, destroy }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_DECRYPT, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({
            output,
            destroy,
            fileIds: file_id,
            extra: { file_password },
          }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_unrestrict",
    {
      title: "Unrestrict PDF",
      description:
        "Remove usage restrictions while keeping the PDF encrypted. file_password and user_password are required. " +
        FILE_FLOW_DESC +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        file_password: z
          .string()
          .describe("Password to unlock the input. " + PASSWORD_DESC),
        user_password: z
          .string()
          .describe(
            "User password to set on the output. Required by the API. " +
              PASSWORD_DESC,
          ),
        owner_password: z
          .string()
          .optional()
          .describe(
            "Owner password for the output. Defaults to user_password. " +
              PASSWORD_DESC,
          ),
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({
      path: filePath,
      file_id,
      file_password,
      user_password,
      owner_password,
      output,
      destroy,
    }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_UNRESTRICT, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({
            output,
            destroy,
            fileIds: file_id,
            extra: { file_password, user_password, owner_password },
          }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_linearize",
    {
      title: "Linearize PDF",
      description:
        "Restructure a PDF for Fast Web View (byte-range streaming so it can start displaying before the full file downloads). " +
        FILE_FLOW_DESC +
        JOB_ASYNC_DESC,
      inputSchema: singlePdfSchema({
        output: z.string().optional().describe(OUTPUT_DESC),
        destroy: z.boolean().optional().describe(DESTROY_DESC),
      }),
      annotations: WRITE,
    },
    async ({ path: filePath, file_id, output, destroy }) => {
      return jsonResult(
        await runPdfJob(ENDPOINTS.PDF_LINEARIZE, apiKey, {
          paths: filePath ? [filePath] : undefined,
          fileIds: file_id ? [file_id] : undefined,
          maxFiles: 1,
          params: jobParams({ output, destroy, fileIds: file_id }),
        }),
      );
    },
  );

  server.registerTool(
    "pdf_task_status",
    {
      title: "PDF Task Status",
      description:
        "One status check for one async PDF job (the taskId from the job you just started). " +
        "Returns the API JSON (queued, processing, completed, or failed). This tool does not loop. " +
        "Show the JSON. " +
        "If queued or processing, ask the user before calling again. " +
        "If completed, present a clear download list for the user: use every " +
        "https://api.apifreaks.com/v1.0/pdf/resource/download URL in the JSON (outputUrls, zipFileUrl, and any other field). " +
        "Append apiKey=APIFREAKS_API_KEY to each URL (& if the URL already has ?, else ?). " +
        "Label ZIP vs individual files, put each URL on its own line, and tell the user to replace APIFREAKS_API_KEY with their MCP API key. " +
        "If failed, show error and message.",
      inputSchema: z.object({
        task_id: z.string().describe("taskId returned by a PDF job tool."),
      }),
      annotations: READ_ONLY,
    },
    async ({ task_id }) => {
      return jsonResult(
        await callApi(ENDPOINTS.PDF_TASK_STATUS, apiKey, { task_id }),
      );
    },
  );
  server.registerTool(
    "pdf_file_status",
    {
      title: "PDF File Status",
      description:
        "Metadata for one stored file: name, type, size, created/expiry timestamps. " +
        "Stored files last up to 30 days depending on plan, unless destroy was used.",
      inputSchema: z.object({
        file_id: z.string().describe(FILE_ID_DESC),
      }),
      annotations: READ_ONLY,
    },
    async ({ file_id }) => {
      return jsonResult(
        await callApi(ENDPOINTS.PDF_FILE_STATUS, apiKey, { file_id }),
      );
    },
  );

  server.registerTool(
    "pdf_files",
    {
      title: "List PDF Files",
      description:
        "List PDFs uploaded or generated for this API key (file ID and name). " +
        "Organization members cannot call this — only the organization administrator.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      return jsonResult(await callApi(ENDPOINTS.PDF_FILES, apiKey));
    },
  );

  server.registerTool(
    "pdf_file_delete",
    {
      title: "Delete PDF File",
      description:
        "Permanently delete a stored PDF by file_id. The ID cannot be used again.",
      inputSchema: z.object({
        file_id: z.string().describe(FILE_ID_DESC),
      }),
      annotations: DESTRUCTIVE,
    },
    async ({ file_id }) => {
      return jsonResult(
        await callApi(
          ENDPOINTS.PDF_FILE_DELETE,
          apiKey,
          { file_id },
          undefined,
          "DELETE",
        ),
      );
    },
  );

  server.registerTool(
    "pdf_upload",
    {
      title: "Upload PDF",
      description:
        "NOT a first step before split/merge/compress/convert unless the user explicitly asked to upload first. " +
        "Same rule as pdf_upload_binary. Those job tools take 'path' and upload the file themselves. " +
        "Call this when the user wants PDFs stored now so later jobs can pass file_id, or they said to upload first. " +
        "Multipart; one or more local PDFs. Returns JSON with a 'files' array of fileName and fileId. " +
        "For storing one large PDF, prefer 'pdf_upload_binary'.",
      inputSchema: z.object({
        paths: z
          .array(z.string())
          .min(1)
          .describe("Absolute paths to local PDFs. " + ABS_PATH_DESC),
      }),
      annotations: WRITE,
    },
    async ({ paths }) => {
      const form = await filesToFormData(paths, "application/pdf");
      return jsonResult(
        await callApi(ENDPOINTS.PDF_UPLOAD, apiKey, {}, form, "POST"),
      );
    },
  );

  server.registerTool(
    "pdf_upload_binary",
    {
      title: "Upload PDF (binary)",
      description:
        "NOT a first step before a job unless the user explicitly asked to upload first. " +
        "Same rule as pdf_upload: for a one-off, pass 'path' on the job tool. " +
        "Use this only to store one large local PDF as raw bytes for later file_id reuse. " +
        "file_name must end with .pdf. Returns fileName and fileId (not a files array).",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Absolute path to one local PDF. " + ABS_PATH_DESC),
        file_name: z
          .string()
          .optional()
          .describe(
            "Stored name, must end with .pdf (e.g. 'invoice.pdf'). Defaults to the local file's basename if that already ends with .pdf.",
          ),
      }),
      annotations: WRITE,
    },
    async ({ path: filePath, file_name }) => {
      await assertAbsoluteReadableFile(filePath);
      const storedName = pdfUploadFileName(filePath, file_name);
      return jsonResult(
        await callApi(
          ENDPOINTS.PDF_UPLOAD_BINARY,
          apiKey,
          { file_name: storedName },
          createReadStream(filePath),
          "POST",
        ),
      );
    },
  );
}

function singlePdfSchema<T extends z.ZodRawShape>(extra: T) {
  return z.object({
    path: z.string().optional().describe(PATH_ARG_DESC),
    file_id: z.string().optional().describe(FILE_ID_ARG_DESC),
    ...extra,
  });
}

function jsonResult(data: Params) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function jobParams(args: {
  output?: string;
  destroy?: boolean;
  fileIds?: string | Array<string>;
  extra?: Record<string, string | number | boolean | Array<string> | undefined>;
}): Params {
  const params: Params = {};
  if (args.extra) {
    for (const [key, value] of Object.entries(args.extra)) {
      if (value !== undefined) {
        params[key] = value;
      }
    }
  }
  if (args.output !== undefined) params["output"] = args.output;
  if (args.destroy !== undefined) params["destroy"] = args.destroy;
  if (typeof args.fileIds === "string") {
    params["file_id"] = args.fileIds;
  } else if (args.fileIds !== undefined && args.fileIds.length > 0) {
    params["file_id"] = args.fileIds;
  }
  return params;
}

async function runPdfJob(
  endpoint: string,
  apiKey: string,
  args: {
    paths?: Array<string>;
    fileIds?: Array<string>;
    minFiles?: number;
    maxFiles?: number;
    params: Params;
  },
): Promise<Params> {
  const paths = args.paths ?? [];
  const fileIds = args.fileIds ?? [];
  const total = paths.length + fileIds.length;
  const minFiles = args.minFiles ?? 1;
  if (total < minFiles) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Provide at least ${minFiles} PDF via 'path'/'paths' and/or 'file_id'/'file_ids'.`,
    );
  }
  if (args.maxFiles !== undefined && total > args.maxFiles) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `This operation accepts at most ${args.maxFiles} PDF (local path and/or file_id).`,
    );
  }
  if (paths.length === 0) {
    return callApi(endpoint, apiKey, args.params, undefined, "POST");
  }
  const form = await filesToFormData(paths, "application/pdf");
  return callApi(endpoint, apiKey, args.params, form, "POST");
}

async function filesToFormData(
  filePaths: Array<string>,
  mimeType: string,
): Promise<FormData> {
  const form = new FormData();
  for (const filePath of filePaths) {
    await assertAbsoluteReadableFile(filePath);
    const blob = await openAsBlob(filePath, { type: mimeType });
    form.append("file", blob, path.basename(filePath));
  }
  return form;
}

function pdfUploadFileName(filePath: string, fileName?: string): string {
  const name = (fileName ?? path.basename(filePath)).trim();
  if (!name.toLowerCase().endsWith(".pdf")) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "file_name must end with .pdf (e.g. 'document.pdf').",
    );
  }
  return name;
}

async function assertAbsoluteReadableFile(filePath: string): Promise<void> {
  const trimmed = filePath.trim();
  if (!trimmed) {
    throw new McpError(ErrorCode.InvalidRequest, "File path is empty.");
  }
  if (!path.isAbsolute(trimmed)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Path must be absolute, got '${filePath}'. Example: '/home/you/docs/file.pdf'.`,
    );
  }
  let info;
  try {
    info = await stat(trimmed);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new McpError(ErrorCode.InvalidRequest, `No file at '${trimmed}'.`);
    }
    if (code === "EACCES") {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Permission denied reading '${trimmed}'.`,
      );
    }
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Cannot read '${trimmed}': ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (info.isDirectory()) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `'${trimmed}' is a directory, not a file.`,
    );
  }
  if (!info.isFile()) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `'${trimmed}' is not a regular file.`,
    );
  }
}
