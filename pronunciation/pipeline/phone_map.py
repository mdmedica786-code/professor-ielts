"""ARPAbet to IPA mapping for Wav2Vec2 model vocabulary matching."""

ARPABET_TO_IPA = {
    # Vowels
    "AA": ["ɑ", "a", "ɒ"], "AE": ["æ"], "AH": ["ʌ", "ə"],
    "AO": ["ɔ"], "AW": ["aʊ", "a"], "AY": ["aɪ", "a"],
    "EH": ["ɛ", "e"], "ER": ["ɜ", "ɝ", "ɚ"], "EY": ["eɪ", "e"],
    "IH": ["ɪ"], "IY": ["i", "iː"], "OW": ["oʊ", "o"],
    "OY": ["ɔɪ", "ɔ"], "UH": ["ʊ"], "UW": ["u", "uː"],
    # Consonants
    "B": ["b"], "CH": ["tʃ", "t͡ʃ"], "D": ["d"], "DH": ["ð"],
    "F": ["f"], "G": ["ɡ", "g"], "HH": ["h", "ɦ"],
    "JH": ["dʒ", "d͡ʒ"], "K": ["k"], "L": ["l", "ɫ"],
    "M": ["m"], "N": ["n"], "NG": ["ŋ"], "P": ["p"],
    "R": ["ɹ", "r"], "S": ["s"], "SH": ["ʃ"], "T": ["t"],
    "TH": ["θ"], "V": ["v"], "W": ["w"], "Y": ["j"],
    "Z": ["z"], "ZH": ["ʒ"],
}

# Human-readable descriptions for feedback
PHONE_DESCRIPTIONS = {
    "TH": {
        "name": "/θ/ (voiceless 'th')",
        "example": "think, three, through",
        "tip": "Place your tongue between your teeth and blow air without vibrating your vocal cords"
    },
    "DH": {
        "name": "/ð/ (voiced 'th')",
        "example": "this, that, the",
        "tip": "Same tongue position as /θ/ but vibrate your vocal cords"
    },
    "R": {
        "name": "/r/",
        "example": "red, right, very",
        "tip": "Curl your tongue tip back without touching the roof of your mouth"
    },
    "L": {
        "name": "/l/",
        "example": "light, feel, hello",
        "tip": "Touch your tongue tip to the ridge behind your upper front teeth"
    },
    "V": {
        "name": "/v/",
        "example": "very, have, love",
        "tip": "Gently bite your lower lip and vibrate — different from /w/"
    },
    "W": {
        "name": "/w/",
        "example": "water, away, win",
        "tip": "Round your lips into a tight circle and release"
    },
    "NG": {
        "name": "/ŋ/ ('ng')",
        "example": "sing, thinking, long",
        "tip": "Back of tongue touches soft palate — no /g/ sound at the end"
    },
    "SH": {
        "name": "/ʃ/ ('sh')",
        "example": "she, nation, special",
        "tip": "Lips slightly rounded, tongue wider than for /s/"
    },
    "CH": {
        "name": "/tʃ/ ('ch')",
        "example": "church, teacher, much",
        "tip": "Start with /t/ then release into /ʃ/"
    },
    "JH": {
        "name": "/dʒ/ ('j')",
        "example": "judge, general, age",
        "tip": "Start with /d/ then release into /ʒ/"
    },
    "ZH": {
        "name": "/ʒ/",
        "example": "measure, vision, garage",
        "tip": "Like /ʃ/ but with vocal cord vibration"
    },
    "AE": {
        "name": "/æ/ (short 'a')",
        "example": "cat, bad, plan",
        "tip": "Mouth wide open, tongue low and pushed forward"
    },
    "IH": {
        "name": "/ɪ/ (short 'i')",
        "example": "sit, big, this",
        "tip": "Short and relaxed — not the same as the long 'ee' in 'see'"
    },
    "UH": {
        "name": "/ʊ/ (short 'oo')",
        "example": "book, good, could",
        "tip": "Short sound with slightly rounded lips — not full 'oo'"
    },
    "ER": {
        "name": "/ɜːr/ ('er')",
        "example": "bird, first, work",
        "tip": "Tongue curled slightly back, lips neutral — common in American English"
    },
    "AH": {
        "name": "/ʌ/ or /ə/",
        "example": "cup, about, but",
        "tip": "Short, relaxed, central mouth position"
    },
}
