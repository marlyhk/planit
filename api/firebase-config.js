module.exports = function handler(req, res) {
  const projectId = process.env.PLANIT_FIREBASE_PROJECT_ID || '';

  const config = {
    apiKey: process.env.PLANIT_FIREBASE_API_KEY || '',
    authDomain: projectId ? `${projectId}.firebaseapp.com` : '',
    projectId,
    appId: process.env.PLANIT_FIREBASE_APP_ID || ''
  };

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  res
    .status(200)
    .send(`window.PLANIT_FIREBASE_CONFIG = ${JSON.stringify(config)};`);
};
