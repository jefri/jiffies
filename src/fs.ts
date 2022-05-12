// Treat localstorage as a file system
export type PathLike = string;
export interface Stats {
  isDirectory(): boolean;
  isFile(): boolean;
}

function join(...paths: string[]): string {
  const pathParts: string[] = [];
  for (const path of paths) {
    for (const part of path.split("/")) {
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
  return "/" + pathParts.join("/");
}

interface FileSystemAdapter {
  stat(path: PathLike): Promise<Stats>;
  readdir(path: PathLike): Promise<string[]>;
  copyFile(from: PathLike, to: PathLike): Promise<void>;
  readFile(path: PathLike): Promise<string>;
  writeFile(path: PathLike, contents: string): Promise<void>;
  rm(path: PathLike): Promise<void>;
}

export class FileSystem implements FileSystemAdapter {
  protected wd = "/";
  protected stack: string[] = [];

  constructor(protected adapter = new ObjectFileSystemAdapter()) {}

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
    return this.adapter.stat(join(this.cwd(), path));
  }

  readdir(path: PathLike): Promise<string[]> {
    return this.adapter.readdir(this.p(path) + "/");
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
    return path[0] == "/" ? path : join(this.cwd(), path);
  }
}

export class ObjectFileSystemAdapter implements FileSystemAdapter {
  constructor(private fs: Record<string, string> = {}) {}

  stat(path: PathLike): Promise<Stats> {
    return new Promise((resolve, reject) => {
      if (this.fs[path] != null) {
        resolve({
          isDirectory() {
            return false;
          },
          isFile() {
            return true;
          },
        });
      } else {
        reject();
      }
    });
  }

  readdir(path: PathLike): Promise<string[]> {
    return new Promise((resolve) => {
      let dir: string[] = [];
      for (const filename of Object.keys(this.fs)) {
        if (filename.startsWith(path)) {
          const end = filename.indexOf("/", path.length + 1);
          const basename = filename.substring(
            path.length,
            end == -1 ? undefined : end
          );
          dir.push(basename);
        }
      }
      return resolve(dir);
    });
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
        reject();
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

export class LocalStorageFileSystemAdapter extends ObjectFileSystemAdapter {
  constructor() {
    super(window.localStorage);
  }
}

export interface Tree {
  [k: string]: string | Tree;
}

export async function reset(fs: FileSystem, tree: Tree): Promise<void> {
  for (const [path, file] of Object.entries(tree)) {
    if (typeof file == "string") {
      await fs.writeFile(path, file);
    } else {
      fs.cd(path);
      await reset(fs, file);
      fs.cd("..");
    }
  }
}
