#!/usr/bin/env node

import { createServer, IncomingMessage, ServerResponse } from "http";
import * as path from "path";
import { info } from "../../jiffies/log.js";
import { findIndex } from "./apps.js";
import { fileResponse } from "./response.js";
import { sitemap } from "./sitemap.js";
import { staticFileServer } from "./static.js";
import { tsFileServer } from "./typescript.js";

/**
 * @typedef {{status: 200|404|500, content: Buffer, contentType: string, contentLength?: number}} StaticResponse
 * @typedef {(req: IncomingMessage) => (() => Promise<StaticResponse>)|undefined} StaticMiddleware
 */

/** @type StaticMiddleware */
const notFound = async () =>
  fileResponse(
    // path.join(path.dirname(FLAGS.argv0), "404.html"),
    path.join(process.cwd(), "404.html"),
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

/**
 * @param {ServerResponse} res
 * @param {StaticResponse} response
 */

const sendContent = async (res, { content, contentType, contentLength }) => {
  res.setHeader("content-length", "" + contentLength);
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
  info("Request", { when, who, how });
};

export const makeServer = () => {
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
    info("Server listening", { address: `http://${address}:${port}` });
  });

  return server;
};
