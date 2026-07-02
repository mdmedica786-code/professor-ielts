require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

// Initialize Firebase Admin
let bucket;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (serviceAccount.private_key && serviceAccount.private_key.includes('\\n')) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  const app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com` // Default Firebase bucket
  });
  bucket = getStorage(app).bucket();
} catch (err) {
  console.error("Failed to init Firebase Admin:", err.message);
  process.exit(1);
}

const JSON_PATH = path.join(__dirname, 'listening_parsed.json');
const AUDIO_DIR = path.resolve(__dirname, '../../ielts-audios'); // We'll just point straight to the downloaded audios

async function uploadFile(localPath, destinationPath, contentType) {
  try {
    await bucket.upload(localPath, {
      destination: destinationPath,
      metadata: {
        contentType: contentType,
        // Make the file public
        cacheControl: 'public, max-age=31536000'
      }
    });
    
    // Make the file publicly accessible
    await bucket.file(destinationPath).makePublic();
    
    // Return the public URL
    return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
  } catch (err) {
    console.error(`Error uploading ${localPath}:`, err);
    return null;
  }
}

async function run() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("listening_parsed.json not found!");
    return;
  }

  let tests = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  let uploadCount = 0;

  console.log("Starting Firebase Storage uploads...");

  for (let test of tests) {
    const testNum = test.testNumber;

    // 1. Upload Map Images if they exist
    if (test.images && test.images.length > 0) {
      let newImages = [];
      for (let imgPath of test.images) {
        if (imgPath.startsWith('http')) {
          newImages.push(imgPath);
          continue;
        }
        console.log(`Uploading map for Test ${testNum}...`);
        const dest = `listening-tests/maps/test_${testNum}_${path.basename(imgPath)}`;
        const url = await uploadFile(imgPath, dest, 'image/png'); // or jpeg
        if (url) {
          newImages.push(url);
          uploadCount++;
          console.log(`Success (Map): ${url}`);
        } else {
          newImages.push(imgPath); // Keep local if fail
        }
      }
      test.images = newImages;
    }

    // 2. Upload Audio File
    if (!test.audioUrl || !test.audioUrl.startsWith('http')) {
      const audioFileName = `TEST ${testNum}.mp3`;
      const rawAudioPath = path.join(AUDIO_DIR, audioFileName);
      
      if (fs.existsSync(rawAudioPath)) {
        console.log(`Processing audio for Test ${testNum}...`);
        
        // Transcode to smaller MP3
        const out = path.join(os.tmpdir(), `bl_test_${testNum}.mp3`);
        try {
          execFileSync(ffmpeg, ["-y", "-i", rawAudioPath, "-ac", "1", "-b:a", "96k", "-map_metadata", "-1", out], {
            stdio: ["ignore", "ignore", "pipe"],
          });
          
          const dest = `listening-tests/audio/test_${testNum}.mp3`;
          const url = await uploadFile(out, dest, 'audio/mpeg');
          if (url) {
            test.audioUrl = url;
            uploadCount++;
            console.log(`Success (Audio): ${url}`);
          }
          
          // Cleanup temp file
          fs.unlinkSync(out);
        } catch (err) {
          console.error(`Failed to transcode/upload audio for test ${testNum}:`, err.message);
        }
      } else {
        console.warn(`Audio file not found: ${rawAudioPath}`);
      }
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(tests, null, 2));
  console.log(`\nFinished! Uploaded ${uploadCount} files to Firebase Storage and updated listening_parsed.json.`);
}

run();
