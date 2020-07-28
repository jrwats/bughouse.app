const admin = require('firebase-admin');

const uid = process.argv.slice(2)[0];
if (uid == null) {
  console.error('must provide uid');
  process.exit(1);
}

const PROD = process.env.NODE_ENV === 'production';
console.log(`${PROD ? 'production' : 'dev'}`);
const adminSdkJson = PROD
  ? './bughouse-secrets/.firebase-adminsdk.json'
  : './bughouse-secrets/.dev-firebase-adminsdk.json';
const dbURL = PROD
  ? 'https://bughouse-274816.firebaseio.com'
      : 'https://bughouse-dev.firebaseio.com';

admin.initializeApp({
  credential: admin.credential.cert(require(adminSdkJson)),
  databaseURL: dbURL,
});
console.log('initialized admin');

admin.auth().setCustomUserClaims(uid, {admin: true})
  .then(() => {
    console.log(`set ${uid} to admin`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
console.log('setting custom claim...');
