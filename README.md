# Jiffies

JEFRi Jiffies are common utilities for JavaScript and TypeScript. They are pulled from and inspired by other programming languages, and fill gaps or inconsistencies between DOM and Node runtimes.

```sh
npm install @davidsouther/jiffies
```

Jiffies requires Node 22.18 or newer. Source is TypeScript that runs unbuilt under Node, so every import path ends in `.ts`:

```ts
import { Ok, Err } from "@davidsouther/jiffies/result.ts";
import { getLogger } from "@davidsouther/jiffies/log.ts";
```

## Utilities

| Module     | Usage                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assert`   | Common runtime assertions.                                                                                                                                          |
| `compress` | URL-safe string compression. `compress/index.ts` selects Node or Web code for its runtime. Adapters are also available as `compress/node.ts` and `compress/web.ts`. |
| `context`  | A JavaScript implementation of the Python [`with`](https://docs.python.org/3/reference/compound_stmts.html#the-with-statement) statement.                           |
| `display`  | A TypeScript implementation of the Rust [Display](https://doc.rust-lang.org/std/fmt/trait.Display.html) trait.                                                      |
| `equal`    | Deep equality checkers, including TypeScript type checking.                                                                                                         |
| `log`      | A [log4j](https://logging.apache.org/log4j/2.x/)-style logger.                                                                                                      |
| `result`   | Rust-style [Option](https://doc.rust-lang.org/std/option/) and [Result](https://doc.rust-lang.org/std/result/) types.                                               |

## Microframeworks

| Module    | Purpose                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| `dom`     | A tiny functional DOM library with hydration, routing, and forms. See [src/dom/README.md](src/dom/README.md). |
| `sh`      | Streamlined, idiomatic, safe shell wrappers.                                                                  |
| `server`  | A Node HTTP server with middleware and live reload.                                                           |
| `ssg`     | A static site generator built on `dom`.                                                                       |
| `release` | CalVer npm releases and Trusted Publishing setup, exposed as the `jiffies-release` command.                   |

A runnable hydration example lives in [demo/hydration](demo/hydration).

## Agent skills

The [skills](skills) folder holds agent skills that document how to use Jiffies in other projects.

| Skill                    | Use it for                                              |
| ------------------------ | ------------------------------------------------------- |
| `using-jiffies-dom`      | Building UI with the `dom` module.                      |
| `jiffies-css-components` | Composing pages from component functions.               |
| `using-jiffies-sh`       | Running external commands from Node scripts.            |
| `using-jiffies-release`  | Cutting CalVer releases and publishing without a token. |
| `using-ssg-cli`          | Setting up a static site build.                         |

## Development

To work on Jiffies, start with [DEVELOPMENT.md](DEVELOPMENT.md).

## License

See [LICENSE](LICENSE).
