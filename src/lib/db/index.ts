import postgres from "postgres";

/**
 * Global declaration to preserve the Postgres client across Next.js HMR reloads.
 */
declare global {
  // eslint-disable-next-line no-var
  var __postgresDbClient: postgres.Sql | undefined;
}

/**
 * Retrieves the effective PostgreSQL connection string from environment variables.
 * Prioritizes DATABASE_URL (connection pooler), falls back to DIRECT_URL.
 */
export function getConnectionString(): string {
  const connectionString =
    process.env.DATABASE_URL || process.env.DATABASE_UR || process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error(
      "Database configuration error: Neither DATABASE_URL nor DIRECT_URL is set in .env."
    );
  }
  return connectionString;
}

/**
 * Determines whether SSL should be enforced based on environment or connection string.
 * Supabase requires SSL ('require').
 */
function shouldRequireSsl(connectionString: string): boolean | "require" {
  if (
    connectionString.includes("supabase.com") ||
    connectionString.includes("supabase.co") ||
    connectionString.includes("sslmode=require")
  ) {
    return "require";
  }
  return process.env.NODE_ENV === "production" ? "require" : false;
}

/**
 * Creates a configured postgres.js client instance.
 */
function createDbClient(): postgres.Sql {
  const connectionString = getConnectionString();
  const isSsl = shouldRequireSsl(connectionString);

  return postgres(connectionString, {
    max: 10, // Max connection pool size
    idle_timeout: 20, // Idle connection timeout in seconds
    connect_timeout: 10, // Connection acquisition timeout in seconds
    ssl: isSsl,
    prepare: false, // Recommended for PgBouncer / transaction poolers
    onnotice: () => {}, // Suppress notice logs
  });
}

/**
 * Lazily retrieves or initializes the singleton database instance.
 * In development, cached on globalThis to prevent connection leaks during Next.js hot reloading.
 */
export function getDb(): postgres.Sql {
  if (!globalThis.__postgresDbClient) {
    globalThis.__postgresDbClient = createDbClient();
  }
  return globalThis.__postgresDbClient;
}

/**
 * Lazy database proxy. Defers connection creation until an actual query is triggered.
 */
export const db: postgres.Sql = new Proxy((() => {}) as unknown as postgres.Sql, {
  apply(_target, thisArg, argArray) {
    const client = getDb();
    return Reflect.apply(client, thisArg, argArray);
  },
  get(_target, prop, receiver) {
    const client = getDb();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default db;

/**
 * Gracefully terminates the database client pool.
 */
export async function closeDb(): Promise<void> {
  if (globalThis.__postgresDbClient) {
    await globalThis.__postgresDbClient.end();
    globalThis.__postgresDbClient = undefined;
  }
}
