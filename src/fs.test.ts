import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  FileSystem,
  ObjectFileSystemAdapter,
  RecordFileSystemAdapter,
} from "./fs.ts";

describe("FileSystem", () => {
  describe("Writing", () => {
    it("Writes files", async () => {
      const fsObj = {};
      const fs = new FileSystem(new RecordFileSystemAdapter(fsObj));
      await fs.writeFile("hello", "world");

      assert.deepStrictEqual(fsObj, { "/hello": "world" });
    });

    it("Writes deep files", async () => {
      const fsObj = {};
      const fs = new FileSystem(new RecordFileSystemAdapter(fsObj));
      await fs.writeFile("deep/hello", "world");

      assert.deepStrictEqual(fsObj, { "/deep/hello": "world" });
    });

    it("Writes deep files from root", async () => {
      const fsObj = {};
      const fs = new FileSystem(new RecordFileSystemAdapter(fsObj));
      await fs.writeFile("/root/deep/hello", "world");

      assert.deepStrictEqual(fsObj, { "/root/deep/hello": "world" });
    });

    it("Writes files after cd", async () => {
      const fsObj = {};
      const fs = new FileSystem(new RecordFileSystemAdapter(fsObj));
      await fs.cd("deep");
      await fs.writeFile("hello", "world");

      assert.deepStrictEqual(fsObj, { "/deep/hello": "world" });
    });
  });

  describe("directory", () => {
    it("returns directory listing", async () => {
      const fsObj = {
        "/deep/hello": "world",
        "/deep/bonjour": "monde",
        "/other/file": "text",
      };
      const fs = new FileSystem(new RecordFileSystemAdapter(fsObj));

      const dir = await fs.readdir("deep");
      assert.deepStrictEqual(dir.sort(), ["bonjour", "hello"]);
    });
  });

  describe("stat", () => {
    let state: { fs: FileSystem };
    beforeEach(() => {
      const fsObj = {
        "/deep/hello": "world",
        "/deep/bonjour": "monde",
        "/other/file": "text",
      };
      state = { fs: new FileSystem(new RecordFileSystemAdapter(fsObj)) };
    });

    it("stats a directory", async () => {
      const deep = await state.fs.stat("/deep");
      assert.strictEqual(deep.isDirectory(), true);
      assert.strictEqual(deep.isFile(), false);
    });

    it("stats a file", async () => {
      const deep = await state.fs.stat("/deep/hello");
      assert.strictEqual(deep.isDirectory(), false);
      assert.strictEqual(deep.isFile(), true);
    });
  });

  describe("ObjectFileSystem", () => {
    it("treats object keys as directories and final values as strings", async () => {
      const fsAdapter = new ObjectFileSystemAdapter({
        deep: {
          hello: "world",
          bonjour: "monde",
        },
        other_file: "text",
      });
      assert.deepStrictEqual(
        [
          ...Object.keys(
            (fsAdapter as unknown as { fs: Record<string, string> }).fs,
          ),
        ],
        ["/deep/hello", "/deep/bonjour", "/other_file"],
      );
      const fs = new FileSystem(fsAdapter);

      const deep = await fs.stat("/deep");
      assert.strictEqual(deep.isDirectory(), true);
      assert.strictEqual(deep.isFile(), false);

      const deep_bonjour = await fs.readFile("/deep/bonjour");
      assert.strictEqual(deep_bonjour, "monde");
    });
  });
});
