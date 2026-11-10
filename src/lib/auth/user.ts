import * as userQueries from "@/lib/db/queries/users";
import type { User, AuthChannel } from "@/types/auth";
import { ValidationError } from "./errors";

/**
 * Finds a user by their UUID primary key.
 */
export async function findUserById(id: string): Promise<User | null> {
  return userQueries.findUserById(id);
}

/**
 * Finds a user based on identifier and channel type.
 */
export async function findUserByIdentifier(
  identifier: string,
  type: AuthChannel
): Promise<User | null> {
  if (!identifier) {
    throw new ValidationError("User identifier is required.");
  }

  if (type === "email") {
    return userQueries.findUserByEmail(identifier);
  }

  throw new ValidationError("Unsupported authentication channel type.");
}

/**
 * Retrieves an existing user or creates a new one if not present.
 */
export async function getOrCreateUserByIdentifier(
  identifier: string,
  type: AuthChannel
): Promise<User> {
  if (type === "email") {
    return userQueries.findOrCreateUser({ email: identifier });
  }

  throw new ValidationError("Unsupported authentication channel type.");
}
