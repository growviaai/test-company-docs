# 08 — Comments, mentions, and notifications

## 1. Comments

- Comments belong to a **page** (not to a text selection).
- Top-level comments and **one level of replies**. A reply to a reply attaches to the same top-level comment.
- Anyone with access to the page's space can read and write comments.
- Edit own comment (shows "edited"), delete own comment. Admins can delete any comment.
- Deleting a comment with replies keeps the thread: show "This comment was deleted" in place (soft delete via `deleted_at`, body is blanked in API responses).
- Plain text with line breaks and links auto-detected. No HTML, no images. Maximum 5000 characters.
- Order: oldest first. Show avatar initials, name, relative time, and "edited" label.

### UI (under the page content, and togglable in a side panel)
- Composer: textarea with "Write a comment…", **Comment** button (primary, disabled when empty). `Ctrl/Cmd + Enter` submits.
- Each comment: **Reply**, **Edit**, **Delete** actions (menu). Delete asks for confirmation.
- The comments icon in the top bar shows the number of comments on the page.

## 2. Mentions

- Typing `@` in the composer opens a list of users who can access the page's space. Filter as you type (match name or email). Keyboard: arrows, enter, escape.
- Stored in the body as `@[Full Name](user:<uuid>)` and in `comment_mentions`. Rendered as a highlighted chip (blue text on a light blue background, using the info scale).
- The API **re-validates** every mention: the user must exist, be active, and have space access. Invalid mentions are rendered as plain text and do not notify.
- Maximum 20 mentions per comment.
- Editing a comment can add new mentions; only **newly added** users are notified.

## 3. Notification rules

| Event | Who is notified |
|---|---|
| You are @mentioned in a comment | The mentioned user (not the author) |
| Someone replies in a thread you started | The author of the top-level comment (not the replier) |
| Someone replies in a thread where you commented | Not in v1 `[keep v1 simple]` |

Never notify the person who performed the action. Notify each user at most once per comment (a mention plus a reply to their thread = one notification, type `mention` wins).

## 4. In-app notifications

- Bell icon in the top bar with an unread count badge (shows `9+` above 9).
- Dropdown shows the latest 10 with: actor name, short message ("mentioned you on *Page title*"), relative time, and a blue dot when unread. Click → mark read and go to the page, scrolled to the comment.
- `/notifications` shows all with pagination, **Mark all as read**, and filters (All, Unread).
- Poll `GET /api/v1/notifications/unread-count` every 60 seconds and when the tab regains focus. (No realtime in v1.)
- Notifications about spaces the user can no longer access are hidden.

## 5. Email notifications

- Sent when the recipient has `email_notifications = true` (default on).
- One email per notification. No digest in v1.
- Subject: `<Actor name> mentioned you in "<Page title>"` or `<Actor name> replied to your comment in "<Page title>"`.
- Body: short plain-text excerpt (first 200 characters, mentions as `@Name`), a button **Open comment** linking to `https://<frontend>/s/<space>/<path>#comment-<id>`, and a footer line "Turn off these emails in Settings → Profile".
- Do not include the whole comment if it is long. Never include private file links.
- Send through SMTP (`nodemailer`) using `waitUntil` after the response. Record in `email_outbox` (`queued` → `sent` / `failed`). On failure, retry up to 3 times with backoff; admins can see failures in the audit log and outbox view.

## 6. Email templates (all kinds)

Shared layout: white card on light gray, company name header, one primary button, small footer. Must be readable in dark mode email clients (use safe colors). Provide both HTML and plain text.

| Template | Subject | Content |
|---|---|---|
| invite | `You're invited to <Company> docs` | Who invited you, role, button **Accept invite**, expiry date, "If you weren't expecting this, ignore it." |
| reset | `Reset your password` | Button **Set a new password**, valid for 1 hour, ignore if not requested |
| mention | see above | |
| reply | see above | |

Company name comes from env `COMPANY_NAME`.

## 7. SMTP configuration (Namecheap Private Email or similar)

Environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (for example `"Company Docs <docs@example.com>"`).
Use the host, port, and security mode shown in your mail provider's panel (commonly port 465 with SSL, or 587 with STARTTLS). Set up **SPF and DKIM** for the sending domain so mails do not land in spam. Test with `scripts/send-test-email.ts`.

## 8. Settings

`/settings/profile` has a single switch: **Email me about mentions and replies**. Saved to `profiles.email_notifications`.

## 9. Acceptance criteria

- Mentioning a user without space access does not notify them and shows plain text.
- Replying to your own thread notifies nobody.
- An unread count updates within 60 seconds. Clicking a notification opens the page and scrolls to the comment.
- Turning email off stops emails but keeps in-app notifications.
