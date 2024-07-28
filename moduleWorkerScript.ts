import * as crypto from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import * as path from "node:path";
import { HttpBody, HttpClientRequest } from "@effect/platform";
import * as Http from "@effect/platform/HttpClient";
import type { CustomResourceOptions, Input } from "@pulumi/pulumi";
import {
  type CreateResult,
  type DiffResult,
  Resource,
  type ResourceProvider,
  type UpdateResult,
} from "@pulumi/pulumi/dynamic";
import {
  Array as A,
  Boolean as B,
  Effect as E,
  Option as O,
  Schedule,
  String as Str,
  flow,
  pipe,
} from "effect";

import { canonicalJSON, type unwrapInput } from "./utils";

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

export type ModuleWorkerScriptProviderArgs =
  unwrapInput<ModuleWorkerScriptArgs>;
export type ModuleWorkerScriptProviderState = ModuleWorkerScriptProviderArgs & {
  scriptHash: string;
};

export class ModuleWorkerScriptProvider
  implements
    ResourceProvider<
      ModuleWorkerScriptProviderArgs,
      ModuleWorkerScriptProviderState
    >
{
  constructor(private apiToken: string) {}

  async create(
    args: ModuleWorkerScriptProviderArgs,
  ): Promise<CreateResult<ModuleWorkerScriptProviderState>> {
    const scriptHash = await E.runPromise(
      uploadModuleWorkerScript(this.apiToken, args),
    );
    return {
      id: crypto.randomUUID(),
      outs: { ...args, scriptHash },
    };
  }

  async diff(
    _id: string,
    olds: ModuleWorkerScriptProviderState,
    news: ModuleWorkerScriptProviderArgs,
  ): Promise<DiffResult> {
    return E.runPromise(diffModuleWorkerScript(olds, news));
  }

  async update(
    _id: string,
    _olds: ModuleWorkerScriptProviderState,
    news: ModuleWorkerScriptProviderArgs,
  ): Promise<UpdateResult<ModuleWorkerScriptProviderState>> {
    const scriptHash = await E.runPromise(
      uploadModuleWorkerScript(this.apiToken, news),
    );
    return {
      outs: { ...news, scriptHash },
    };
  }

  async delete(
    _id: string,
    props: ModuleWorkerScriptProviderState,
  ): Promise<void> {
    await E.runPromise(deleteModuleWorkerScript(this.apiToken, props));
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

const scripts = (dir: string) =>
  pipe(
    E.promise(() => readdir(dir, { withFileTypes: true })),
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
  );

const scriptHash = (i: { data: Buffer; contentType: string }) =>
  crypto
    .createHash("sha512")
    .update(i.contentType)
    .update(i.data)
    .digest("hex");

const scriptsHash = (scriptHashes: string[]) =>
  pipe(
    scriptHashes,
    A.reduce(crypto.createHash("sha512"), (hash, scriptHash) =>
      hash.update(scriptHash),
    ),
    (hash) => hash.digest("hex"),
  );

const file = (
  dir: string,
  { filename, contentType }: { filename: string; contentType: string },
) =>
  pipe(
    E.tryPromise({
      try: () => readFile(path.join(dir, filename)),
      catch: () => "failed to read file",
    }),
    E.map((data) => ({
      content: new File([data], filename, { type: contentType }),
      hash: scriptHash({ data, contentType }),
    })),
  );

const uploadModuleWorkerScript = (
  apiToken: string,
  args: ModuleWorkerScriptProviderArgs,
) =>
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
      scripts(validatedScriptDir),
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
    E.bind("formData", ({ moduleFiles, validatedScriptDir, metadata }) =>
      E.gen(function* () {
        const formData = new FormData();
        formData.set(
          "metadata",
          new File([JSON.stringify(metadata)], "metadata", {
            type: "application/json",
          }),
        );
        const hashes: string[] = [];
        for (const f of moduleFiles) {
          const { content, hash } = yield* file(validatedScriptDir, f);
          formData.set(f.filename, content);
          hashes.push(hash);
        }
        return {
          formData: HttpBody.formData(formData),
          scriptHash: scriptsHash(hashes),
        };
      }),
    ),
    E.tap(({ formData: { formData } }) =>
      E.scoped(
        E.retry(
          Http.fetchOk(
            HttpClientRequest.put(
              `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(args.accountId)}/workers/scripts/${encodeURIComponent(args.name)}`,
              {
                headers: { Authorization: `Bearer ${apiToken}` },
                body: formData,
              },
            ),
          ),
          Schedule.addDelay(Schedule.recurs(5), () => "1 second"),
        ),
      ),
    ),
    E.map(({ formData: { scriptHash } }) => scriptHash),
  );

const diffModuleWorkerScript = (
  olds: ModuleWorkerScriptProviderState,
  news: ModuleWorkerScriptProviderArgs,
): E.Effect<DiffResult> =>
  pipe(
    E.Do,
    E.let("replaces", () =>
      pipe(
        ["accountId", "name"] as const,
        A.flatMap((key) => (olds[key] === news[key] ? [] : [key])),
      ),
    ),
    E.bind("changes", ({ replaces }) =>
      pipe(
        E.Do,
        E.let("withReplaces", () => replaces.length > 0),
        E.bind("scriptHash", () =>
          pipe(
            scripts(news.scriptDir),
            E.flatMap((scripts) =>
              E.all(
                pipe(
                  scripts,
                  A.map(({ filename, contentType }) =>
                    pipe(
                      E.promise(() =>
                        readFile(path.join(news.scriptDir, filename)),
                      ),
                      E.map((data) => scriptHash({ data, contentType })),
                    ),
                  ),
                ),
              ),
            ),
            E.map((scriptHashes) => scriptsHash(scriptHashes)),
          ),
        ),
        E.let(
          "withoutUpdate",
          ({ scriptHash }) =>
            canonicalJSON(olds) === canonicalJSON({ ...news, scriptHash }),
        ),
        E.map(
          ({ withReplaces, withoutUpdate }) => withReplaces || !withoutUpdate,
        ),
      ),
    ),
  );

const deleteModuleWorkerScript = (
  apiToken: string,
  props: ModuleWorkerScriptProviderState,
) =>
  E.scoped(
    E.retry(
      Http.fetchOk(
        HttpClientRequest.del(
          `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(props.accountId)}/workers/scripts/${encodeURIComponent(props.name)}`,
          {
            headers: { Authorization: `Bearer ${apiToken}` },
          },
        ),
      ),
      Schedule.addDelay(Schedule.recurs(5), () => "1 second"),
    ),
  );

export class ModuleWorkerScript extends Resource {
  constructor(
    name: string,
    props: ModuleWorkerScriptArgs,
    apiToken: string,
    opts?: CustomResourceOptions,
  ) {
    super(new ModuleWorkerScriptProvider(apiToken), name, props, opts);
  }
}
