import { FileSystem, RecordFileSystemAdapter } from "./fs.js";
import { describe, it, expect } from "./scope/index.js";

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
});
