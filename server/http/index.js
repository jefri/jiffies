#!/usr/bin/env node
import { createServer, IncomingMessage, ServerResponse } from "http";
import * as path from "path";
import * as fs from "fs/promises";
import { parse } from "../../jiffies/flags.js";
import { sitemap } from "./sitemap.js";
import { Stats } from "fs";

const FLAGS = parse(process.argv);

/**
 * @typedef {import('fs').Stats} Stats
 * @typedef {[200, string, Stats]|[404]|[500, string, Stats]} StaticResponse
 * @typedef {(req: IncomingMessage) => Promise<StaticResponse>} StaticMiddleware
 */

/**
 * if path matches a file exactly, serve it. Valid mime types are .html, .js, .css, and images.
 * @type StaticMiddleware
 */
const staticFileServer = async (req) => {
  const filename = path.join(process.cwd(), req.url ?? "");
  try {
    const stat = await fs.stat(filename);
    return stat.isDirectory() ? [404] : [200, filename, stat];
  } catch (e) {
    console.error(e);
    return [404];
  }
};

/**
 * Searches up the request path until the first index is found.
 *
 * @type StaticMiddleware
 * */
const findIndex = async (req) => {
  let filename = path.join(process.cwd(), req.url ?? "");
  let basename = path.basename(filename);
  if (basename.match(/\.[a-z]{2,3}$/)) {
    return [404];
  }
  while (filename.startsWith(process.cwd())) {
    const index = path.join(filename, "index.html");
    try {
      return [200, index, await fs.stat(index)];
    } catch {
      filename = path.dirname(filename);
    }
  }
  return [404];
};

/** @type {StaticMiddleware[]}  */
const middlewares = [sitemap, staticFileServer, findIndex];

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
 * @param {string} filepath
 * @param {Stats} stats
 */
const sendFile = async (res, filepath, stats) => {
  const file = await fs.open(filepath, "r");
  res.setHeader("content-length", "" + stats.size);
  res.setHeader("content-type", mime(path.basename(filepath)));
  /** @type Buffer */ let buffer;
  /** @type number */ let bytesRead;
  while ((({ buffer, bytesRead } = await file.read()), bytesRead > 0)) {
    await res.write(buffer);
  }
  res.end();
  await file.close();
  return true;
};

const sendContent = async (res, filepath, obj) => {
  const content = obj instanceof String ? obj : JSON.stringify(obj);
  res.setHeader("content-length", "" + content.length);
  res.setHeader("content-type", mime(path.basename(filepath)));
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

/**
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @param {StaticMiddleware} middleware
 */
const handleMiddleware = async (req, res, middleware) => {
  const [code, filename, stats] = await middleware(req);
  switch (code) {
    case 500:
      return error(res, filename);
    case 200:
      try {
        if (stats instanceof Stats) {
          return await sendFile(res, filename, stats);
        } else {
          return await sendContent(res, filename, stats);
        }
      } catch (e) {
        return await error(res, e.message);
      }
  }
};

const send404 = async (/** @type {ServerResponse} */ res) => {
  res.statusCode = 404;
  const missing = path.join(path.dirname(FLAGS.argv0), "404.html");
  await sendFile(res, missing, await fs.stat(missing));
};

const server = createServer(async (req, res) => {
  log(req);

  let handled = false;
  try {
    for (const middleware of middlewares) {
      handled = (await handleMiddleware(req, res, middleware)) ?? false;
      if (handled) {
        break;
      }
    }
  } catch (e) {
    console.error(e);
  }
  if (!handled) {
    send404(res);
  }
});

server.on("listening", () => {
  const { address, port } = /** @type {import("net").AddressInfo} */ (
    server.address()
  );
  console.log(`Listening at http://${address}:${port}`);
});

console.log(`Starting in ${process.cwd()}`);
server.listen(FLAGS.asNumber("port"), FLAGS.asString("host", "0.0.0.0"));
