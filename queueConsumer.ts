import * as crypto from "node:crypto";
import { HttpBody, HttpClientRequest } from "@effect/platform";
import * as Http from "@effect/platform/HttpClient";
import { Schema } from "@effect/schema";
import type { CustomResourceOptions, Input } from "@pulumi/pulumi";
import {
  type CreateResult,
  type DiffResult,
  Resource,
  type ResourceProvider,
  type UpdateResult,
} from "@pulumi/pulumi/dynamic";
import { Array as A, Effect as E, Schedule, pipe } from "effect";

import { canonicalJSON, type unwrapInput } from "./utils";

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
type QueueConsumerProviderState = QueueConsumerProviderArgs & {
  consumerId: string;
};

class QueueConsumerProvider
  implements
    ResourceProvider<QueueConsumerProviderArgs, QueueConsumerProviderState>
{
  constructor(private apiToken: string) {}

  async create(
    args: QueueConsumerProviderArgs,
  ): Promise<CreateResult<QueueConsumerProviderState>> {
    const { consumer_id } = await E.runPromise(
      createQueueConsumer(this.apiToken, args),
    );
    return {
      id: crypto.randomUUID(),
      outs: { ...args, consumerId: consumer_id },
    };
  }

  async diff(
    _id: string,
    olds: QueueConsumerProviderState,
    news: QueueConsumerProviderArgs,
  ): Promise<DiffResult> {
    return E.runPromise(diffQueueConsumer(olds, news));
  }

  async update(
    _id: string,
    olds: QueueConsumerProviderState,
    news: QueueConsumerProviderArgs,
  ): Promise<UpdateResult<QueueConsumerProviderState>> {
    await E.runPromise(
      updateQueueConsumer(this.apiToken, olds.consumerId, news),
    );
    return {
      outs: { ...news, consumerId: olds.consumerId },
    };
  }

  async delete(_id: string, props: QueueConsumerProviderState): Promise<void> {
    await E.runPromise(deleteQueueConsumer(this.apiToken, props));
  }
}

const params = (args: QueueConsumerProviderArgs) => {
  const params: Record<
    string,
    string | Record<string, number | undefined> | undefined
  > = {
    type: "worker",
    script_name: args.scriptName,
    dead_letter_queue: args.deadLetterQueue,
  };
  if (
    args.batchSize ||
    args.maxRetries ||
    args.maxWaitTimeMs ||
    args.retryDelay ||
    args.maxConsumerConcurrency
  ) {
    params.settings = {
      batch_size: args.batchSize,
      max_retries: args.maxRetries,
      max_wait_time_ms: args.maxWaitTimeMs,
      retry_delay: args.retryDelay,
      max_concurrency: args.maxConsumerConcurrency,
    };
  }
  return params;
};

const CreateQueueConsumerResponse = Schema.Struct({
  consumer_id: Schema.String.pipe(Schema.nonEmpty()),
});

const createQueueConsumer = (
  apiToken: string,
  args: QueueConsumerProviderArgs,
) =>
  pipe(
    HttpBody.json(params(args)),
    E.flatMap((body) =>
      E.scoped(
        E.retry(
          Http.fetchOk(
            HttpClientRequest.post(
              `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(args.accountId)}/queues/${encodeURIComponent(args.queueId)}/consumers`,
              {
                headers: {
                  Authorization: `Bearer ${apiToken}`,
                  "Content-Type": "application/json",
                },
                body,
              },
            ),
          ),
          Schedule.addDelay(Schedule.recurs(5), () => "1 second"),
        ),
      ),
    ),
    E.flatMap((resp) => resp.json),
    E.flatMap(Schema.decodeUnknown(CreateQueueConsumerResponse)),
  );

const diffQueueConsumer = (
  olds: QueueConsumerProviderState,
  news: QueueConsumerProviderArgs,
): E.Effect<DiffResult> =>
  pipe(
    E.Do,
    E.let("replaces", () =>
      pipe(
        ["accountId", "queueId"] as const,
        A.flatMap((key) => (olds[key] === news[key] ? [] : [key])),
      ),
    ),
    E.bind("changes", ({ replaces }) =>
      pipe(
        E.Do,
        E.let("withReplaces", () => replaces.length > 0),
        E.let(
          "withoutUpdate",
          () => canonicalJSON(olds) === canonicalJSON(news),
        ),
        E.map(
          ({ withReplaces, withoutUpdate }) => withReplaces || !withoutUpdate,
        ),
      ),
    ),
  );

const updateQueueConsumer = (
  apiToken: string,
  consumerId: string,
  args: QueueConsumerProviderArgs,
) =>
  pipe(
    HttpBody.json(params(args)),
    E.flatMap((body) =>
      E.scoped(
        E.retry(
          Http.fetchOk(
            HttpClientRequest.post(
              `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(args.accountId)}/queues/${encodeURIComponent(args.queueId)}/consumers/${encodeURIComponent(consumerId)}`,
              {
                headers: {
                  Authorization: `Bearer ${apiToken}`,
                  "Content-Type": "application/json",
                },
                body,
              },
            ),
          ),
          Schedule.addDelay(Schedule.recurs(5), () => "1 second"),
        ),
      ),
    ),
    E.flatMap((resp) => resp.text),
  );

const deleteQueueConsumer = (
  apiToken: string,
  props: QueueConsumerProviderState,
) =>
  E.scoped(
    E.retry(
      Http.fetchOk(
        HttpClientRequest.del(
          `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(props.accountId)}/queues/${encodeURIComponent(props.queueId)}/consumers/${encodeURIComponent(props.consumerId)}`,
          {
            headers: { Authorization: `Bearer ${apiToken}` },
          },
        ),
      ),
      Schedule.addDelay(Schedule.recurs(5), () => "1 second"),
    ),
  );

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
