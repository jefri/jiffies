#!/usr/bin/env node
import { createServer, IncomingMessage, ServerResponse } from "http";
import * as path from "path";
import * as fs from "fs/promises";
import { parse } from "./flags.js";

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
const middlewares = [staticFileServer, findIndex];

/**
 * @param {ServerResponse} res
 * @param {string} message
 */
const error = (res, message) => {
  console.error(message);
  res.statusCode = 500;
  res.write(message);
  res.end();
};

const MIME_TYPES = {
  js: "application/javascript",
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
  res.setHeader("content-length", "" + stats.size);
  res.setHeader("content-type", mime(path.basename(filepath)));
  const file = await fs.open(filepath, "r");
  /** @type Buffer */ let buffer;
  /** @type number */ let bytesRead;
  while ((({ buffer, bytesRead } = await file.read()), bytesRead > 0)) {
    await res.write(buffer);
  }
  res.end();
  await file.close();
};

const log = (/** @type {IncomingMessage} */ req) => {
  const when = new Date().toISOString();
  const who = req.socket.remoteAddress;
  const what = req.url;
  const how = `${req.method} ${what} HTTP/${req.httpVersion}`;
  console.log(`${when}\t${who}\t"${how}"`);
};

const server = createServer(async (req, res) => {
  log(req);
  for (const middleware of middlewares) {
    const [code, filename, stats] = await middleware(req);
    switch (code) {
      case 500:
        return error(res, filename);
      case 200:
        try {
          return await sendFile(res, filename, stats);
        } catch (e) {
          return await error(res, e.message);
        }
    }
  }
  res.statusCode = 404;
  const missing = path.join(path.dirname(FLAGS.argv0), "404.html");
  return await sendFile(res, missing, await fs.stat(missing));
});

server.on("listening", () => {
  const { address, port } = /** @type {import("net").AddressInfo} */ (
    server.address()
  );
  console.log(`Listening at http://${address}:${port}`);
});

console.log(`Starting in ${process.cwd()}`);
server.listen(FLAGS.asNumber("port"), FLAGS.asString("host", "0.0.0.0"));
