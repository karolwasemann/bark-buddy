// Test data factory for integration tests.
// Seeds users, profiles, dogs, and walking pins via the admin (service_role) client.

import { SupabaseClient } from "@supabase/supabase-js";

interface TestUser {
  userId: string;
  email: string;
  password: string;
}

interface CreateTestUserOpts {
  displayName?: string;
  bio?: string;
}

/** Creates an auth user + profile. Returns credentials for later sign-in. */
export async function createTestUser(
  admin: SupabaseClient,
  opts?: CreateTestUserOpts
): Promise<TestUser> {
  const email = `test-${crypto.randomUUID()}@test.local`;
  const password = "Test1234!";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createTestUser: ${error.message}`);

  const userId = data.user.id;

  // Insert profile row
  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId,
    display_name: opts?.displayName ?? "Test User",
    bio: opts?.bio ?? null,
  });
  if (profileErr) throw new Error(`createTestUser profile: ${profileErr.message}`);

  return { userId, email, password };
}

interface CreateTestDogOpts {
  ownerId: string;
  name?: string;
  breed?: string;
  photoPath?: string;
}

/** Inserts a dog row. Returns the dog ID. */
export async function createTestDog(
  admin: SupabaseClient,
  opts: CreateTestDogOpts
): Promise<{ dogId: string }> {
  const { data, error } = await admin
    .from("dogs")
    .insert({
      owner_id: opts.ownerId,
      name: opts.name ?? "Buddy",
      breed: opts.breed ?? "Labrador",
      photo_path: opts.photoPath ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`createTestDog: ${error.message}`);
  return { dogId: data.id };
}

interface CreateTestPinOpts {
  dogId: string;
  lat: number;
  lng: number;
  radiusM?: number;
}

/** Inserts a walking_pin with PostGIS geography point. Returns pin ID. */
export async function createTestPin(
  admin: SupabaseClient,
  opts: CreateTestPinOpts
): Promise<{ pinId: string }> {
  // location is a generated column computed from lat/lng — no need to set it manually
  const { data, error } = await admin
    .from("walking_pins")
    .insert({
      dog_id: opts.dogId,
      lat: opts.lat,
      lng: opts.lng,
      radius_m: opts.radiusM ?? 1000,
    })
    .select("id")
    .single();
  if (error) throw new Error(`createTestPin: ${error.message}`);
  return { pinId: data.id };
}

/** Deletes a test user and all cascading data (profile → dogs → pins). */
export async function cleanupTestUser(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`cleanupTestUser: ${error.message}`);
}
