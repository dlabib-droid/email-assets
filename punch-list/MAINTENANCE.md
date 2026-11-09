# Pinestone Punch List: Maintenance & Recovery Guide

Address: https://dlabib-droid.github.io/email-assets/punch-list/
Current version: **1.3.2, stable release** (shown at the bottom of the app's Projects screen)
For everyday instructions see **README.md**. This file covers updates, recovery and rules for changing the code.

---

## 1. Where your data lives

| What | Where | Removed by an app update? |
|---|---|---|
| Projects, items, photos | Inside the app on your iPhone (its IndexedDB database) | **No, never** |
| App files (this folder) | GitHub, plus a saved copy on the phone for offline use | Replaced by the new version |
| Backups | The `.json` files you save to iCloud Drive | No (they're yours) |

Updating the app only swaps the app files. It never touches your projects or photos.

**Your phone is the only live copy.** Backups are what protect you.

---

## 2. Backup routine

- **After each walkthrough:** open the project, tap **Back Up** (under the big buttons), tap **Save to Files…**, then pick
  `iCloud Drive › Pinestone Punch List › Backups`.
- The project screen shows **Last backup: …**. A project needing a backup turns amber and shows **Needs backup** on the Projects list.
- **Back Up All** makes one file per project and walks through them one at a time (Stop / Skip / Save).
- **When a job is finished:** do a final backup and save the final PDF to the job folder. You can then delete the project from the app to keep it light.
- **Before every app update:** back up anything marked "Needs backup".
- Photos taken with **Take Photo** are not saved to your Photos library. They exist only in the app and in your backups.

## 3. Restoring / moving to a new phone

1. On the new phone, open the address above in **Safari**, then tap **Share › Add to Home Screen**.
2. Open the new icon **once with internet** (offline mode sets itself up).
3. On the Projects screen, tap **Restore Backup** and pick each project's latest `.json` file from Files.
4. The app confirms what was restored, for example "224 Capitol Avenue: 15 items, 32 photos".

- If a project already exists on the phone, the app asks before replacing it. Replacing loses any changes made since that backup.
- Every backup ever made restores in this version. Version 1.3 backups also restore in older versions.

**Practice safely:** open the address in a regular Safari tab (not the home-screen icon) and restore a backup there. A Safari tab keeps separate data, so your real projects aren't affected.

## 4. Updating the app on GitHub (safe procedure)

1. **Back up** every project marked "Needs backup".
2. **Save the current version first.** In the repo, open the `punch-list` folder and note the version in `sw.js` (the line `const VERSION = '…'`). Keep the zip of every version in `iCloud Drive › Pinestone Punch List › App Versions`. GitHub also keeps every past version in the repo's commit history.
3. **Upload the new files.**
   1. Open github.com/dlabib-droid/email-assets.
   2. Click into the **punch-list** folder, so the address bar ends in `/tree/main/punch-list`.
   3. Click **Add file › Upload files**.
   4. Drag in the **files** from inside the new folder (or just the changed files), **not the folder itself**. Dragging the folder creates `punch-list/punch-list/`, and your phone keeps the old version.
   5. Commit to `main`.
   - Never delete `logo.png`, and don't upload a different file named `logo.png` unless you mean to change the logo.
4. **Check the upload.**
   - Open `https://dlabib-droid.github.io/email-assets/punch-list/sw.js` in Safari; the VERSION line should show the new number. GitHub takes 1–2 minutes to publish.
   - If it still shows the old number after 5 minutes, check the repo's **Actions** tab for a failed build, and check for a `punch-list/punch-list` folder.
5. **Update the phone.**
   - Open the app with internet. It updates itself within a few seconds, reloads, and shows "Updated to v…".
   - Or tap **v… · Check for update** at the bottom of the Projects screen.
   - Coming from **v1.1 or v1.2** (one time only): open the app, wait 10 seconds, swipe it closed, and reopen it, twice.

**Rule for every future version:** the `VERSION` number in `sw.js` must go up, for example 1.3.0 → 1.3.1. That's how phones notice an update.

## 5. Rolling back a bad update

Your data is not affected by rolling back.

1. Upload the previous version's files (from your App Versions folder) the same way as in section 4.
2. **Raise** the VERSION number in that old `sw.js` above the bad one. For example, if 1.4.0 was bad, upload the 1.3 files with VERSION `1.4.1`. A lower number won't replace what the phone already has.
3. Open the app with internet, or tap **Check for update**.

## 6. Never do these

- **Never delete the home-screen icon to "fix" the app.** That can erase the app's data. Use **Check for update**, or swipe the app closed and reopen it, instead.
- **Don't rename** the GitHub account (`dlabib-droid`), the repo (`email-assets`) or the folder (`punch-list`). Don't make the repo private and don't turn off GitHub Pages. The phone ties your data to this exact address; a new address starts empty, and only backups can bring data across.
- Don't use the app in a private browsing tab (nothing is kept).

## 7. If something goes wrong

| What you see | What to do |
|---|---|
| Red banner "Storage is not working" | Your data is not deleted. Swipe the app closed and reopen it. If it repeats, restart the iPhone. Don't add items while the banner shows. |
| Amber banner "Storage almost full" | Back up finished projects, remove them from the app, and free up space on the phone. |
| "This was NOT saved" message | The item wasn't stored. Follow the message, then re-enter it. |
| Old version still showing | Tap **Check for update** with internet. Check the `sw.js` address shows the new VERSION (section 4). |
| App won't open offline | Open it once with internet so offline mode can set itself up ("Offline mode: Ready"). |

## 8. Rules for whoever changes the code (developer notes)

- The database name `pinestone-punch-list` and its version number (1) must never change without a written upgrade step. That step runs in `indexedDB.open(..., newVersion)` `onupgradeneeded`, checks `event.oldVersion`, and only **adds** stores or fields; it never deletes. Old backups must keep restoring.
- Never add code that deletes or clears object stores, or deletes the database, except the user's own Delete actions.
- The service worker may only delete caches whose names start with `pinestone-punch-`. It must never touch IndexedDB.
- Backup format: `{app:'pinestone-punch-list', version:1, exportedAt, projects[], tasks[], photos[]}`, with photos as base64 data URLs. New fields may be added; existing ones must not be renamed or removed.
- Bump `VERSION` in `sw.js` and `APP_VERSION` in `index.html` together on every release.
- The app has no outside dependencies: no CDN, no fonts, no servers, no Claude services. Keep it that way so it works offline and independently.
- The source code is the files themselves (`index.html` contains all screens, PDF generation and storage; `sw.js` is the offline layer). There is no build step: edit the file, raise the VERSION, upload.
- Deleting a project uses one database transaction (`DB.deleteProject`), so a project is either fully removed or untouched.
- Before releasing, test:
  - an upgrade from the previous version with real data;
  - an offline launch;
  - PDF, print, backup and restore.
