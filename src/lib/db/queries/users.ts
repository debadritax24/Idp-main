import db from "@/lib/db";
import { type DbUserRow, mapDbUser } from "@/lib/db/types";
import type { User } from "@/types/auth";

export interface CreateUserInput {
  email?: string | null;
  phone?: string | null;
}

/**
 * Finds a user by their unique primary key UUID.
 */
export async function findUserById(id: string): Promise<User | null> {
  const rows = await db<DbUserRow[]>`
    SELECT id, email, phone, created_at, updated_at
    FROM users
    WHERE id = ${id}
    LIMIT 1;
  `;
  return rows[0] ? mapDbUser(rows[0]) : null;
}

/**
 * Finds a user by their unique verified email address.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await db<DbUserRow[]>`
    SELECT id, email, phone, created_at, updated_at
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1;
  `;
  return rows[0] ? mapDbUser(rows[0]) : null;
}

/**
 * Finds a user by their unique verified phone number.
 */
export async function findUserByPhone(phone: string): Promise<User | null> {
  const normalizedPhone = phone.trim();
  const rows = await db<DbUserRow[]>`
    SELECT id, email, phone, created_at, updated_at
    FROM users
    WHERE phone = ${normalizedPhone}
    LIMIT 1;
  `;
  return rows[0] ? mapDbUser(rows[0]) : null;
}

/**
 * Finds a user by either email or phone.
 */
export async function findUserByIdentifier({
  email,
  phone,
}: {
  email?: string | null;
  phone?: string | null;
}): Promise<User | null> {
  if (email) return findUserByEmail(email);
  if (phone) return findUserByPhone(phone);
  return null;
}

/**
 * Creates a new user record.
 */
export async function createUser({ email, phone }: CreateUserInput): Promise<User> {
  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = phone ? phone.trim() : null;

  if (normalizedEmail) {
    const rows = await db<DbUserRow[]>`
      INSERT INTO users (email, phone)
      VALUES (${normalizedEmail}, ${normalizedPhone})
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id, email, phone, created_at, updated_at;
    `;
    return mapDbUser(rows[0]);
  }

  if (normalizedPhone) {
    const rows = await db<DbUserRow[]>`
      INSERT INTO users (email, phone)
      VALUES (${normalizedEmail}, ${normalizedPhone})
      ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
      RETURNING id, email, phone, created_at, updated_at;
    `;
    return mapDbUser(rows[0]);
  }

  throw new Error("Either email or phone must be provided to create a user.");
}

/**
 * Upserts a user by email or phone.
 * If user exists, returns existing user; otherwise creates and returns new user.
 */
export async function findOrCreateUser({ email, phone }: CreateUserInput): Promise<User> {
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const rows = await db<DbUserRow[]>`
      INSERT INTO users (email)
      VALUES (${normalizedEmail})
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id, email, phone, created_at, updated_at;
    `;
    return mapDbUser(rows[0]);
  }
  if (phone) {
    const normalizedPhone = phone.trim();
    const rows = await db<DbUserRow[]>`
      INSERT INTO users (phone)
      VALUES (${normalizedPhone})
      ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
      RETURNING id, email, phone, created_at, updated_at;
    `;
    return mapDbUser(rows[0]);
  }
  throw new Error("Either email or phone must be provided to create a user.");
}
