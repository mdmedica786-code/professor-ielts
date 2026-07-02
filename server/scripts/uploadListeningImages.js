require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'listening_parsed.json');

async function uploadImages() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("listening_parsed.json not found!");
    return;
  }

  let tests = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  let uploadedCount = 0;

  for (let test of tests) {
    if (test.images && test.images.length > 0) {
      let newImages = [];
      for (let imgPath of test.images) {
        if (imgPath.startsWith('http')) {
          newImages.push(imgPath); // already uploaded
          continue;
        }

        console.log(`Uploading ${imgPath}...`);
        try {
          const result = await cloudinary.uploader.upload(imgPath, {
            folder: "bandlogic/listening-maps",
            overwrite: true
          });
          newImages.push(result.secure_url);
          uploadedCount++;
          console.log(`Success: ${result.secure_url}`);
        } catch (err) {
          console.error(`Failed to upload ${imgPath}:`, err);
          newImages.push(imgPath); // keep local path if failed
        }
      }
      test.images = newImages;
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(tests, null, 2));
  console.log(`Finished! Uploaded ${uploadedCount} images and updated listening_parsed.json.`);
}

uploadImages();
