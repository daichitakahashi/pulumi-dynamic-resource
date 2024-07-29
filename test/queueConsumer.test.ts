import { describe, expect, test } from "vitest";

import { QueueConsumerProvider } from "../queueConsumer";

describe("QueueConsumerProvider.diff", () => {
  test("no diff", async () => {
    const p = new QueueConsumerProvider("");
    const diff = await p.diff(
      "",
      {
        accountId: "TEST_ACCOUNT",
        queueId: "c984acf0-8499-48c5-b7a5-66788c8cc957",
        scriptName: "test",
        consumerId: "469ccc86-1e14-487a-9eef-72f70d8ae109",
      },
      {
        accountId: "TEST_ACCOUNT",
        queueId: "c984acf0-8499-48c5-b7a5-66788c8cc957",
        scriptName: "test",
      },
    );
    expect(diff).toStrictEqual({
      changes: false,
      replaces: [],
    });
  });

  test("change accountId", async () => {
    const p = new QueueConsumerProvider("");
    const diff = await p.diff(
      "",
      {
        accountId: "TEST_ACCOUNT",
        queueId: "c984acf0-8499-48c5-b7a5-66788c8cc957",
        scriptName: "test",
        consumerId: "469ccc86-1e14-487a-9eef-72f70d8ae109",
      },
      {
        accountId: "ANOTHER_TEST_ACCOUNT",
        queueId: "c984acf0-8499-48c5-b7a5-66788c8cc957",
        scriptName: "test",
      },
    );
    expect(diff).toStrictEqual({
      changes: true,
      replaces: ["accountId"],
    });
  });

  test("change queueId", async () => {
    const p = new QueueConsumerProvider("");
    const diff = await p.diff(
      "",
      {
        accountId: "TEST_ACCOUNT",
        queueId: "c984acf0-8499-48c5-b7a5-66788c8cc957",
        scriptName: "test",
        consumerId: "469ccc86-1e14-487a-9eef-72f70d8ae109",
      },
      {
        accountId: "TEST_ACCOUNT",
        queueId: "446467c3-6e30-4da2-8f4e-81f4ff1996f5",
        scriptName: "test",
      },
    );
    expect(diff).toStrictEqual({
      changes: true,
      replaces: ["queueId"],
    });
  });

  test("change dead letter queue", async () => {
    const p = new QueueConsumerProvider("");
    const diff = await p.diff(
      "",
      {
        accountId: "TEST_ACCOUNT",
        queueId: "c984acf0-8499-48c5-b7a5-66788c8cc957",
        scriptName: "test",
        consumerId: "469ccc86-1e14-487a-9eef-72f70d8ae109",
      },
      {
        accountId: "TEST_ACCOUNT",
        queueId: "c984acf0-8499-48c5-b7a5-66788c8cc957",
        scriptName: "test",
        deadLetterQueue: "f295aa0d-a9fd-4363-974f-abf43f2e4b8a",
      },
    );
    expect(diff).toStrictEqual({
      changes: true,
      replaces: [],
    });
  });
});
