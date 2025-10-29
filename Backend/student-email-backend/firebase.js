const admin = require("firebase-admin");

// ✅ Prevent duplicate initialization and avoid loading serviceAccount unnecessarily
if (!admin.apps.length) {
  const serviceAccount = require("./student-portal-fcf6d-firebase-adminsdk-fbsvc-d3904ff35b.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized");
}

const db = admin.firestore();

module.exports = db;   
