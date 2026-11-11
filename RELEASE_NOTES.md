# Admin: release/v1

- **Dashboard:** casual-play tiles (free now, open-join games, attendance, game chat) and media storage used vs quota (read through the API; the media key never reaches the browser).
- **Users:** pictures panel (avatar, cover, gallery, organisation logo) with removal by reason, written to the audit log; the file is deleted too.
- **Verifications:** documents open only on request through the authenticated API (each opening is audit-logged); there is no document URL.
- **Announcements:** delivery stats per announcement (sent, devices reached, failed, skipped by reason, opened), push-queue health and a filterable push log.
- Build clean, 7 tests.
