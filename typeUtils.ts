import type { Input } from "@pulumi/pulumi";

export type unwrapInput<T> = {
  [key in keyof T]: T[key] extends Input<infer I>
    ? I extends (infer E)[]
      ? unwrapInput<E>[]
      : I
    : never;
};
