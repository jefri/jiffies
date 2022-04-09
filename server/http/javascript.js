import * as fs from "fs/promises";
import * as path from "path";
import { contentResponse } from "./response.js";

/**
 * Finds .js files missing their extension
 * @type import("./index.js").StaticMiddleware
 */
export const jsFileServer = async (req) => {
	const url = req.url?.endsWith(".js") ? req.url : `${req.url}.js`;
	const filename = path.join(process.cwd(), url);
	try {
		const stat = await fs.stat(filename);
		if (stat.isFile()) {
			const js = (await fs.readFile(filename)).toString("utf-8");
			return contentResponse(js, "application/javascript");
		}
	} catch {}
	return undefined;
};
