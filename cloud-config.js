// Planit private cloud configuration.
// Fill these values once after creating your Supabase project, then deploy the folder.
// Every device that opens your deployed Planit URL will use the same private cloud.
window.PLANIT_CLOUD_CONFIG = {
  supabaseUrl: "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE",
  supabaseAnonKey: "PASTE_YOUR_SUPABASE_ANON_KEY_HERE",
  allowedEmail: "", // Optional but recommended: put your email here.
  allowSignup: true  // Keep true for your first account creation; then set false and redeploy.
};
