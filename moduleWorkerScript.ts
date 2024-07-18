import { readFile, readdir } from "node:fs/promises";
import type { Input, dynamic } from "@pulumi/pulumi";
import {
  Array as A,
  Boolean as B,
  Effect as E,
  Option as O,
  String as Str,
  flow,
  pipe,
} from "effect";

export interface ModuleWorkerScriptArgs {
  accountId: Input<string>;
  name: Input<string>;
  scriptDir: Input<string>;
  mainModule: Input<string>;
  compatibilityDate?: Input<string>;
  compatibilityFlags?: Input<string[]>;
  plainTextBindings?: Input<PlainTextBindingArgs[]>;
  secretTextBindings?: Input<SecretTextBindingArgs[]>;
  kvNamespaceBindings?: Input<KVNamespaceBindingArgs[]>;
  r2BucketBindings?: Input<R2BucketBindingArgs[]>;
  queueBindings?: Input<QueueBindingArgs[]>;
  d1DatabaseBindings?: Input<D1DatabaseBindingArgs[]>;
  serviceBindings?: Input<ServiceBindingArgs[]>;
  analyticsEngineBindings?: Input<AnalyticsEngineBindingArgs[]>;
  logpush?: Input<boolean>;
}
export interface PlainTextBindingArgs {
  name: Input<string>;
  text: Input<string>;
}
export interface SecretTextBindingArgs {
  name: Input<string>;
  text: Input<string>;
}
export interface KVNamespaceBindingArgs {
  name: Input<string>;
  namespaceId: Input<string>;
}
export interface R2BucketBindingArgs {
  name: Input<string>;
  bucketName: Input<string>;
}
export interface QueueBindingArgs {
  name: Input<string>;
  queueName: Input<string>;
}
export interface D1DatabaseBindingArgs {
  name: Input<string>;
  databaseId: Input<string>;
}
export interface ServiceBindingArgs {
  name: Input<string>;
  service: Input<string>;
}
export interface AnalyticsEngineBindingArgs {
  name: Input<string>;
  dataset: Input<string>;
}

interface ModuleWorkerScriptProviderArgs {
  accountId: string;
  name: string;
  scriptDir: string;
  mainModule: string;
  compatibilityDate?: string;
  compatibilityFlags?: string[];
  plainTextBindings?: PlainTextBindingProviderArgs[];
  secretTextBindings?: SecretTextBindingProviderArgs[];
  kvNamespaceBindings?: KVNamespaceBindingProviderArgs[];
  r2BucketBindings?: R2BucketBindingProviderArgs[];
  queueBindings?: QueueBindingProviderArgs[];
  d1DatabaseBindings?: D1DatabaseBindingProviderArgs[];
  serviceBindings?: ServiceBindingProviderArgs[];
  analyticsEngineBindings?: AnalyticsEngineBindingProviderArgs[];
  logpush?: boolean;
}
interface PlainTextBindingProviderArgs {
  name: string;
  text: string;
}
interface SecretTextBindingProviderArgs {
  name: string;
  text: string;
}
interface KVNamespaceBindingProviderArgs {
  name: string;
  namespaceId: string;
}
interface R2BucketBindingProviderArgs {
  name: string;
  bucketName: string;
}
interface QueueBindingProviderArgs {
  name: string;
  queueName: string;
}
interface D1DatabaseBindingProviderArgs {
  name: string;
  databaseId: string;
}
interface ServiceBindingProviderArgs {
  name: string;
  service: string;
}
interface AnalyticsEngineBindingProviderArgs {
  name: string;
  dataset: string;
}

type ModuleWorkerScriptProviderState = ModuleWorkerScriptArgs;

