import {
  FileSystem,
  ObjectFileSystemAdapter,
  RecordFileSystemAdapter,
} from "./fs.js";
import { describe, it, expect, beforeEach } from "./scope/index.js";
import { cleanState } from "./scope/state.js";

describe("FileSystem", () => {
  describe("Writing", () => {
    it("Writes files", async () => {
      const fsObj = {};
      const fs = new FileSystem(new RecordFileSystemAdapter(fsObj));
      await fs.writeFile("hello", "world");

      expect(fsObj).toEqual({ "/hello": "world" });
    });

    it("Writes deep files", async () => {
      const fsObj = {};
      const fs = new FileSystem(new RecordFileSystemAdapter(fsObj));
      await fs.writeFile("deep/hello", "world");

      expect(fsObj).toEqual({ "/deep/hello": "world" });
    });

    it("Writes deep files from root", async () => {
      const fsObj = {};
      const fs = new FileSystem(new RecordFileSystemAdapter(fsObj));
      await fs.writeFile("/root/deep/hello", "world");

      expect(fsObj).toEqual({ "/root/deep/hello": "world" });
    });

    it("Writes files after cd", async () => {
      const fsObj = {};
      const fs = new FileSystem(new RecordFileSystemAdapter(fsObj));
      await fs.cd("deep");
      await fs.writeFile("hello", "world");

      expect(fsObj).toEqual({ "/deep/hello": "world" });
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
      expect(dir.sort()).toEqual(["bonjour", "hello"]);
    });
  });

  describe("stat", () => {
    const state = cleanState(() => {
      const fsObj = {
        "/deep/hello": "world",
        "/deep/bonjour": "monde",
        "/other/file": "text",
      };
      return { fs: new FileSystem(new RecordFileSystemAdapter(fsObj)) };
    }, beforeEach);

    it("stats a directory", async () => {
      const deep = await state.fs.stat("/deep");
      expect(deep.isDirectory()).toBe(true);
      expect(deep.isFile()).toBe(false);
    });

    it("stats a file", async () => {
      const deep = await state.fs.stat("/deep/hello");
      expect(deep.isDirectory()).toBe(false);
      expect(deep.isFile()).toBe(true);
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
      expect([
        ...Object.keys(
          (fsAdapter as unknown as { fs: Record<string, string> }).fs
        ),
      ]).toEqual(["/deep/hello", "/deep/bonjour", "/other_file"]);
      let fs = new FileSystem(fsAdapter);

      const deep = await fs.stat("/deep");
      expect(deep.isDirectory()).toBe(true);
      expect(deep.isFile()).toBe(false);

      const deep_bonjour = await fs.readFile("/deep/bonjour");
      expect(deep_bonjour).toBe("monde");
    });
  });
});
