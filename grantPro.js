require('dotenv').config();
const { auth, db } = require('./server/services/firebaseAdmin');

async function grantPro() {
  try {
    const userRecord = await auth.getUserByEmail('mdmedica786@gmail.com');
    const uid = userRecord.uid;
    const premiumUntil = new Date();
    premiumUntil.setFullYear(premiumUntil.getFullYear() + 100); // 100 years = unlimited

    await db.collection('users').doc(uid).set({
      plan: 'ultra',
      premiumUntil: premiumUntil
    }, { merge: true });
    
    await auth.setCustomUserClaims(uid, { admin: true });
    
    console.log("Successfully granted unlimited Ultra access and admin claim to mdmedica786@gmail.com.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

grantPro();
