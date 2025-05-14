import { NodeFileSystem } from "./fs_node.ts";

const fs = new NodeFileSystem();

async function main() {
  for (const stats of await fs.scandir(".")) {
    console.log(stats);
  }
}

main();
