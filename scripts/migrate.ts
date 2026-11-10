import fs from "fs";
import path from "path";
import postgres from "postgres";

async function runMigrations() {
  console.log("=================================================");
  console.log("   Running Supabase PostgreSQL Migrations        ");
  console.log("=================================================");

  const connectionString =
    process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.DATABASE_UR;

  if (!connectionString || connectionString.includes("[YOUR-PASSWORD]")) {
    console.log("Migration skipped: Real DATABASE_URL or DIRECT_URL not configured in .env.");
    console.log("Please supply your Supabase credentials in .env to run migrations.");
    process.exit(0);
  }

  const isSupabase =
    connectionString.includes("supabase.com") ||
    connectionString.includes("supabase.co") ||
    connectionString.includes("sslmode=require");
  const sqlClient = postgres(connectionString, {
    max: 1,
    ssl: isSupabase || process.env.NODE_ENV === "production" ? "require" : false,
    prepare: false,
  });

  try {
    const schemaPath = path.resolve(process.cwd(), "sql/schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");

    console.log(`Applying schema from: ${schemaPath}`);
    await sqlClient.unsafe(schemaSql);
    console.log("Migrations applied successfully!");

    // Verify created tables
    const tables = await sqlClient<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'auth_tokens', 'sessions', 'authentication_attempts');
    `;
    console.log("Verified tables in database:", tables.map((t) => t.table_name).join(", "));
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

runMigrations().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
