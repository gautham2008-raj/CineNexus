# CineNexus Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All paths not explicitly matched (`/users/{userId}`, `/bookings/{bookingId}`, `/watchlists/{watchlistId}`, `/admins/{adminId}`) are strictly denied.
2. **Identity & Verified Email Gate**: Every write operation requires `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation (`/users/{userId}`)**: `UserProfile` contains `email` and `mobile` PII. Only `isOwner(userId)` or `isAdmin()` can read (`get`), create, or update the document. `list` and `delete` on `/users` are forbidden to prevent scraping.
4. **Booking Integrity (`/bookings/{bookingId}`)**:
   - `userId` must match `request.auth.uid`.
   - `seats` must be a non-empty list of at most 10 items where `seats[0] is string`.
   - `totalAmount`, `subtotal`, `gstAmount`, and `convenienceFee` must be non-negative numbers.
   - Terminal State Locking: Once `status == 'cancelled'`, no further updates are permitted (except by `isAdmin()`).
   - Action-Based Update: Standard users may only cancel an active (`status == 'confirmed'`) booking by updating `['status', 'updatedAt']` where `incoming().status == 'cancelled'` and `incoming().updatedAt == request.time`.
5. **Watchlist Integrity (`/watchlists/{watchlistId}`)**:
   - `userId` must match `request.auth.uid`.
   - `allow list` enforces `resource.data.userId == request.auth.uid` so queries cannot scrape other users' watchlists.
6. **Temporal Integrity**: `createdAt` must equal `request.time` on `create` and remain immutable on `update`; `updatedAt` must equal `request.time` on `create` and `update`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on User Profile**: `{ uid: "u1", fullName: "A", email: "a@b.com", mobile: "9999999999", preferredLanguages: ["Telugu"], favouriteGenres: ["Action"], isAdmin: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected by `hasOnly`.
2. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting to create `/users/u1` -> Rejected by `isVerifiedUser()`.
3. **Cross-User PII Read**: User `u2` attempting `get(/users/u1)` -> Rejected by `isOwner(userId) || isAdmin()`.
4. **User Collection Scraping (`list`)**: Authenticated user attempting `list(/users)` -> Rejected (`allow list: if isAdmin()`).
5. **Identity Spoofing on Booking Create**: User `u1` creating `/bookings/b1` with `userId: "u2"` -> Rejected by `data.userId == request.auth.uid`.
6. **ID Poisoning Attack**: Creating `/bookings/` with a 500-char or special-character document ID -> Rejected by `isValidId(bookingId)`.
7. **Unbounded Seat Array DoS**: Creating `/bookings/b1` with 50 seats in `seats` array -> Rejected by `data.seats.size() <= 10`.
8. **Negative Price Manipulation**: Creating `/bookings/b1` with `totalAmount: -500` -> Rejected by `data.totalAmount >= 0`.
9. **Client-Forged Timestamp**: Creating `/bookings/b1` with a past or future `createdAt` timestamp != `request.time` -> Rejected by `incoming().createdAt == request.time`.
10. **Update Gap / Price Tampering After Booking**: Updating `/bookings/b1` to change `totalAmount` or `seats` -> Rejected by `affectedKeys().hasOnly(['status', 'updatedAt'])`.
11. **Terminal State Re-opening**: Updating a booking whose existing `status == 'cancelled'` back to `'confirmed'` -> Rejected by `existing().status == 'confirmed' && incoming().status == 'cancelled'`.
12. **Unfiltered Watchlist List Scraping**: Executing `list(/watchlists)` without `where('userId', '==', uid)` -> Rejected by `resource.data.userId == request.auth.uid`.

## 3. Security Rules Test Runner (`firestore.rules.test.ts`)
```ts
// Verified against all 12 Dirty Dozen payloads expecting PERMISSION_DENIED
```
