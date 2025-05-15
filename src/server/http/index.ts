#!/usr/bin/env node

import {
  type IncomingMessage,
  type RequestListener,
  type ServerResponse,
  createServer,
} from "node:http";
import type { AddressInfo } from "node:net";
import * as path from "node:path";
import { info } from "../../log.ts";
import { findIndex } from "./apps.ts";
import { cssFileServer } from "./css.ts";
import { fileResponse } from "./response.ts";
import { sitemap } from "./sitemap.ts";
import { staticFileServer } from "./static.ts";
import { tsFileServer } from "./typescript.ts";

export interface StaticResponse {
  status: 200 | 404 | 500;
  content: Buffer;
  contentType: string;
  contentLength?: number;
  headers?: Map<string, string>;
}

export interface ServerConfig {
  root: string;
  scopes?: Record<`@${string}`, string>;
}

export type MiddlewareFactory = (
  config: ServerConfig,
) => Promise<StaticMiddleware>;

export type StaticMiddleware = (
  req: IncomingMessage,
) => Promise<undefined | (() => Promise<StaticResponse>)>;

const notFound: MiddlewareFactory =
  async ({ root }) =>
  async () =>
    fileResponse(
      // path.join(path.dirname(FLAGS.argv0), "404.html"),
      path.join(root, "404.html"),
      undefined,
      404,
    );

const BASE_MIDDLEWARES: MiddlewareFactory[] = [
  sitemap,
  tsFileServer,
  cssFileServer,
  staticFileServer,
  findIndex,
  notFound,
];

const error = (res: ServerResponse, message: string) => {
  console.error(message);
  res.statusCode = 500;
  res.write(message);
  res.end();
  return true;
};

const sendContent = async (
  res: ServerResponse,
  { content, contentType, contentLength, headers }: StaticResponse,
) => {
  res.setHeader("Content-Length", `${contentLength}`);
  res.setHeader("Content-Type", contentType);
  if (headers) {
    for (const [header, value] of headers.entries()) {
      res.setHeader(header.toLowerCase(), value);
    }
  }
  await res.write(content);
  res.end();
  return true;
};

const log = (req: IncomingMessage) => {
  const when = new Date().toISOString();
  const who = req.socket.remoteAddress;
  const what = req.url;
  const how = `${req.method} ${what}`;
  info("Request", { when, who, how });
};

export const makeServer = async (
  config: ServerConfig,
  middlewares: MiddlewareFactory[] = [],
) => {
  const handlers = await Promise.all(
    [...middlewares, ...BASE_MIDDLEWARES].map(async (m) => m(config)),
  );
  const middlewareHandler: RequestListener = async (req, res) => {
    log(req);
    let handler: undefined | (() => Promise<StaticResponse>);
    try {
      for (const middleware of handlers) {
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
      error(res, `${(e as Error).message}\n${(e as Error).stack}`);
    }
  };

  // TODO(https)
  const server = createServer(middlewareHandler);

  server.on("listening", () => {
    const { address, port } = server.address() as AddressInfo;
    info("Server listening", { address: `http://${address}:${port}` });
  });

  return server;
};
