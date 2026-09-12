# Planit setup — Firebase + GitHub + Vercel

No Planit file needs editing. Follow the setup steps in the ChatGPT conversation or this checklist:

1. Create Firebase project named Planit.
2. Register a Web App in Firebase.
3. Enable Authentication > Email/Password.
4. Authentication > Users > Add user; create your private Planit email/password.
5. Authentication > Settings > User actions: disable end-user account creation after your account exists.
6. Create Cloud Firestore in Production mode.
7. Firestore > Rules: paste `firestore.rules` exactly as supplied and Publish.
8. Create a GitHub repo and upload all files/folders from this package, including the `api` folder.
9. Import that GitHub repo into Vercel.
10. In Vercel Project > Settings > Environment Variables, add:
   - PLANIT_FIREBASE_API_KEY
   - PLANIT_FIREBASE_PROJECT_ID
   - PLANIT_FIREBASE_APP_ID
11. Redeploy if Vercel asks you to.
12. Copy the final `*.vercel.app` domain.
13. Firebase > Authentication > Settings > Authorized domains: add only the hostname, e.g. `planit-marly.vercel.app`.
14. Open your Vercel URL and sign in with the user you created in Firebase.
15. Use that same URL and login on MacBook, iPad, and phone.
