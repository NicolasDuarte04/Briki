import en from "../src/messages/en";
import es from "../src/messages/es";

type FlatKeySet = Set<string>;

const flattenKeys = (value: unknown, prefix = "", acc: FlatKeySet = new Set()): FlatKeySet => {
  if (value === null || value === undefined) {
    if (prefix) acc.add(prefix);
    return acc;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      if (prefix) acc.add(prefix);
      return acc;
    }

    value.forEach((item, idx) => {
      const nextPrefix = prefix ? `${prefix}[${idx}]` : `[${idx}]`;
      flattenKeys(item, nextPrefix, acc);
    });
    return acc;
  }

  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenKeys(child, nextPrefix, acc);
    });
    return acc;
  }

  if (prefix) acc.add(prefix);
  return acc;
};

const diffKeySets = (left: FlatKeySet, right: FlatKeySet): string[] => {
  const missing: string[] = [];
  left.forEach((key) => {
    if (!right.has(key)) missing.push(key);
  });
  return missing.sort();
};

const formatSection = (title: string, keys: string[]): string => {
  if (!keys.length) return `${title}: none`; // compact when empty
  const joined = keys.map((key) => `  - ${key}`).join("\n");
  return `${title}:\n${joined}`;
};

const run = () => {
  const enKeys = flattenKeys(en);
  const esKeys = flattenKeys(es);

  const missingInEs = diffKeySets(enKeys, esKeys);
  const missingInEn = diffKeySets(esKeys, enKeys);

  if (missingInEs.length === 0 && missingInEn.length === 0) {
    console.log("✓ EN and ES message files contain identical key sets.");
    return;
  }

  console.log(formatSection("Missing in ES", missingInEs));
  console.log(formatSection("Missing in EN", missingInEn));
};

run();

