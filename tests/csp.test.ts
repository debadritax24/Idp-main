import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function getPolicy(nodeEnv: "development" | "production" | "test" | undefined): string {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: nodeEnv ?? "production",
  };
  if (nodeEnv === undefined) Reflect.deleteProperty(env, "NODE_ENV");
  return execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import config from './next.config.mjs';
    const routes = await config.headers();
    console.log(routes[0].headers.find(header => header.key === 'Content-Security-Policy').value);
  `,
    ],
    {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    }
  );
}

test("development CSP permits Next.js bundles to hydrate the login form", () => {
  assert.match(getPolicy("development"), /script-src[^;]*'unsafe-eval'/);
});

test("production and unspecified environments keep script evaluation blocked", () => {
  for (const nodeEnv of ["production", "test", undefined] as const) {
    const policy = getPolicy(nodeEnv);
    assert.ok(!policy.includes("'unsafe-eval'"));
    assert.ok(policy.includes("frame-ancestors 'none'"));
    assert.ok(policy.includes("default-src 'self'"));
  }
});
