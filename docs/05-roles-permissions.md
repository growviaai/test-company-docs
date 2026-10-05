# 05 — Roles and permissions

Two roles: `admin` and `member`. All checks happen in the API (`services/permissions.ts`). The frontend hides things the user cannot do, but the API is the real gate.

## 1. Space access rule

A user **can access a space** when:
- the user is `active` **and** the space is not archived **and** one of these is true:
  - the user is an `admin`, or
  - `space.visibility = 'all'`, or
  - `space.visibility = 'restricted'` and the user is in `space_members`.

Everything inside a space (pages, versions, comments, attachments, search results, notifications about it) follows this rule. If access is lost, the user must stop seeing all of it immediately.

## 2. Permission matrix

| Action | Member | Admin |
|---|---|---|
| Sign in, change own password, see/end own sessions | Yes | Yes |
| View spaces and pages they can access | Yes | Yes (all spaces) |
| Create a page or group in an accessible space | Yes | Yes |
| Edit any page in an accessible space | Yes | Yes |
| Reorder and move pages | Yes | Yes |
| Delete a page | **Only if author** | Yes |
| Restore an older page version | **Only if author of that page** | Yes |
| View version history | Yes | Yes |
| View Trash and restore deleted pages | No | Yes |
| Upload files to a page | Yes | Yes |
| Comment, reply, @mention (people who can access the space) | Yes | Yes |
| Edit own comment | Yes | Yes |
| Delete own comment | Yes | Yes |
| Delete anyone's comment | No | Yes |
| Search (accessible spaces only) | Yes | Yes |
| Create, edit, archive spaces | No | Yes |
| Set space visibility and manage space members | No | Yes |
| Invite, resend, revoke invites | No | Yes |
| List users, change roles | No | Yes |
| Deactivate, reactivate, delete users | No | Yes |
| Terminate sessions of other users | No | Yes |
| View audit log | No | Yes |

"Author" means `pages.created_by = current user`. Admins can always do what an author can.

## 3. Rules and guards

- **Last admin**: block demote, deactivate, and delete when the target is the only active admin.
- **No self-lockout**: an admin cannot deactivate or delete themselves.
- **No privilege via invite**: invite role `admin` is allowed (admins invite admins). Log it.
- **Mentions**: only users who can access the page's space may be mentioned or notified.
- **Moving a page** to another space needs access to both spaces. Moving a page re-checks space access for its comments' notifications (no new notifications on move).
- **Restricted spaces**: when a user is removed from `space_members`, their existing notifications for that space stay hidden (filter at read time).
- **Archived spaces**: read-only for everyone except admins; hidden from the space list for members.

## 4. Implementation contract

Create these helpers, and call them in every route:

```ts
canAccessSpace(user, space): boolean
accessibleSpaceIds(user): Promise<string[]>
requireAdmin(user): void            // throws 403
canDeletePage(user, page): boolean  // admin || page.created_by === user.id
canRestoreVersion(user, page): boolean // same rule
canDeleteComment(user, comment): boolean // admin || comment.author_id === user.id
```

Add unit tests for every row of the matrix. A route without a permission check is a bug.

## 5. Error behavior

- Not signed in → `401 UNAUTHENTICATED`.
- Signed in but not allowed → `403 FORBIDDEN`.
- A space the user cannot access should return `404 NOT_FOUND` (do not reveal that it exists).
