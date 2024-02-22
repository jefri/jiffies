// Treat localstorage as a file system
export type PathLike = string;

export interface PlatformParts {
  SEP: string;
  WD: string;
  isAbsolute(path: PathLike): boolean;
}

export const PLATFORM_PARTS_WIN: PlatformParts = {
  SEP: "\\",
  WD: "C:\\\\",
  isAbsolute: (path) => Boolean(path.match(new RegExp("^[a-zA-Z]:\\\\"))),
};

export const PLATFORM_PARTS_UNIX: PlatformParts = {
  SEP: "/",
  WD: "/",
  isAbsolute: (path) => path[0] == "/",
};

export const PLATFORM_PARTS: PlatformParts =
  typeof process !== "undefined" && process.platform == "win32"
    ? PLATFORM_PARTS_WIN
    : PLATFORM_PARTS_UNIX;

export const SEP = PLATFORM_PARTS.SEP;
export const WD = PLATFORM_PARTS.WD;
export const isAbsolute = PLATFORM_PARTS.isAbsolute;

// Compatible with Node's fs.Dirent
export interface Stats {
  isDirectory(): boolean;
  isFile(): boolean;
  name: string;
}

export function basename(filename: PathLike): string {
  if (filename.endsWith(SEP)) {
    filename = filename.substring(0, filename.length - 1);
  }
  const basename = filename.split(SEP).at(-1) ?? "";
  return basename;
}

function join(...paths: string[]): string {
  const pathParts: string[] = [];
  for (const path of paths) {
    for (const part of path.split(SEP)) {
      switch (part) {
        case "":
        case ".":
          break;
        case "..":
          pathParts.pop();
          break;
        default:
          pathParts.push(part);
      }
    }
  }
  return (
    (PLATFORM_PARTS == PLATFORM_PARTS_UNIX ? SEP : "") + pathParts.join(SEP)
  );
}

export interface FileSystemAdapter {
  stat(path: PathLike): Promise<Stats>;
  readdir(path: PathLike): Promise<string[]>;
  scandir(path: PathLike): Promise<Stats[]>;
  mkdir(path: PathLike): Promise<void>;
  copyFile(from: PathLike, to: PathLike): Promise<void>;
  readFile(path: PathLike): Promise<string>;
  writeFile(path: PathLike, contents: string): Promise<void>;
  rm(path: PathLike): Promise<void>;
}

export class FileSystem implements FileSystemAdapter {
  protected wd = WD;
  protected stack: string[] = [];

  constructor(
    protected adapter: FileSystemAdapter = new RecordFileSystemAdapter()
  ) {}

  cwd(): string {
    return this.wd;
  }

  cd(dir: string) {
    this.wd = this.p(dir);
  }

  pushd(dir: string) {
    this.stack.push(this.wd);
    this.cd(dir);
  }

  popd() {
    if (this.stack.length > 0) {
      this.wd = this.stack.pop()!;
    }
  }

  stat(path: PathLike): Promise<Stats> {
    return this.adapter.stat(this.p(path));
  }

  scandir(path: PathLike): Promise<Stats[]> {
    return this.adapter.scandir(this.p(path));
  }

  readdir(path: PathLike): Promise<string[]> {
    return this.adapter.readdir(this.p(path));
  }

  mkdir(path: string): Promise<void> {
    return this.adapter.mkdir(this.p(path));
  }

  copyFile(from: PathLike, to: PathLike): Promise<void> {
    return this.adapter.copyFile(this.p(from), this.p(to));
  }

  readFile(path: PathLike): Promise<string> {
    return this.adapter.readFile(this.p(path));
  }

  writeFile(path: PathLike, contents: string): Promise<void> {
    return this.adapter.writeFile(this.p(path), contents);
  }

  rm(path: PathLike): Promise<void> {
    return this.adapter.rm(this.p(path));
  }

  private p(path: PathLike): string {
    return isAbsolute(path) ? path : join(this.cwd(), path);
  }
}

export class RecordFileSystemAdapter implements FileSystemAdapter {
  constructor(private fs: Record<string, string> = {}) {}

  stat(path: PathLike): Promise<Stats> {
    return new Promise((resolve, reject) => {
      if (this.fs[path]) {
        return resolve({
          name: basename(path),
          isDirectory() {
            return false;
          },
          isFile() {
            return true;
          },
        });
      }

      if (!path.endsWith(SEP)) path += SEP;
      for (let filename of Object.keys(this.fs)) {
        if (filename.startsWith(path)) {
          return resolve({
            name: basename(path),
            isDirectory() {
              return true;
            },
            isFile() {
              return false;
            },
          });
        }
      }

      reject();
    });
  }

  async scandir(path: PathLike): Promise<Stats[]> {
    return (await this.readdir(path)).map<Stats>((name) => {
      let isFile = this.fs[join(path, name)] !== undefined;
      return {
        name,
        isDirectory() {
          return !isFile;
        },
        isFile() {
          return isFile;
        },
      };
    });
  }

  readdir(path: PathLike): Promise<string[]> {
    if (!path.endsWith(SEP)) path += SEP;
    return new Promise((resolve) => {
      let dir = new Set<string>();
      for (const filename of Object.keys(this.fs)) {
        if (filename.startsWith(path)) {
          const end = filename.indexOf(SEP, path.length + 1);
          const basename = filename.substring(
            path.length,
            end === -1 ? undefined : end
          );
          dir.add(basename);
        }
      }
      return resolve([...dir].sort());
    });
  }

  mkdir(path: string): Promise<void> {
    return Promise.resolve();
  }

  copyFile(from: PathLike, to: PathLike): Promise<void> {
    return new Promise((resolve) => {
      this.fs[to] = this.fs[from];
      resolve();
    });
  }

  readFile(path: PathLike): Promise<string> {
    return new Promise((resolve, reject) => {
      let file = this.fs[path];
      if (file === undefined) {
        const error = new Error(`File Not Found ${path}`);
        reject(error);
      } else {
        resolve(file);
      }
    });
  }

  writeFile(path: PathLike, contents: string): Promise<void> {
    return new Promise((resolve) => {
      this.fs[path] = contents;
      resolve();
    });
  }

  rm(path: PathLike): Promise<void> {
    return new Promise((resolve) => {
      delete this.fs[path];
      resolve();
    });
  }
}

export class LocalStorageFileSystemAdapter extends RecordFileSystemAdapter {
  constructor() {
    super(window.localStorage);
  }
}

export type ObjectFileSystem = { [k: string]: string | ObjectFileSystem };
export class ObjectFileSystemAdapter extends RecordFileSystemAdapter {
  constructor(object: ObjectFileSystem) {
    super(reduceObjectFileSystem(object));
  }
}

function reduceObjectFileSystem(
  object: ObjectFileSystem
): Record<string, string> {
  let level: Record<string, string> = {};

  for (let [k, v] of Object.entries(object)) {
    if (typeof v == "string") {
      level[`/${k}`] = v;
    } else {
      for (let [k2, v2] of Object.entries(reduceObjectFileSystem(v))) {
        level[`/${k}${k2}`] = v2;
      }
    }
  }

  return level;
}

export interface Tree {
  [k: string]: string | Tree;
}

export async function reset(fs: FileSystem, tree: Tree): Promise<void> {
  for (const [path, file] of Object.entries(tree)) {
    if (typeof file === "string") {
      await fs.writeFile(path, file);
    } else {
      fs.cd(path);
      await reset(fs, file);
      fs.cd("..");
    }
  }
}
