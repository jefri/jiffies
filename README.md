# Jiffies

JEFRi Jiffies are a number of "common" utilities for JavaScript/TypeScript pulled from and inspired by other programming languages, and common base tools missing or inconsistent between DOM and Node runtimes.

- `assert` - common runtime assertions.
- `context` - JavaScript implementation of the Python [`with`][pywith] statement.
- `display` - TypeScript implementation of the Rust [Display][rustdisplay] trait.
- `equal` - JavaScript deep equality checkers, including TS type checking.
- `flags` - JavaScript flag, environment, and configuration loader.
- `log` - JavaScript implementation of a [log4j][log4j]-alike logger.
- `result` - JavaScript implementation of Rust's [Option][rustoption] and [Result][rustresult] types.
- `loader.mjs` - Node 16.x typescript-transpiling module loader.

Jiffies also includes several microframeworks.

- `dom` - a tiny DOM functional library.
- `pico` - a copy of [PicoCSS](pico.css).
- `scope` - JavaScript testing microframework.
- `server` - Node HTTP Server & middleware.

## Development

1.  Clone jiffies
1.  cd jiffies
1.  npm install
1.  npm link

After any edit

1. npm run build

Alternatively, in a background terminal

1. npm run watch &

## Apps

### Starting

1. Create app folder
1. npm init
1. npm install -D prettier typescript@next
1. npm link @jefri/jiffies

<!--
TODO(Make @jefri/create)

1.  npm init @jefri

*   .gitignore
*   package.json
*   tsconfig.json
*   src/main.ts
*   src/index.html
*   src/app.ts
-->

### Running

1. npm start
