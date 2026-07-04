const express = require("express");
const {
  generateListeningScript,
  synthesizeAllAudio,
  evaluateListening,
  toPublicSection,
} = require("../services/listeningService");
const fs = require('fs');
const path = require('path');

const router = express.Router();

const TESTS_DIR = path.join(__dirname, '../data/extracted_tests');

// We carry the answer key + section metadata through the session via an opaque
// base64 token (same pattern as reading.js). It is NOT security — just keeps
// the answers out of the visible question paper for a self-study tool.
function encodeToken(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}
function decodeToken(token) {
  return JSON.parse(Buffer.from(token, "base64").toString("utf8"));
}

/**
 * POST /api/listening/generate
 * Body: { size, whichSection, topic, difficulty }
 *   - size: 'full' (4 sections, 40 Qs) or 'section' (1 section, 10 Qs)
 *   - whichSection: 1|2|3|4 — only when size==='section'
 *   - topic: optional scenario hint
 *   - difficulty: target band range, e.g. '6.0–7.0'
 *
 * Returns: { title, size, sections (public, with audioBase64 per utterance), token }
 * Returns: { title, size, sections (public, with audioBase64 per utterance), token }
 */
router.get("/tests", async (req, res, next) => {
  try {
    if (!fs.existsSync(TESTS_DIR)) return res.json({ tests: [] });
    
    const files = fs.readdirSync(TESTS_DIR).filter(f => f.endsWith('.json') && !f.startsWith('test_full_'));
    const sectionTests = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(TESTS_DIR, f)));
      return { id: data.test_id, name: data.title || `IELTS Listening Test ${data.test_id}`, totalSections: 1, type: 'section' };
    });
    
    // Create combined tests dynamically
    const fullTests = [];
    for (let i = 1; i <= 20; i++) {
      // Check if all 4 sections exist
      if (
        fs.existsSync(path.join(TESTS_DIR, `test_${i}.json`)) &&
        fs.existsSync(path.join(TESTS_DIR, `test_${i+20}.json`)) &&
        fs.existsSync(path.join(TESTS_DIR, `test_${i+40}.json`)) &&
        fs.existsSync(path.join(TESTS_DIR, `test_${i+60}.json`))
      ) {
        fullTests.push({ id: `full_${i}`, name: `Full Official Test ${i}`, totalSections: 4, type: 'full' });
      }
    }

    const allTests = [...fullTests, ...sectionTests];
    res.json({ success: true, data: allTests.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'full' ? -1 : 1; // full tests first
      // Custom numeric sort based on id
      const aId = parseInt(a.id.replace('full_', ''));
      const bId = parseInt(b.id.replace('full_', ''));
      return aId - bId;
    })});
  } catch (err) { next(err); }
});

router.get("/test/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      return res.status(400).json({ success: false, error: "Invalid test id." });
    }
    
    let sections = [];
    let title = "";
    
    if (id.startsWith("full_")) {
      const testNum = parseInt(id.replace("full_", ""));
      const s1 = JSON.parse(fs.readFileSync(path.join(TESTS_DIR, `test_${testNum}.json`)));
      const s2 = JSON.parse(fs.readFileSync(path.join(TESTS_DIR, `test_${testNum+20}.json`)));
      const s3 = JSON.parse(fs.readFileSync(path.join(TESTS_DIR, `test_${testNum+40}.json`)));
      const s4 = JSON.parse(fs.readFileSync(path.join(TESTS_DIR, `test_${testNum+60}.json`)));
      
      const allSecs = [s1, s2, s3, s4];
      sections = allSecs.map((testData, index) => {
        const s = testData.sections[0];
        return {
          number: index + 1,
          title: `Section ${index + 1}`,
          instructions: s.instructions || "",
          questions: s.questions,
          audioUrl: `/audio/TEST%20${testData.test_id}.mp3`,
          utterances: [{ speaker: "Examiner", transcript: "Listen to the audio.", audioUrl: `/audio/TEST%20${testData.test_id}.mp3` }]
        };
      });
      title = `Full Official Test ${testNum}`;
    } else {
      const filePath = path.join(TESTS_DIR, `test_${id}.json`);
      if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: "Test not found" });
      const testData = JSON.parse(fs.readFileSync(filePath));
      sections = testData.sections.map(s => ({
        number: s.number,
        title: s.title,
        instructions: s.instructions || "",
        questions: s.questions,
        audioUrl: `/audio/TEST%20${testData.test_id}.mp3`,
        utterances: [{ speaker: "Examiner", transcript: "Listen to the audio.", audioUrl: `/audio/TEST%20${testData.test_id}.mp3` }]
      }));
      title = testData.title || `Test ${testData.test_id}`;
    }
    
    const tokenPayload = { title, size: id.startsWith('full_') ? 'full' : 'section', sections, isOfficial: true };
    const token = encodeToken(tokenPayload);

    res.json({ success: true, data: { title, size: id.startsWith('full_') ? 'full' : 'section', sections, token } });
  } catch (err) { next(err); }
});

router.post("/generate", async (req, res, next) => {
  try {
    const { size, whichSection, topic, difficulty } = req.body || {};

    // Build the script + key.
    const script = await generateListeningScript({ size, whichSection, topic, difficulty });

    if (!script.sections.length) {
      return res.status(502).json({
        success: false,
        error: "The generator did not return a usable test. Please try again.",
      });
    }

    // Synthesize TTS audio for every utterance. This is the slow step.
    const withAudio = await synthesizeAllAudio(script);

    // Token holds the FULL key-bearing script (no audio — that lives only in the
    // response payload to the client). Re-encoded at /evaluate time without audio
    // by stripping audioBase64.
    const tokenPayload = {
      title: withAudio.title,
      size: withAudio.size,
      sections: withAudio.sections.map((s) => ({
        ...s,
        utterances: s.utterances.map(({ audioBase64, mime, ...rest }) => rest),
      })),
    };
    const token = encodeToken(tokenPayload);

    res.json({
      success: true,
      data: {
        title: withAudio.title,
        size: withAudio.size,
        sections: withAudio.sections.map(toPublicSection),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/listening/evaluate
 * Body: { token, answers, studentName }
 * Marks the attempt server-side using the key in the token.
 */
router.post("/evaluate", async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { token, answers, studentName } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: "Missing listening session token." });
    }

    let payload;
    try {
      payload = decodeToken(token);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid listening session token." });
    }

    if (!Array.isArray(payload.sections) || payload.sections.length === 0) {
      return res.status(400).json({ success: false, error: "No sections to mark." });
    }

    const result = await evaluateListening({ script: payload, answers: answers || {} });

    result.metadata = {
      studentName: studentName || "Student",
      processingTime: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `Listening evaluation complete: band=${result.overallBand}, ${result.correctCount}/${result.total} correct, size=${result.size}, time=${result.metadata.processingTime}s`
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
