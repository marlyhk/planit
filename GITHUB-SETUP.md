# Planit — GitHub Pages + Supabase setup

This folder is ready for GitHub Pages. Keep every file at the repository root, especially `index.html`.

## Important

GitHub does **not** unpack ZIP files for Pages. Unzip the downloaded Planit ZIP on your Mac first, then upload the files inside the folder to the repository.

## 1. Create the Supabase project

1. Create a project at Supabase.
2. Open **SQL Editor**.
3. Open `supabase-setup.sql` from this folder, copy all of it, paste it into the SQL editor, and run it once.
4. In Supabase, copy the **Project URL** and the browser-safe **Publishable key** (older projects may call this the anon/public key).
5. Never use a secret/service-role key in this website.

## 2. Configure Planit

Open `cloud-config.js` and replace the placeholders:

```js
window.PLANIT_CLOUD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLISHABLE_KEY",
  allowedEmail: "",
  allowSignup: true
};
```

For a public GitHub repository, leaving `allowedEmail` blank avoids publishing your email address in the source code. You will lock signups after creating your account.

## 3. Upload to GitHub

Create a repository, for example `planit`.

At the repository root upload:

- `.nojekyll`
- `index.html`
- `styles.css`
- `app.js`
- `cloud-config.js`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`
- `supabase-setup.sql`
- the Markdown setup/readme files

`index.html` must be at the top level of the repository, not inside another `planit-website` folder.

## 4. Turn on GitHub Pages

1. Repository → **Settings** → **Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the repository's main branch (normally `main`).
4. Select **/(root)** and save.
5. Wait for GitHub to show your live Pages URL.

For a repository named `planit`, the URL is normally:

`https://YOUR-GITHUB-USERNAME.github.io/planit/`

## 5. Configure Supabase authentication URL

In Supabase open **Authentication → URL Configuration**.

Set the **Site URL** to your exact GitHub Pages URL, including the final `/`.

Also add the same GitHub Pages URL to the allowed redirect URLs.

## 6. Create your one Planit account

1. Open the GitHub Pages URL.
2. Create your account with your email and password.
3. Confirm the email if Supabase requires confirmation.
4. Sign in on your MacBook, iPad, and phone with that same account.

All three devices will use the same cloud data.

## 7. Lock Planit to your existing account

After you have successfully signed in at least once:

1. In Supabase Authentication settings, disable new user signups.
2. Change `allowSignup: true` to `allowSignup: false` in `cloud-config.js`.
3. Commit/upload the changed `cloud-config.js` to GitHub.

Your existing account will keep working; the Planit interface will no longer offer account creation.

## 8. Updating Planit later

Upload/commit the changed files to the same repository and branch. GitHub Pages will redeploy automatically.

If an update seems cached, refresh the page. Planit also uses a service worker for app-like behavior/offline support.
