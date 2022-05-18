import { Stats } from "fs";
import * as fs from "fs/promises";
import { StaticResponse } from ".";

const MIME_TYPES: Record<string, string> = {
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

const mime = (basename: string) => {
  const extension = basename
    .substring(basename.lastIndexOf(".") + 1)
    .toLowerCase();
  return MIME_TYPES[extension] ?? "application/octet-stream";
};

export const fileResponse =
  (filename: string, stat?: Stats, status: 200 | 404 | 500 = 200) =>
  async (): Promise<StaticResponse> => {
    if (!stat) {
      stat = await fs.stat(filename);
    }
    const content = await fs.readFile(filename);
    const contentType = mime(filename);
    const contentLength = stat.size;
    return { status, contentType, contentLength, content };
  };

const CHARSET = "utf-8";
export const contentResponse =
  (content: string, contentType: string, status: 200 | 404 | 500 = 200) =>
  async (): Promise<StaticResponse> => {
    const contentBuffer = Buffer.from(content, CHARSET);
    return {
      content: contentBuffer,
      contentType: contentType.split(";")[0] + "; charset=" + CHARSET,
      status,
      contentLength: contentBuffer.length,
    };
  };
