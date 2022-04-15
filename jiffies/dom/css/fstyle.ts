import { dashCase } from "../../case.js";
import { Properties } from "../types/css.js";

export type FStyle =
  | Properties
  | {
      [K in string]: FStyle;
    };

export function compileFStyle(fstyle: FStyle, prefix = ""): string {
  const properties: { key: string; value: string }[] = [];
  const rules: { key: string; value: FStyle }[] = [];

  for (const [key, value] of Object.entries(fstyle)) {
    if (typeof value == "string") {
      properties.push({ key, value });
    } else {
      rules.push({ key, value });
    }
  }

  let rule = "";

  if (properties.length > 0) {
    rule += `${prefix} {\n`;
    for (const { key, value } of properties) {
      rule += `  ${dashCase(key)}: ${value};\n`;
    }
    rule += "}\n\n";
  }

  for (const { key, value } of rules) {
    if (key.startsWith("@media")) {
      rule += `${key} {\n`;
      rule += compileFStyle(value, "  ");
      rule += `}\n\n`;
    } else {
      rule += compileFStyle(value, `${prefix} ${key}`);
    }
  }
  return rule;
}
