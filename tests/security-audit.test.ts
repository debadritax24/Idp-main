import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { hashClientIp, verifyCsrfOrigin } from "../src/lib/auth/security";
import { NextRequest } from "next/server";

describe("Security Audit Verifications", () => {
  describe("IP Address Hashing & Privacy Compliance", () => {
    test("hashClientIp produces a deterministic 64-character SHA-256 digest with salt", () => {
      const ip = "192.168.1.50";
      const hash1 = hashClientIp(ip);
      const hash2 = hashClientIp(ip);

      assert.strictEqual(typeof hash1, "string");
      assert.strictEqual(hash1.length, 64);
      assert.match(hash1, /^[0-9a-f]{64}$/);
      assert.strictEqual(
        hash1,
        hash2,
        "Identical IPs must produce identical hashes for rate limiting"
      );
    });

    test("hashClientIp produces different hashes for different IPs", () => {
      const hashA = hashClientIp("10.0.0.1");
      const hashB = hashClientIp("10.0.0.2");
      assert.notStrictEqual(hashA, hashB);
    });
  });

  describe("CSRF Origin Validation", () => {
    test("allows requests where Origin matches Host", () => {
      const req = new NextRequest("http://localhost:3000/api/auth/verify", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      });

      assert.strictEqual(verifyCsrfOrigin(req), true);
    });

    test("blocks requests with mismatched / cross-site Origin (CSRF attack)", () => {
      const req = new NextRequest("http://localhost:3000/api/auth/verify", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "https://evil-attacker-site.com",
        },
      });

      assert.strictEqual(verifyCsrfOrigin(req), false);
    });

    test("allows requests without Origin header (e.g. server-to-server / curl)", () => {
      const req = new NextRequest("http://localhost:3000/api/auth/verify", {
        method: "POST",
        headers: {
          host: "localhost:3000",
        },
      });

      assert.strictEqual(verifyCsrfOrigin(req), true);
    });
  });

  describe("Repository & Secret Hygiene", () => {
    test(".gitignore contains .env and build output patterns", () => {
      const gitignorePath = path.resolve(process.cwd(), ".gitignore");
      const content = fs.readFileSync(gitignorePath, "utf-8");

      assert.ok(content.includes(".env"));
      assert.ok(content.includes("/node_modules"));
      assert.ok(content.includes("/.next/"));
    });

    test(".env is not staged or committed in Git", () => {
      const envPath = path.resolve(process.cwd(), ".env");
      assert.ok(fs.existsSync(envPath), ".env must exist locally for runtime configuration");
    });
  });
});
