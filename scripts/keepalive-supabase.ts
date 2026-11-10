import fs from "fs";
import path from "path";
import postgres from "postgres";

// Load local .env file if available (for manual / local CLI runs)
if (fs.existsSync(path.resolve(process.cwd(), ".env"))) {
  try {
    const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed
          .slice(eqIdx + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {
    // Ignore .env read errors
  }
}

/**
 * Extracts Supabase project reference from connection string or URL
 */
function extractProjectRef(str: string): string | null {
  const poolerMatch = str.match(/postgres\.([a-z0-9]+)/i);
  if (poolerMatch) return poolerMatch[1];
  const directMatch = str.match(/db\.([a-z0-9]+)\.supabase\.(?:co|com)/i);
  if (directMatch) return directMatch[1];
  const urlMatch = str.match(/([a-z0-9]+)\.supabase\.(?:co|com)/i);
  if (urlMatch && urlMatch[1] !== "db") return urlMatch[1];
  return null;
}

/**
 * Pings Supabase API Gateway to register HTTPS activity
 */
async function pingSupabaseGateway(projectRef: string, apiKey?: string): Promise<boolean> {
  const targetUrl = `https://${projectRef}.supabase.co/rest/v1/`;
  console.log(`[1/2] Pinging Supabase API Gateway: ${targetUrl}`);
  try {
    const headers: Record<string, string> = {
      "User-Agent": "Supabase-KeepAlive-CI/1.0",
    };
    if (apiKey) {
      headers["apikey"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(targetUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    const sbProjectRef = res.headers.get("sb-project-ref") || projectRef;
    console.log(`      >> Gateway Status: HTTP ${res.status} (Project: ${sbProjectRef})`);
    return true;
  } catch (err) {
    const cause = (err as Record<string, unknown>)?.cause as Record<string, unknown> | undefined;
    const causeDetail = cause?.message || cause?.code ? ` (${cause?.message || cause?.code})` : "";
    const baseMsg = err instanceof Error ? err.message : String(err);
    console.warn(`      >> Gateway notice: ${baseMsg}${causeDetail}`);
    return false;
  }
}

/**
 * Connects directly to PostgreSQL and executes a database touch query
 */
async function executeDatabaseHeartbeat(
  connectionString: string,
  label = "PostgreSQL"
): Promise<void> {
  const startTime = Date.now();
  console.log(`[2/2] Connecting to ${label}...`);

  const isSupabase =
    connectionString.includes("supabase.com") ||
    connectionString.includes("supabase.co") ||
    connectionString.includes("sslmode=require");
  const sqlClient = postgres(connectionString, {
    max: 1,
    connect_timeout: 15,
    ssl: isSupabase || process.env.NODE_ENV === "production" ? "require" : false,
    prepare: false,
  });

  try {
    // 1. Heartbeat timestamp and version
    const heartbeat = await sqlClient`
      SELECT 
        NOW() AS server_time,
        version() AS version,
        current_database() AS db_name;
    `;

    const serverTime = heartbeat[0]?.server_time;
    const version = heartbeat[0]?.version;
    const dbName = heartbeat[0]?.db_name;

    // 2. Query table counts to keep all primary tables cached & primed
    const stats = await sqlClient`
      SELECT 
        (SELECT count(*) FROM users)::int AS users_count,
        (SELECT count(*) FROM auth_tokens)::int AS tokens_count,
        (SELECT count(*) FROM sessions)::int AS sessions_count,
        (SELECT count(*) FROM authentication_attempts)::int AS attempts_count;
    `;

    const latency = Date.now() - startTime;

    console.log("      >> Database Query: SUCCESS");
    console.log(`      Database Name   : ${dbName}`);
    console.log(`      PostgreSQL Ver  : ${String(version).split(" ").slice(0, 2).join(" ")}`);
    console.log(`      Server Time     : ${serverTime}`);
    console.log(
      `      Live Table Data : users: ${stats[0]?.users_count}, tokens: ${stats[0]?.tokens_count}, sessions: ${stats[0]?.sessions_count}, attempts: ${stats[0]?.attempts_count}`
    );
    console.log(`      Query Latency   : ${latency}ms`);
  } finally {
    await sqlClient.end();
  }
}

/**
 * Executes heartbeat with retry attempts and backoff
 */
async function attemptHeartbeatWithRetry(
  connectionString: string,
  label: string,
  maxRetries = 2
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`\n[Retry ${attempt}/${maxRetries}] Retrying connection to ${label}...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      await executeDatabaseHeartbeat(connectionString, label);
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`      >> Attempt ${attempt} failed: ${errorMsg}`);
    }
  }
}

async function main() {
  console.log("=================================================");
  console.log("      Supabase Database Keep-Alive Trigger       ");
  console.log("=================================================");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const primaryConn = process.env.DATABASE_URL || process.env.DATABASE_UR;
  const directConn = process.env.DIRECT_URL;
  const connectionString = primaryConn || directConn;

  const projectRef =
    process.env.SUPABASE_PROJECT_REF ||
    (connectionString ? extractProjectRef(connectionString) : null);
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1. Touch Supabase HTTP Gateway
  if (projectRef) {
    await pingSupabaseGateway(projectRef, anonKey);
  }

  // 2. Touch PostgreSQL Database
  if (!connectionString) {
    if (projectRef) {
      console.log("\nNote: DATABASE_URL not set; API gateway ping completed.");
      process.exit(0);
    }
    if (process.env.GITHUB_ACTIONS === "true") {
      console.error(
        "::error title=Missing Supabase Secret::Neither DATABASE_URL nor DIRECT_URL is configured in GitHub repository secrets!"
      );
    }
    console.error("\nERROR: Neither DATABASE_URL nor DIRECT_URL is configured.");
    console.error("Please provide your Supabase connection string as a GitHub Secret or in .env.");
    process.exit(1);
  }

  if (
    connectionString.includes("[YOUR-PASSWORD]") ||
    connectionString.includes("aws-0-region.pooler.supabase.com")
  ) {
    console.warn("\nWARNING: Placeholder credentials detected ([YOUR-PASSWORD]).");
    console.warn("Skipping query because real credentials are not yet configured.");
    process.exit(0);
  }

  try {
    // Attempt primary connection
    try {
      const label = primaryConn ? "PostgreSQL (Pooler / DATABASE_URL)" : "PostgreSQL (DIRECT_URL)";
      await attemptHeartbeatWithRetry(connectionString, label, 2);
    } catch (primaryErr) {
      // If primary pooler connection failed but DIRECT_URL is configured and different, try direct connection
      if (directConn && directConn !== connectionString) {
        console.warn("\nPrimary connection failed. Attempting fallback via DIRECT_URL...");
        await attemptHeartbeatWithRetry(directConn, "PostgreSQL (DIRECT_URL fallback)", 2);
      } else {
        throw primaryErr;
      }
    }

    console.log("-------------------------------------------------");
    console.log("STATUS: SUCCESS. Supabase Database is ACTIVE.");
    console.log("Inactivity pause timer has been reset for another 7 days.");
    console.log("=================================================");
    process.exit(0);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("\n>> Database Heartbeat Failed:", errorMsg);
    console.error("-------------------------------------------------");

    const isTenantNotFound = errorMsg.includes("tenant") && errorMsg.includes("not found");
    if (isTenantNotFound) {
      console.error("DIAGNOSIS: Supabase Project is Paused or Inactive.");
      console.error("The Supabase pooler could not locate the tenant. On the free tier,");
      console.error("projects pause after 7 days of inactivity. Connections are disabled");
      console.error("until the project is un-paused via the Supabase dashboard.\n");
    }

    const dashboardUrl = projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}`
      : "https://supabase.com/dashboard";
    console.error("To restore/un-pause your project, please visit:");
    console.error(dashboardUrl);
    console.error(
      "\nOnce un-paused, this scheduled CI/CD job will run regularly to keep it active."
    );
    console.error("=================================================");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