class ModuleWorkerScriptProvider
  implements
    dynamic.ResourceProvider<
      ModuleWorkerScriptProviderArgs,
      ModuleWorkerScriptProviderState
    >
{
  constructor(private apiToken: string) {}

  async create(
    args: ModuleWorkerScriptProviderArgs,
  ): Promise<dynamic.CreateResult<ModuleWorkerScriptProviderState>> {
    const entries = await readdir(args.scriptDir, { withFileTypes: true });
    for (const entry of entries) {
      entry.isFile;
    }

    return {
      id: "",
      outs: args,
    };
  }

  async diff(
    id: string,
    olds: ModuleWorkerScriptProviderState,
    news: ModuleWorkerScriptProviderArgs,
  ): Promise<dynamic.DiffResult> {
    return {
      changes: true,
    };
  }

  async update(
    id: string,
    olds: ModuleWorkerScriptProviderState,
    news: ModuleWorkerScriptProviderArgs,
  ): Promise<dynamic.UpdateResult<ModuleWorkerScriptProviderState>> {
    return {};
  }

  async delete(
    id: string,
    props: ModuleWorkerScriptProviderState,
  ): Promise<void> {
    return;
  }
}

const assertNonEmptyString = (s: string, message: string) =>
  pipe(
    Str.isNonEmpty(s),
    B.match({
      onTrue: () => E.succeed(s),
      onFalse: () => E.fail(message),
    }),
  );

const javascriptRx = /^.*(\.js|\.mjs)$/i;
const wasmRx = /^.*\.wasm$/i;
const sourceMapRx = /^.*\.js\.map$/i;

const optionalMap = <I, O>(list: I[] | undefined, fn: (v: I) => O): O[] =>
  list ? pipe(list, A.map(fn)) : ([] as O[]);

const uploadModuleWorkerScript = (args: ModuleWorkerScriptProviderArgs) =>
  pipe(
    E.Do,
    E.bind("validatedAccountId", () =>
      assertNonEmptyString(args.accountId, "empty accountId provided"),
    ),
    E.bind("validatedName", () =>
      assertNonEmptyString(args.name, "empty name provided"),
    ),
    E.bind("validatedScriptDir", () =>
      assertNonEmptyString(args.scriptDir, "empty scriptDir provided"),
    ),
    E.bind("moduleFiles", ({ validatedScriptDir }) =>
      pipe(
        E.promise(() => readdir(validatedScriptDir, { withFileTypes: true })),
        E.map(
          flow(
            A.filter((e) => e.isFile()),
            A.map((e) => ({
              filename: e.name,
              contentType: javascriptRx.test(e.name)
                ? "application/javascript+module"
                : wasmRx.test(e.name)
                  ? "application/wasm"
                  : sourceMapRx.test(e.name)
                    ? "application/source-map"
                    : "",
            })),
            A.filter((f) => !!f.contentType),
          ),
        ),
      ),
    ),
    E.bind("validatedMainModule", ({ moduleFiles }) =>
      pipe(
        moduleFiles,
        A.findFirst((f) => f.filename === args.mainModule),
        O.match({
          onSome: () => E.succeed(args.mainModule),
          onNone: () => E.fail("mainModule not found"),
        }),
      ),
    ),
    E.let("metadata", ({ validatedMainModule }) => ({
      main_module: validatedMainModule,
      compatibility_date: args.compatibilityDate,
      compatibility_flags: args.compatibilityFlags,
      bindings: pipe([
        optionalMap(args.plainTextBindings, (b) => ({
          type: "plain_text",
          ...b,
        })),
        optionalMap(args.secretTextBindings, (b) => ({
          type: "secret_text",
          ...b,
        })),
        optionalMap(args.kvNamespaceBindings, (b) => ({
          type: "kv_namespace",
          ...b,
        })),
        optionalMap(args.r2BucketBindings, (b) => ({
          type: "r2_bucket",
          ...b,
        })),
        optionalMap(args.queueBindings, (b) => ({
          type: "queue",
          ...b,
        })),
        optionalMap(args.d1DatabaseBindings, (b) => ({
          type: "d1",
          ...b,
        })),
        optionalMap(args.serviceBindings, (b) => ({
          type: "service",
          ...b,
        })),
        optionalMap(args.analyticsEngineBindings, (b) => ({
          type: "analytics_engine",
          ...b,
        })),
      ]),
      logpush: args.logpush,
    })),

    // construct FormData and request
  );
