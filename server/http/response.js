import { Stats } from "fs";
import * as fs from "fs/promises";

const MIME_TYPES = {
  js: "text/javascript",
  json: "text/javascript",
  css: "text/css",
  html: "text/html",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  eot: "application/vnd.ms-fontobject",
  ttf: "application/font-ttf",
  woff: "application/font-woff",
  woff2: "application/font-woff2",
};

const mime = (/** @type string */ basename) => {
  const extension = basename.substr(basename.lastIndexOf(".") + 1);
  return MIME_TYPES[extension] ?? "application/octet-stream";
};

/**
 * @param {string} filename
 * @param {Stats=} stat
 * @param {200|404|500} status
 * @returns StaticResponse
 */
export const fileResponse =
  (filename, stat, status = 200) =>
  async () => {
    if (!stat) {
      stat = await fs.stat(filename);
    }
    const content = await fs.readFile(filename);
    const contentType = mime(filename);
    const contentLength = stat.size;
    return { status, contentType, contentLength, content };
  };

/**
 * @param {string} content
 * @param {string} contentType
 * @param {200|404|500} status
 * @returns import("./index.js").StaticMiddleware
 */
export const contentResponse =
  (content, contentType, status = 200) =>
  async () => {
    const contentBuffer = Buffer.from(content, "utf-8");
    return {
      content: contentBuffer,
      contentType,
      status,
      contentLength: contentBuffer.length,
    };
  };
