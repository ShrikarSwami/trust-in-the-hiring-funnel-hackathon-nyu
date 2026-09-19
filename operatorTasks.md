# Operator Tasks (human-only steps for the email scanner)

Steps an agent can't do because they need Shrikar signed in to Microsoft. Do them on the demo
laptop, in the browser you'll demo from (Edge or Chrome).

---

## 1. Load the Trust Scanner add-in into Outlook on the web

**Before you start:** Tailscale is connected (so the backend can reach Thor), and the add-in
scaffold is on `main` (Task 9; `email-scanner/addin/manifest.xml` exists after `git pull`).

1. **Trust the local HTTPS certificate** (one-time):
   ```bash
   cd email-scanner/addin
   npm install
   npx office-addin-dev-certs install
   ```
   Approve the macOS keychain / password prompt.

2. **Start the backend** (terminal 1):
   ```bash
   cd email-scanner/backend
   cp -n .env.example .env     # first time only
   npm start
   ```
   Check: `curl -s localhost:3001/health` shows `"reachable":true,"modelPresent":true`.

3. **Start the add-in dev server** (terminal 2):
   ```bash
   cd email-scanner/addin
   npm run dev-server
   ```
   Open https://localhost:3000/taskpane.html in your browser. It should load with **no
   certificate warning**. If there's a warning, step 1 didn't take; rerun it and restart the
   browser.

4. **Sideload the add-in:**
   1. Sign in to https://outlook.live.com as **slhj1208@outlook.com**.
   2. In the same browser, open **https://aka.ms/olksideload**. This opens Outlook's "Add-ins
      for Outlook" dialog.
   3. Click **My add-ins**, scroll to **Custom Add-ins**, then **+ Add a custom add-in → Add
      from File…**
   4. Pick `email-scanner/addin/manifest.xml` and accept the warning.

5. **Use it:** open any email, find **Trust Scanner** / **Scan for scams** in the message's
   toolbar (it may be under the **Apps** button or the **…** menu), and click **Scan email** in
   the side pane.

**If something goes wrong:**

| Symptom | Fix |
|---|---|
| Pane is blank or shows a connection error | The dev server isn't running, or the cert isn't trusted (steps 1 and 3) |
| "Scan failed (HTTP 502/504)" | The backend isn't running on :3001 (step 2) |
| Verdict shows "AI check unavailable" | Thor unreachable: check Tailscale, then `curl http://enverthor:11434/api/tags` |
| Changed `manifest.xml` | Remove the custom add-in in My add-ins, then re-add it from file |

---

## 2. Outlook.com app password (for seeding the demo inbox via IMAP)

Microsoft may have turned off app-password IMAP for Outlook.com accounts. This test shows in
about 5 minutes whether it still works. **If it fails, that's fine.** The add-in's built-in
sample picker covers the demo, and we won't set up the Entra/OAuth path unless there's time.

1. **Turn on IMAP:** Outlook.com → ⚙ Settings → **Mail → Forwarding and IMAP** → switch on
   **"Let devices and apps use IMAP"** → Save.
2. **Turn on two-step verification:** https://account.microsoft.com/security → **Advanced
   security options** → **Two-step verification** → On. App passwords require it.
3. **Create the app password:** on the same *Advanced security options* page, go to **App
   passwords → Create a new app password**. Copy it.
4. **Test the login now.** This doesn't need any of our code:
   ```bash
   openssl s_client -connect outlook.office365.com:993 -crlf -quiet
   ```
   Once it connects, type the line below (with your app password), then press Enter:
   ```
   a1 LOGIN slhj1208@outlook.com YOUR-APP-PASSWORD
   ```
   - `a1 OK ...` means it works. Type `a2 LOGOUT`.
   - `a1 NO LOGIN failed` means basic auth is blocked. Stop here.
5. **If it worked,** save it for the seeding script. This file is git-ignored; never commit it.
   ```bash
   # email-scanner/backend/.env
   IMAP_USER=slhj1208@outlook.com
   IMAP_PASSWORD=your-app-password
   ```
6. **Tell the email-scanner Claude session "IMAP OK" or "IMAP failed".** Once Task 14 lands, the
   seeding command is `cd email-scanner/backend && npm run seed -- --clear`.
