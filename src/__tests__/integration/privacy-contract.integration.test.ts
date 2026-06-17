// Contract tests for find_matches() response shape — Risk #3: Location Privacy Leak.
// Asserts only allowed fields appear and no location data leaks through.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient, getAuthenticatedClient } from "../helpers/supabase";
import {
  createTestUser,
  createTestDog,
  createTestPin,
  cleanupTestUser,
} from "../helpers/seed";

const ALLOWED_FIELDS = [
  "profile_id",
  "display_name",
  "bio",
  "dog_name",
  "dog_breed",
  "dog_photo_path",
  "distance_bucket",
];

const FORBIDDEN_FIELDS = [
  "lat",
  "lng",
  "radius_m",
  "overlap",
  "location",
  "distance",
];

describe("find_matches() — Risk #3: Location Privacy Contract", () => {
  let admin: SupabaseClient;
  let userA: { userId: string; email: string; password: string };
  let userB: { userId: string; email: string; password: string };
  let matchResult: Record<string, unknown>[];

  beforeAll(async () => {
    admin = getAdminClient();

    userA = await createTestUser(admin, { displayName: "Privacy A" });
    userB = await createTestUser(admin, { displayName: "Privacy B" });

    const { dogId: dogA } = await createTestDog(admin, { ownerId: userA.userId });
    const { dogId: dogB } = await createTestDog(admin, { ownerId: userB.userId });

    // Overlapping pins to guarantee a match result to inspect
    // Use distinct coordinates from other test files to avoid cross-test pollution
    await createTestPin(admin, { dogId: dogA, lat: 50.06, lng: 19.94, radiusM: 500 });
    await createTestPin(admin, { dogId: dogB, lat: 50.0605, lng: 19.94, radiusM: 500 });

    const client = await getAuthenticatedClient(userA.email, userA.password);
    const { data, error } = await client.rpc("find_matches", {
      requesting_user_id: userA.userId,
    });

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    matchResult = data!;
  });

  afterAll(async () => {
    await cleanupTestUser(admin, userA.userId);
    await cleanupTestUser(admin, userB.userId);
  });

  it("response contains only allowed fields", () => {
    const keys = Object.keys(matchResult[0]);
    for (const key of keys) {
      expect(ALLOWED_FIELDS).toContain(key);
    }
    // Also verify all allowed fields are present
    for (const field of ALLOWED_FIELDS) {
      expect(keys).toContain(field);
    }
  });

  it("response excludes location fields explicitly", () => {
    const keys = Object.keys(matchResult[0]);
    for (const field of FORBIDDEN_FIELDS) {
      expect(keys).not.toContain(field);
    }
  });

  it("distance_bucket is one of allowed values", () => {
    const validBuckets = ["nearby", "moderate", "far"];
    expect(validBuckets).toContain(matchResult[0].distance_bucket);
  });
});
