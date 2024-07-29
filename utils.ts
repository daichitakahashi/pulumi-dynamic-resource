import type { Input } from "@pulumi/pulumi";

export type unwrapInput<T> = {
  [key in keyof T]: T[key] extends Input<infer I>
    ? I extends (infer E)[]
      ? unwrapInput<E>[]
      : I
    : never;
};

// biome-ignore lint/suspicious/noExplicitAny:
function canonicalize(v: any) {
  if (Array.isArray(v)) {
    return v.map(canonicalize);
  }
  if (typeof v === "object") {
    const entries = Object.entries(v)
      .sort(([k1], [k2]) => {
        if (k1 === k2) return 0;
        return k1 > k2 ? 1 : -1;
      })
      .map(([k, v]) => [k, canonicalize(v)])
      .filter(([_, v]) => v !== undefined);
    return Object.fromEntries(entries);
  }
  return v;
}

// biome-ignore lint/suspicious/noExplicitAny:
export const canonicalJSON = (v: any) => JSON.stringify(canonicalize(v));
