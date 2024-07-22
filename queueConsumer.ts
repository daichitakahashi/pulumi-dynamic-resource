import * as crypto from "node:crypto";
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
  Data as D,
  Effect as E,
  Equal as Eq,
  Option as O,
  Schedule,
  String as Str,
  flow,
  pipe,
} from "effect";
import type { unwrapInput } from "./typeUtils";

export interface QueueConsumerArgs {
  accountId: Input<string>;
  queueId: Input<string>;
  scriptName: Input<string>;
  deadLetterQueue?: Input<string>;
  batchSize?: Input<number>;
  maxRetries?: Input<number>;
  maxWaitTimeMs?: Input<number>;
  retryDelay?: Input<number>;
  maxConsumerConcurrency?: Input<number>;
}

type QueueConsumerProviderArgs = unwrapInput<QueueConsumerArgs>;
type QueueConsumerProviderState = QueueConsumerProviderArgs;

class QueueConsumerProvider
  implements
    ResourceProvider<QueueConsumerProviderArgs, QueueConsumerProviderState>
{
  constructor(private apiToken: string) {}

  async create(
    args: QueueConsumerProviderArgs,
  ): Promise<CreateResult<QueueConsumerProviderState>> {
    // FIXME: implement
    return { id: crypto.randomUUID(), outs: args };
  }

  async diff(
    _id: string,
    olds: QueueConsumerProviderState,
    news: QueueConsumerProviderArgs,
  ): Promise<DiffResult> {
    // FIXME: implement
    return {
      changes: false,
      replaces: [],
    };
  }

  async update(
    _id: string,
    _olds: QueueConsumerProviderState,
    news: QueueConsumerProviderArgs,
  ): Promise<UpdateResult<QueueConsumerProviderState>> {
    // FIXME: implement
    return {
      outs: news,
    };
  }

  async delete(_id: string, props: QueueConsumerProviderState): Promise<void> {
    // FIXME: implement
  }
}

export class QueueConsumer extends Resource {
  constructor(
    name: string,
    props: QueueConsumerArgs,
    apiToken: string,
    opts?: CustomResourceOptions,
  ) {
    super(new QueueConsumerProvider(apiToken), name, props, opts);
  }
}
