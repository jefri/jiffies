export {};
await Promise.all([
  import("./html.test.js"),
  import("./fc.test.js"),
  import("./observable.test.js"),
]);
