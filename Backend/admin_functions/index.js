const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");   

admin.initializeApp();

exports.deleteUser = onCall(async (request) => {
  // Verify admin privileges if you set custom claims for your admins
  const auth = request.auth;
  if (!auth || !auth.token.admin) {
    throw new Error("Permission denied. Admin access required.");
  }

  const { uid } = request.data;

  if (!uid) {
    throw new Error("Missing user UID.");
  }

  try {
    // Delete user from Firebase Authentication
    await admin.auth().deleteUser(uid);

    // Optionally, delete user from Firestore or other DB here
    // await admin.firestore().collection('teachers').doc(uid).delete();

    return { message: `User with UID ${uid} deleted successfully.` };
  } catch (error) {
    throw new Error("Error deleting user: " + error.message);
  }
});
