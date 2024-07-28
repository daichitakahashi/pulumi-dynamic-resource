import { type TaskContext, describe, expect, test } from "vitest";

import { ModuleWorkerScriptProvider } from "../moduleWorkerScript";

const chdir = (ctx: TaskContext, dir: string) => {
  const cwd = process.cwd();
  process.chdir(dir);
  ctx.onTestFinished(() => {
    process.chdir(cwd);
  });
};

describe("ModuleWorkerScriptProvider.diff", () => {
  test("no diff", async (ctx) => {
    chdir(ctx, "test/scripts/normal");

    const p = new ModuleWorkerScriptProvider("");
    const diff = await p.diff(
      "",
      {
        accountId: "TEST_ACCOUNT",
        name: "test",
        scriptDir: ".",
        mainModule: "index.js",
        scriptHash:
          "81cf9a43f1fc4391a59cd7e3f6fd97c8db3659ba7ee1e22d6d428642dfc377586bf89f6291138f2693c427bc00a870d7ac0365d7a6cf6ece937ae1da92ea9178",
        plainTextBindings: [
          {
            name: "ENV",
            text: "dev",
          },
        ],
      },
      {
        accountId: "TEST_ACCOUNT",
        name: "test",
        scriptDir: ".",
        mainModule: "index.js",
        plainTextBindings: [
          {
            name: "ENV",
            text: "dev",
          },
        ],
      },
    );
    expect(diff).toStrictEqual({
      changes: false,
      replaces: [],
    });
  });

  test("change accountId", async (ctx) => {
    chdir(ctx, "test/scripts/normal");

    const p = new ModuleWorkerScriptProvider("");
    const diff = await p.diff(
      "",
      {
        accountId: "TEST_ACCOUNT",
        name: "test",
        scriptDir: ".",
        mainModule: "index.js",
        scriptHash:
          "81cf9a43f1fc4391a59cd7e3f6fd97c8db3659ba7ee1e22d6d428642dfc377586bf89f6291138f2693c427bc00a870d7ac0365d7a6cf6ece937ae1da92ea9178",
      },
      {
        accountId: "ANOTHER_TEST_ACCOUNT",
        name: "test",
        scriptDir: ".",
        mainModule: "index.js",
      },
    );
    expect(diff).toStrictEqual({
      changes: true,
      replaces: ["accountId"],
    });
  });

  test("change script name", async (ctx) => {
    chdir(ctx, "test/scripts/normal");

    const p = new ModuleWorkerScriptProvider("");
    const diff = await p.diff(
      "",
      {
        accountId: "TEST_ACCOUNT",
        name: "test",
        scriptDir: ".",
        mainModule: "index.js",
        scriptHash:
          "81cf9a43f1fc4391a59cd7e3f6fd97c8db3659ba7ee1e22d6d428642dfc377586bf89f6291138f2693c427bc00a870d7ac0365d7a6cf6ece937ae1da92ea9178",
      },
      {
        accountId: "TEST_ACCOUNT",
        name: "another-test",
        scriptDir: ".",
        mainModule: "index.js",
      },
    );
    expect(diff).toStrictEqual({
      changes: true,
      replaces: ["name"],
    });
  });

  test("change script content", async (ctx) => {
    chdir(ctx, "test/scripts/modified");

    const p = new ModuleWorkerScriptProvider("");
    const diff = await p.diff(
      "",
      {
        accountId: "TEST_ACCOUNT",
        name: "test",
        scriptDir: ".",
        mainModule: "index.js",
        scriptHash:
          "81cf9a43f1fc4391a59cd7e3f6fd97c8db3659ba7ee1e22d6d428642dfc377586bf89f6291138f2693c427bc00a870d7ac0365d7a6cf6ece937ae1da92ea9178",
      },
      {
        accountId: "TEST_ACCOUNT",
        name: "test",
        scriptDir: ".",
        mainModule: "index.js",
      },
    );
    expect(diff).toStrictEqual({
      changes: true,
      replaces: [],
    });
  });

  test("add binding", async (ctx) => {
    chdir(ctx, "test/scripts/normal");

    const p = new ModuleWorkerScriptProvider("");
    const diff = await p.diff(
      "",
      {
        accountId: "TEST_ACCOUNT",
        name: "test",
        scriptDir: ".",
        mainModule: "index.js",
        scriptHash:
          "81cf9a43f1fc4391a59cd7e3f6fd97c8db3659ba7ee1e22d6d428642dfc377586bf89f6291138f2693c427bc00a870d7ac0365d7a6cf6ece937ae1da92ea9178",
        plainTextBindings: [
          {
            name: "ENV",
            text: "dev",
          },
        ],
      },
      {
        accountId: "TEST_ACCOUNT",
        name: "test",
        scriptDir: ".",
        mainModule: "index.js",
        plainTextBindings: [
          {
            name: "ENV",
            text: "dev",
          },
          {
            name: "VALUE",
            text: "0",
          },
        ],
      },
    );
    expect(diff).toStrictEqual({
      changes: true,
      replaces: [],
    });
  });
});
