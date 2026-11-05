import { spawn } from "node:child_process";
import { constants } from "node:os";
import { CommandTimeout, type Runner } from "./sh.ts";

/** The runner that launches real subprocesses. */
export const nodeRunner: Runner = ({ args, capture, cwd, input, timeout }) =>
  new Promise((resolve, reject) => {
    const [command, ...rest] = args;
    if (command === undefined) {
      reject(new TypeError("Cannot run an empty command"));
      return;
    }
    const child = spawn(command, rest, {
      cwd,
      shell: false,
      stdio: [
        input === undefined ? "inherit" : "pipe",
        capture ? "pipe" : "inherit",
        capture ? "pipe" : "inherit",
      ],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
    });
    if (input !== undefined) {
      child.stdin?.on("error", () => {}); // The child may exit without reading.
      child.stdin?.end(input);
    }
    let timedOut = false;
    const timer =
      timeout === undefined
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            child.kill();
          }, timeout * 1000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (timedOut && timeout !== undefined) {
        reject(new CommandTimeout(args, timeout, { stdout, stderr }));
        return;
      }
      // Like Python's subprocess, a signal death is the negated signal number.
      const returncode = code ?? -(signal ? constants.signals[signal] : 1);
      resolve({ args, returncode, stdout, stderr });
    });
  });
