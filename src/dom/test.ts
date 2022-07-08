export async function loadTests() {
  if (process?.env.CI?.toLowerCase() === "true") return;
  await Promise.all([
    import("./html.test.js"),
    import("./fc.test.js"),
    import("./observable.test.js"),
  ]);
}
