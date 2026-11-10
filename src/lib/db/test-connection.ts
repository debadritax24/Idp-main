import { getConnectionString } from "./index";
import postgres from "postgres";

export interface DbConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    databaseTime?: string;
    postgresVersion?: string;
    tablesFound?: string[];
    isSupabase?: boolean;
  };
  error?: string;
}

/**
 * Tests database connectivity and checks for the required auth tables.
 * Safe for execution in both CI and local developer runtimes.
 */
export async function testDatabaseConnection(): Promise<DbConnectionTestResult> {
  let connectionString: string;
  try {
    connectionString = getConnectionString();
  } catch (err) {
    return {
      success: false,
      message: "Database connection failed: missing environment configuration.",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Detect unconfigured placeholder credentials
  if (
    connectionString.includes("[YOUR-PASSWORD]") ||
    connectionString.includes("aws-0-region.pooler.supabase.com")
  ) {
    return {
      success: false,
      message:
        "Database credentials in .env contain placeholder values ([YOUR-PASSWORD]). Please supply your real Supabase PostgreSQL connection string in DATABASE_URL.",
      error: "UNCONFIGURED_PLACEHOLDER_CREDENTIALS",
    };
  }

  const isSupabase =
    connectionString.includes("supabase.com") ||
    connectionString.includes("supabase.co") ||
    connectionString.includes("sslmode=require");
  const testClient = postgres(connectionString, {
    max: 1,
    connect_timeout: 5,
    ssl: isSupabase || process.env.NODE_ENV === "production" ? "require" : false,
    prepare: false,
  });

  try {
    const versionResult = await testClient`
      SELECT NOW() AS now, version() AS version;
    `;

    const now = versionResult[0]?.now ? new Date(versionResult[0].now).toISOString() : "Unknown";
    const version = (versionResult[0]?.version as string) ?? "Unknown";

    // Inspect required schema tables
    const tableResult = await testClient<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'auth_tokens', 'sessions', 'authentication_attempts');
    `;

    const tablesFound = tableResult.map((r) => r.table_name);

    return {
      success: true,
      message: `Successfully connected to PostgreSQL database.${tablesFound.length === 4 ? " All 4 required auth tables are present." : ` ${tablesFound.length}/4 auth tables found.`}`,
      details: {
        databaseTime: now,
        postgresVersion: version.split(" ")[0] + " " + version.split(" ")[1],
        tablesFound,
        isSupabase,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: "Database connection error.",
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await testClient.end();
  }
}
