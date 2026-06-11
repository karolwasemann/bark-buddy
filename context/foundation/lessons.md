# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Redundant getUser() round-trips across layout + page

- **Context**: src/app/(protected)/layout.tsx:12-14 + dashboard/page.tsx:7-9
- **Problem**: A protected layout calls getUser() for the route guard, and the page it wraps calls getUser() again to read user data — two auth-server round-trips per load where one would do. Acknowledged as acceptable for MVP but is 2x the necessary auth calls.
- **Rule**: _<fill in: the recurring rule, e.g. "Fetch the authenticated user once at the guard boundary and pass it down; pages under a protected layout must not re-call getUser()">_
- **Applies to**: _<fill in: e.g. "Any Server Component page nested under a protected layout that already resolves the user">_

## Raw <a> tags for internal route navigation

- **Context**: src/app/page.tsx:42 (/login), :48 (/register)
- **Problem**: Internal routes are linked with raw <a> tags, causing a full-page reload and discarding client-side navigation (prefetching, soft transitions, preserved client state) that next/link provides. Plan permitted "links (or buttons)" so it passed, but it diverges from the Next.js client-navigation convention. External links (Templates/Learning) correctly remain <a>.
- **Rule**: _<fill in: e.g. "Use next/link for internal route navigation; reserve raw <a> for external/off-origin URLs">_
- **Applies to**: _<fill in: e.g. "Any in-app navigation to a route within the App Router">_

## Unsafe `as string` casts on FormData reads

- **Context**: src/app/(auth)/actions.ts:13-14, :28-30
- **Problem**: Server action reads form fields with formData.get("x") as string. get() actually returns string | File | null, so the cast lies to the type checker. If a field is absent (e.g. the action is invoked outside the real form), the value is null and downstream use like password.length throws an unhandled runtime error instead of returning a clean validation message. HTML required only guards the normal browser path, not direct/malformed invocations.
- **Rule**: _<fill in: e.g. "Never cast formData.get() with `as string`; coerce defensively (?.toString() ?? "") or validate presence before use, since server actions can be invoked outside the rendered form">_
- **Applies to**: _<fill in: e.g. "Any 'use server' action reading FormData fields">_

## Storage RLS must align with function-level access

- **Context**: supabase/migrations/20260610092307_create_find_matches_function.sql:12
- **Problem**: A function returns a storage path (dog_photo_path) to authorized users, but the storage bucket RLS (owner-only) will block the actual download. The function-level access control and storage-level access control are out of sync.
- **Rule**: When a function exposes a storage path to users beyond the owner, verify that the storage bucket RLS has a matching policy that grants read access to the same audience.
- **Applies to**: Any Supabase function or view that returns file paths from private storage buckets.