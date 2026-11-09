# Pinestone Punch List: Quick Guide (v1.3.2, stable release)

**App address:** https://dlabib-droid.github.io/email-assets/punch-list/

The app runs entirely on your iPhone. It needs no account, subscription, Claude or internet (after the first opening). Your punch lists and photos are stored on the phone only.

---

## Install (or reinstall) on an iPhone

1. Open the app address in **Safari**.
2. Tap **Share › Add to Home Screen › Add**.
3. Open the new icon **once with internet**. At the bottom of the Projects screen it should say **Offline mode: Ready**.
4. Always open the app from that icon, not from a Safari tab. A Safari tab keeps separate data.

## Daily use

1. **New Project:** enter the property name and address.
2. **Add Item:** type what needs doing, then tap **Take Photo** or **Library**.
   - Tap a room and trade (the app remembers your last ones).
   - Tap **Save + Next** to keep going, or **Save** for the last item.
3. **Complete or reopen:** tap the checkbox next to an item.
4. **PDF / Print:** choose Full list, One trade, or Outstanding only.
   - Switch the **photo appendix** and **signature section** on or off (the app remembers your choice).
   - Tap **Create PDF**, then **Text / Email / Share**, or **Download**.
   - **Print:** use the Print button, or Share › Print from the PDF. On iPhone, the PDF route is the most reliable.
5. Works with no signal: add items, take photos, make PDFs.

## Back up (after each walkthrough)

1. In the project, tap **Back Up** (it turns amber when a backup is needed).
2. Tap **Save to Files…** and pick `iCloud Drive › Pinestone Punch List › Backups`.

**Back Up All** saves one file per project.

Photos taken in the app are **not** in your Photos library; they exist only in the app and its backups.

## Finish a job (free up space)

1. Back up the project and send or save the final PDF.
2. Tap **Edit › Delete Project**. This removes that project and its photos only; other projects are not touched.
   - The app warns you if the project has changes that aren't in a backup.

## Recover or move to a new phone

1. Install the app (see above).
2. On the Projects screen, tap **Restore Backup** and pick the project's `.json` file from Files.

A deleted project can be brought back the same way from its backup.

## Warnings you might see

| Message | What to do |
|---|---|
| Red banner "Storage is not working" | Your data is not deleted. Swipe the app closed, reopen it, or restart the phone. Don't add items until the banner is gone. |
| Amber banner "Storage almost full" | Back up and delete finished projects, and free space on the phone. |
| "This was NOT saved" | Follow the message, then save the item again. What you typed stays on screen. |

## Never do these

- Don't delete the home-screen icon to fix a problem; that can erase the app's data. Swipe the app closed and reopen it instead.
- Don't rename the GitHub account, the `email-assets` repo, or the `punch-list` folder. Don't make the repo private.

## Updating (rarely needed)

See **MAINTENANCE.md**, section 4. In short:
1. Back up.
2. Upload the new files into the `punch-list` folder on GitHub.
3. Raise the VERSION number in `sw.js`.
4. Open the app with internet. It updates itself, and your projects stay.

## Requirements

iPhone with iOS 15 or later, using Safari to install. Works on any modern browser on a computer too.
