// Integration tests for find_matches() RPC — Risk #1: Silent Matching Failure.
// Proves the matching pipeline returns correct results for various user configurations.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient, getAuthenticatedClient } from "../helpers/supabase";
import {
  createTestUser,
  createTestDog,
  createTestPin,
  cleanupTestUser,
} from "../helpers/seed";

// Warsaw center reference point
const BASE_LAT = 52.23;
const BASE_LNG = 21.01;

// ~0.009 degrees latitude ≈ 1km
function offsetLat(km: number): number {
  return BASE_LAT + km * 0.009;
}

describe("find_matches() — Risk #1: Silent Matching Failure", () => {
  let admin: SupabaseClient;

  beforeAll(() => {
    admin = getAdminClient();
  });

  describe("returns match for overlapping users", () => {
    let userA: { userId: string; email: string; password: string };
    let userB: { userId: string; email: string; password: string };

    beforeAll(async () => {
      userA = await createTestUser(admin, { displayName: "User A" });
      userB = await createTestUser(admin, { displayName: "User B" });

      const { dogId: dogA } = await createTestDog(admin, { ownerId: userA.userId });
      const { dogId: dogB } = await createTestDog(admin, { ownerId: userB.userId });

      // 500m apart, radius 400m each → significant overlap (>10%)
      await createTestPin(admin, { dogId: dogA, lat: BASE_LAT, lng: BASE_LNG, radiusM: 400 });
      await createTestPin(admin, { dogId: dogB, lat: offsetLat(0.5), lng: BASE_LNG, radiusM: 400 });
    });

    afterAll(async () => {
      await cleanupTestUser(admin, userA.userId);
      await cleanupTestUser(admin, userB.userId);
    });

    it("returns 1 match with correct fields", async () => {
      const client = await getAuthenticatedClient(userA.email, userA.password);
      const { data, error } = await client.rpc("find_matches", {
        requesting_user_id: userA.userId,
      });

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
      const match = data!.find((m: Record<string, unknown>) => m.profile_id === userB.userId);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        profile_id: userB.userId,
        display_name: "User B",
        dog_name: "Buddy",
        dog_breed: "Labrador",
      });
      expect(match!.distance_bucket).toBeDefined();
    });
  });

  describe("returns empty for non-overlapping users", () => {
    let userA: { userId: string; email: string; password: string };
    let userB: { userId: string; email: string; password: string };

    beforeAll(async () => {
      userA = await createTestUser(admin);
      userB = await createTestUser(admin);

      const { dogId: dogA } = await createTestDog(admin, { ownerId: userA.userId });
      const { dogId: dogB } = await createTestDog(admin, { ownerId: userB.userId });

      // 10km apart, radius 200m each → no overlap
      await createTestPin(admin, { dogId: dogA, lat: BASE_LAT, lng: BASE_LNG, radiusM: 200 });
      await createTestPin(admin, { dogId: dogB, lat: offsetLat(10), lng: BASE_LNG, radiusM: 200 });
    });

    afterAll(async () => {
      await cleanupTestUser(admin, userA.userId);
      await cleanupTestUser(admin, userB.userId);
    });

    it("returns empty array", async () => {
      const client = await getAuthenticatedClient(userA.email, userA.password);
      const { data, error } = await client.rpc("find_matches", {
        requesting_user_id: userA.userId,
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("returns empty when requester has no pin", () => {
    let userA: { userId: string; email: string; password: string };
    let userB: { userId: string; email: string; password: string };

    beforeAll(async () => {
      userA = await createTestUser(admin); // no pin
      userB = await createTestUser(admin);

      const { dogId: dogB } = await createTestDog(admin, { ownerId: userB.userId });
      await createTestPin(admin, { dogId: dogB, lat: BASE_LAT, lng: BASE_LNG, radiusM: 1000 });
    });

    afterAll(async () => {
      await cleanupTestUser(admin, userA.userId);
      await cleanupTestUser(admin, userB.userId);
    });

    it("returns empty array", async () => {
      const client = await getAuthenticatedClient(userA.email, userA.password);
      const { data, error } = await client.rpc("find_matches", {
        requesting_user_id: userA.userId,
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("excludes self from results", () => {
    let userA: { userId: string; email: string; password: string };

    beforeAll(async () => {
      userA = await createTestUser(admin);
      const { dogId } = await createTestDog(admin, { ownerId: userA.userId });
      await createTestPin(admin, { dogId, lat: BASE_LAT, lng: BASE_LNG, radiusM: 1000 });
    });

    afterAll(async () => {
      await cleanupTestUser(admin, userA.userId);
    });

    it("does not match self", async () => {
      const client = await getAuthenticatedClient(userA.email, userA.password);
      const { data, error } = await client.rpc("find_matches", {
        requesting_user_id: userA.userId,
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("respects 10% overlap threshold boundary", () => {
    let userA: { userId: string; email: string; password: string };
    let userB: { userId: string; email: string; password: string };

    beforeAll(async () => {
      userA = await createTestUser(admin);
      userB = await createTestUser(admin);

      const { dogId: dogA } = await createTestDog(admin, { ownerId: userA.userId });
      const { dogId: dogB } = await createTestDog(admin, { ownerId: userB.userId });

      // Two circles of radius 300m positioned so they barely touch.
      // Distance between centers ≈ 570m → overlap area is tiny fraction of smaller circle.
      // At distance = r1 + r2 - small_delta, overlap is well below 10%.
      await createTestPin(admin, { dogId: dogA, lat: BASE_LAT, lng: BASE_LNG, radiusM: 300 });
      await createTestPin(admin, { dogId: dogB, lat: offsetLat(0.57), lng: BASE_LNG, radiusM: 300 });
    });

    afterAll(async () => {
      await cleanupTestUser(admin, userA.userId);
      await cleanupTestUser(admin, userB.userId);
    });

    it("returns empty when overlap is below 10%", async () => {
      const client = await getAuthenticatedClient(userA.email, userA.password);
      const { data, error } = await client.rpc("find_matches", {
        requesting_user_id: userA.userId,
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("returns multiple matches ordered by distance", () => {
    let userA: { userId: string; email: string; password: string };
    let userB: { userId: string; email: string; password: string };
    let userC: { userId: string; email: string; password: string };

    beforeAll(async () => {
      userA = await createTestUser(admin, { displayName: "Center User" });
      userB = await createTestUser(admin, { displayName: "Close User" });
      userC = await createTestUser(admin, { displayName: "Far User" });

      const { dogId: dogA } = await createTestDog(admin, { ownerId: userA.userId });
      const { dogId: dogB } = await createTestDog(admin, { ownerId: userB.userId });
      const { dogId: dogC } = await createTestDog(admin, { ownerId: userC.userId });

      // User A at center with large radius to ensure overlap with B and C
      await createTestPin(admin, { dogId: dogA, lat: BASE_LAT, lng: BASE_LNG, radiusM: 5000 });
      // User B close (200m away)
      await createTestPin(admin, { dogId: dogB, lat: offsetLat(0.2), lng: BASE_LNG, radiusM: 5000 });
      // User C farther (2km away)
      await createTestPin(admin, { dogId: dogC, lat: offsetLat(2), lng: BASE_LNG, radiusM: 5000 });
    });

    afterAll(async () => {
      await cleanupTestUser(admin, userA.userId);
      await cleanupTestUser(admin, userB.userId);
      await cleanupTestUser(admin, userC.userId);
    });

    it("returns B before C (closer first)", async () => {
      const client = await getAuthenticatedClient(userA.email, userA.password);
      const { data, error } = await client.rpc("find_matches", {
        requesting_user_id: userA.userId,
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      expect(data![0].display_name).toBe("Close User");
      expect(data![1].display_name).toBe("Far User");
    });
  });
});
