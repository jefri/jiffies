import { NodeFileSystem } from "./fs_node.js";

const fs = new NodeFileSystem();

async function main() {
  for (const stats of await fs.scandir(".")) {
    console.log(stats);
  }
}

main();
