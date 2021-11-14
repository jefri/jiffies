#!/usr/bin/env node
import { createServer, IncomingMessage, ServerResponse } from "http";
import * as path from "path";
import * as fs from "fs/promises";
import { parse } from "../../jiffies/flags.js";
import { sitemap } from "./sitemap.js";
import { compile } from "./typescript.js";

const FLAGS = parse(process.argv);

/**
 * @typedef {import('fs').Stats} Stats
 * @typedef {{status: 200|404|500, content: string, contentType: string, contentLength?: number}} StaticResponse
 * @typedef {(req: IncomingMessage) => (() => Promise<StaticResponse>)|undefined} StaticMiddleware
 */

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
    const content = (await fs.readFile(filename)).toString("utf-8");
    const contentType = mime(filename);
    const contentLength = stat.size;
    return {
      status,
      contentType,
      contentLength,
      content,
    };
  };

/**
 * @param {string} content
 * @param {string} contentType
 * @param {200|404|500} status
 * @returns StaticResponse
 */
export const contentResponse =
  (content, contentType, status = 200) =>
  async () => ({ content, contentType, status, contentLength: content.length });

/**
 * If path matches a file exactly, serve it. Valid mime types are .html, .js, .css, and images.
 * @type StaticMiddleware
 */
const staticFileServer = async (req) => {
  const filename = path.join(process.cwd(), req.url ?? "");
  try {
    const stat = await fs.stat(filename);
    return stat.isDirectory() ? undefined : fileResponse(filename, stat);
  } catch (e) {
    console.error(e);
    return undefined;
  }
};

/**
 * Finds .ts files and transpiles them to JS.
 * @type StaticMiddleware
 */
const tsFileServer = async (req) => {
  if (req.url?.endsWith(".ts")) {
    const filename = path.join(process.cwd(), req.url ?? "");
    const stat = await fs.stat(filename);
    if (stat.isFile()) {
      const source = (await fs.readFile(filename)).toString("utf-8");
      const js = compile(source);
      return contentResponse(js, "application/javascript");
    }
  }
  return undefined;
};

/**
 * Searches up the request path until the first index is found.
 *
 * @type StaticMiddleware
 */
const findIndex = async (req) => {
  let filename = path.join(process.cwd(), req.url ?? "");
  let basename = path.basename(filename);
  if (basename.match(/\.[a-z]{2,3}$/)) {
    return undefined;
  }
  while (filename.startsWith(process.cwd())) {
    const index = path.join(filename, "index.html");
    try {
      return fileResponse(index);
    } catch {
      filename = path.dirname(filename);
    }
  }
  return undefined;
};

/** @type StaticMiddleware */
const notFound = async () =>
  fileResponse(
    path.join(path.dirname(FLAGS.argv0), "404.html"),
    undefined,
    404
  );

/** @type {StaticMiddleware[]}  */
const middlewares = [
  sitemap,
  tsFileServer,
  staticFileServer,
  findIndex,
  notFound,
];

/**
 * @param {ServerResponse} res
 * @param {string} message
 */
const error = (res, message) => {
  console.error(message);
  res.statusCode = 500;
  res.write(message);
  res.end();
  return true;
};

const MIME_TYPES = {
  js: "text/javascript",
  json: "text/javascript",
  css: "text/css",
  html: "text/html",
};

const mime = (/** @type string */ basename) => {
  const extension = basename.substr(basename.lastIndexOf(".") + 1);
  return MIME_TYPES[extension] ?? "application/octet-stream";
};

/**
 * @param {ServerResponse} res
 * @param {StaticResponse} response
 */

const sendContent = async (res, { content, contentType }) => {
  res.setHeader("content-length", "" + content.length);
  res.setHeader("content-type", contentType);
  await res.write(content);
  res.end();
  return true;
};

const log = (/** @type {IncomingMessage} */ req) => {
  const when = new Date().toISOString();
  const who = req.socket.remoteAddress;
  const what = req.url;
  const how = `${req.method} ${what}`;
  console.log(`${when}\t${who}\t"${how}"`);
};

const server = createServer(async (req, res) => {
  log(req);
  /** @type {undefined|(() => Promise<StaticResponse>)} */ let handler;
  try {
    for (const middleware of middlewares) {
      handler = await middleware(req);
      if (handler !== undefined) {
        break;
      }
    }
    if (handler) {
      sendContent(res, await handler());
    } else {
      res.end();
    }
  } catch (e) {
    error(res, e.message + "\n" + e.stack);
  }
});

server.on("listening", () => {
  const { address, port } =
    /** @type {import("net").AddressInfo} */ server.address();
  console.log(`Listening at http://${address}:${port}`);
});

console.log(`Starting in ${process.cwd()}`);
server.listen(FLAGS.asNumber("port"), FLAGS.asString("host", "0.0.0.0"));
