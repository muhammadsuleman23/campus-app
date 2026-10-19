# Campus App — Fixes Summary

## IMPORTANT: Run the DB migration first
New status columns were added. Run this once against your Neon database:

```
cd backend
npm run init-db
```

The schema uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so it's safe to run on an existing database and safe to run more than once.

---

## Issue 1 — SkillSwap / SkillDetail stuck on "Loading..."
**Root cause:** `user` is a reserved keyword in Postgres. The generic model layer built queries like `LEFT JOIN users u ON u.id = t.user` (unquoted), which threw a SQL syntax error. This broke every module whose owner column is `user`: **Skills, Roommates, Lost & Found**. (Products used `seller` and Rides used `driver`, so those worked — which is why only some pages loaded.)

**Fix:** `backend/models/_ownedModel.js` now quotes the owner column as `t."user"` in both `find()` and `findById()` (and in `save()` for safety).

## Issue 2 — No notifications when users interact
**Root causes:**
- The `Notification.create()` method existed but was never called anywhere.
- The mark-as-read route didn't match the frontend (frontend called `PUT /notifications/:id/read`, backend only had `PUT /notifications/:id`).

**Fixes:**
- `messageController.js` now creates a notification for the recipient on every new message and pushes it live over socket.io (`notification` event to the user's personal room).
- `skillController.js` now notifies the skill owner when someone leaves a review.
- `notificationRoutes.js` now supports both `/:id/read` and `/:id`.
- `Dashboard.jsx` joins the user's personal socket room, listens for `notification`, shows toast alerts, and the bell now shows a **real unread count** (instead of an always-on red dot).

## Issue 3 — Couldn't tell who is who in a chat
**Fixes in `Messages.jsx`:**
- `getSender()` is now null-safe and always returns the *other* participant.
- Message bubbles are null-safe (won't crash if a sender was deleted), show the sender's name above incoming messages, and show a timestamp. Your messages stay on the right (purple), the other person's on the left (grey).
- Fixed a socket bug that was stacking duplicate listeners and using stale message state.
- Starting a chat from Product / Skill / Roommate / Lost&Found now creates the conversation and opens it directly with the right person selected.

## Issue 4 — Owners can now mark items as done, everywhere
Added an owner-only status toggle + a visible badge across all modules:

| Module        | Status field   | Owner action                | Badge          |
|---------------|----------------|-----------------------------|----------------|
| Marketplace   | `isSold`       | (already existed)           | SOLD           |
| Lost & Found  | `isResolved`   | Mark as Found / Returned    | FOUND/RETURNED |
| Ride Share    | `isCompleted`  | Mark Completed / Re-open    | COMPLETED      |
| Roommates     | `isClosed`     | Mark Closed / Taken         | CLOSED         |
| Skill Swap    | `isActive`     | Pause / Activate            | PAUSED         |

Notes:
- Lost & Found previously "solved" a case by **deleting** it. It now toggles a status and keeps the record. Delete is still available separately.
- Completed/closed/resolved items are dimmed in list views and hide their Chat buttons, but are not deleted.

### Files changed
Backend: `models/_ownedModel.js`, `models/Skill.js`, `models/Roommate.js`, `models/LostItem.js`, `controllers/messageController.js`, `controllers/skillController.js`, `controllers/lostItemController.js`, `controllers/roommateController.js`, `routes/notificationRoutes.js`, `config/schema.sql`

Frontend: `pages/Messages.jsx`, `pages/Dashboard.jsx`, `pages/ProductDetail.jsx`, `pages/SkillDetail.jsx`, `pages/SkillSwap.jsx`, `pages/RideDetail.jsx`, `pages/RideShare.jsx`, `pages/RoommateDetail.jsx`, `pages/RoommateFinder.jsx`, `pages/LostFound.jsx`
