/**
 * Official IELTS band descriptors (public versions, IELTS.org) — condensed to the
 * key discriminating features per band so the AI grader marks against the REAL
 * rubric instead of its general sense of IELTS. Injected into the examiner prompts.
 *
 * Source: official IELTS Speaking & Writing band descriptors (public version).
 * Kept compact on purpose (these run on every grading request).
 */

const SPEAKING_BAND_DESCRIPTORS = `OFFICIAL IELTS SPEAKING BAND DESCRIPTORS (mark strictly against these).
Criteria: Fluency & Coherence (FC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA), Pronunciation (P).

Band 9 — FC: fluent, only very occasional repetition/self-correction; hesitation only to prepare content; fully coherent, extended. LR: total flexibility and precise use in all contexts; accurate idiomatic language. GRA: precise and accurate throughout, errors only native-like 'slips'. P: full range of phonological features; effortless to understand; accent no effect.
Band 8 — FC: fluent, occasional repetition; hesitation mostly content-related; coherent, relevant. LR: wide resource used flexibly for all topics; skilful less-common/idiomatic items with occasional inaccuracies. GRA: wide range flexibly used; majority of sentences error-free; occasional non-systematic errors. P: wide range of features; sustained rhythm; easily understood; accent minimal effect.
Band 7 — FC: keeps going, produces long turns without much effort; some hesitation/self-correction but coherence not affected; flexible use of discourse markers/connectives. LR: some less-common and idiomatic items, awareness of style/collocation though inappropriacies occur; effective paraphrase. GRA: range of structures flexibly used; frequent error-free sentences; both simple and complex used effectively despite some errors; a few basic errors persist. P: all positive features of band 6 plus some of band 8.
Band 6 — FC: willing to produce long turns; coherence may be lost at times through hesitation/repetition/self-correction; uses discourse markers though not always appropriately. LR: resource sufficient to discuss topics at length; vocabulary may be inappropriate but meaning clear; generally paraphrases successfully. GRA: mix of short and complex forms with limited flexibility; errors frequent in complex structures but rarely impede communication. P: range of features but variable control; generally understood without much effort; some words mispronounced.
Band 5 — FC: usually keeps going but relies on repetition/self-correction/slow speech; hesitations searching for basic lexis/grammar; overuse of certain connectives. LR: sufficient for familiar & unfamiliar topics but limited flexibility; attempts paraphrase, not always successfully. GRA: basic forms fairly well controlled; complex structures attempted but limited, nearly always with errors, may need reformulation. P: some acceptable features but limited control.
Band 4 — FC: cannot keep going without noticeable pauses; may speak slowly with frequent repetition; basic linking of simple sentences. LR: sufficient for familiar topics only, basic vocabulary; rarely paraphrases. GRA: basic sentence forms and some short utterances but errors are numerous except in memorised expressions. P: limited features, frequent lapses, mispronunciation causes difficulty.
Bands 3–1: increasingly unable to sustain speech, minimal vocabulary, no sentence control, very hard to understand.`;

const WRITING_TASK2_DESCRIPTORS = `OFFICIAL IELTS WRITING TASK 2 BAND DESCRIPTORS (mark strictly against these).
Criteria: Task Response (TR), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA).

Band 9 — TR: fully addresses all parts; fully developed position; relevant, fully extended, well-supported ideas. CC: cohesion attracts no attention; skilful paragraphing. LR: wide range, very natural and sophisticated control; rare 'slip' errors. GRA: wide range with full flexibility and accuracy; rare minor 'slip' errors.
Band 8 — TR: sufficiently addresses all parts; well-developed response with relevant, extended, supported ideas. CC: logical sequencing; manages cohesion well; appropriate paragraphing. LR: wide range used fluently and flexibly for precise meaning; skilful uncommon items, occasional word-choice/collocation inaccuracy; rare spelling/word-form errors. GRA: wide range; majority of sentences error-free; only very occasional errors.
Band 7 — TR: addresses all parts; clear position throughout; extends and supports main ideas but may over-generalise / supporting ideas may lack focus. CC: logically organised, clear progression; range of cohesive devices though some under/over-use; clear central topic per paragraph. LR: sufficient range for flexibility and precision; less-common items with awareness of style/collocation; occasional word-choice/spelling/word-form errors. GRA: variety of complex structures; frequent error-free sentences; good control with a few errors.
Band 6 — TR: addresses all parts though some more fully than others; relevant position but conclusions may be unclear/repetitive; main ideas but some inadequately developed/unclear. CC: coherent with clear overall progression; cohesive devices used effectively but cohesion within/between sentences may be faulty/mechanical; paragraphing not always logical. LR: adequate range; attempts less-common vocabulary with some inaccuracy; some spelling/word-form errors that do not impede. GRA: mix of simple and complex forms; some errors but they rarely reduce communication.
Band 5 — TR: addresses task only partially; format may be inappropriate; position expressed but development unclear, may lack conclusions; main ideas limited and under-developed, some irrelevant detail. CC: some organisation but may lack overall progression; inadequate/inaccurate/over-use of cohesive devices; may not paragraph. LR: limited range, minimally adequate; noticeable spelling/word-form errors that may cause difficulty. GRA: limited range; complex sentences less accurate than simple; frequent errors, punctuation may be faulty, can cause difficulty.
Band 4 — TR: minimal/tangential response; format may be inappropriate; unclear position; main ideas hard to identify, may be irrelevant/repetitive. CC: not arranged coherently, no clear progression; basic cohesive devices, may be inaccurate/repetitive. LR: only basic vocabulary, repetitive/inappropriate; limited control of word formation/spelling causing strain. GRA: very limited range, rare subordinate clauses; errors predominate; faulty punctuation.
Bands 3–1: does not adequately address the task; very limited control of organisation, vocabulary and grammar; meaning severely distorted or absent.`;

const WRITING_TASK1_DESCRIPTORS = `OFFICIAL IELTS WRITING TASK 1 BAND DESCRIPTORS (mark strictly against these).
Criteria: Task Achievement (TA), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA).
(Academic Task 1 = describe a graph/chart/process; General Training Task 1 = a letter. Minimum 150 words.)

Band 9 — TA: all requirements fully and appropriately satisfied; extremely rare lapses in content. CC/LR/GRA: as Task 2 band 9.
Band 8 — TA: covers all requirements sufficiently; (Academic) key features skilfully selected, clearly presented/highlighted/illustrated; (GT) all bullet points clearly presented and extended; occasional omissions. CC/LR/GRA: as Task 2 band 8.
Band 7 — TA: covers the requirements; clear overview with main trends/differences (Academic) or clear purpose and consistent tone (GT); key features highlighted but could be more fully illustrated/extended. CC/LR/GRA: as Task 2 band 7.
Band 6 — TA: addresses requirements; presents an overview but details may be irrelevant/inappropriate/inaccurate; format generally appropriate. CC/LR/GRA: as Task 2 band 6.
Band 5 — TA: generally addresses the task; format may be inappropriate; mechanical recount without clear overview; key features insufficiently covered, may lack data (Academic) or clear purpose/consistent tone (GT). CC/LR/GRA: as Task 2 band 5.
Band 4 — TA: attempts the task but does not cover all key features; may confuse key features with detail; format inappropriate. CC/LR/GRA: as Task 2 band 4.
Bands 3–1: fails to address the task; content largely irrelevant or wholly unrelated.
Note: an under-length response (below 150 words) cannot score highly on Task Achievement.`;

module.exports = {
  SPEAKING_BAND_DESCRIPTORS,
  WRITING_TASK1_DESCRIPTORS,
  WRITING_TASK2_DESCRIPTORS,
};
