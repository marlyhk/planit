# Planit — private cross-device sync setup

Planit is already wired for private cloud sync. You only need to connect it to your own Supabase project once, then deploy the folder to one HTTPS website. After that, the same account and data work on your MacBook, iPad and phone.

## 1. Create a Supabase project

1. Create a Supabase account and make a new project.
2. In the project dashboard, open **SQL Editor**.
3. Open the included file `supabase-setup.sql`, copy all of it, and run it once.

The SQL creates one private JSON data row per authenticated user and enables Row Level Security so one signed-in user cannot read another user's Planit data.

## 2. Add your Planit cloud keys

In Supabase, open **Project Settings → API** and copy:

- Project URL
- anon/public key

Open `cloud-config.js` and replace the two placeholder values:

```js
window.PLANIT_CLOUD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY",
  allowedEmail: "your-email@example.com",
  allowSignup: true
};
```

`allowedEmail` is optional, but recommended for your private Planit.

## 3. Deploy Planit once

Upload the whole `planit-website` folder to any static HTTPS host, for example Vercel, Netlify, Cloudflare Pages, GitHub Pages, or similar.

Use that same deployed URL on every device. Do not keep separate copies at different URLs if you want one shared Planit.

## 4. Create your private account

1. Open the deployed Planit URL.
2. Enter your email + password.
3. Click **Create my private account**.
4. If Supabase asks you to confirm your email, confirm it once and then sign in.
5. Your existing local Planit data will upload automatically if the cloud is empty.

## 5. Lock it down after your account exists

For a true one-person app:

1. In Supabase Authentication settings, disable new user signups after your account is created.
2. Change `allowSignup` in `cloud-config.js` to `false` and redeploy.
3. Keep `allowedEmail` set to your email.

## How sync behaves

- Every normal edit still saves immediately to the device.
- When online and signed in, Planit automatically syncs changes to your private cloud.
- Opening Planit on another signed-in device loads the same data.
- Planit checks for newer cloud data when the tab opens, becomes active again, reconnects to the internet, and periodically while open.
- If you are temporarily offline, you can keep working locally; Planit attempts to sync again when the connection returns.
- Export backup still works and is recommended before major changes.

## Important

The Supabase anon/public key is designed to be present in browser apps. Security comes from authentication + Row Level Security, which the included SQL enables. Never place a Supabase **service role** key in `cloud-config.js`.
