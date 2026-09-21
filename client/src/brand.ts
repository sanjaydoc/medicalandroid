// Central branding for the app. Rename here and it updates everywhere.
export const BRAND = {
  name: 'MedAI',                       // short name (working placeholder — rename freely)
  full: 'MedAI Assistant',
  tagline: 'Your AI medical assistant',
  greeting: 'Where should we begin?',
  inputPlaceholder: 'Ask a medical question…',
  disclaimer:
    'MedAI is AI and can make mistakes. It provides general health information, not a diagnosis or medical advice — always consult a qualified clinician.',
  appId: 'com.medai.assistant',
  supportEmail: 'dr.sanjay@stemcellsprotocol.com',
};

// Speciality quick-picks for the home. Labels MUST match the Assistant's
// SPECIALTIES labels so a pick carries over cleanly on the handoff.
export const SPECIALITIES: string[] = [
  'General Physician',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Oncology & Haematology',
  'Endocrinology',
  'Pulmonology',
  'Nephrology',
  'Dermatology',
  'Ophthalmology',
  'Dentistry',
  'Regenerative Medicine',
];
