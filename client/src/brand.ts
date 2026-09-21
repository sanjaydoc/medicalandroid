// Central branding for the app. Rename here and it updates everywhere.
export const BRAND = {
  name: 'MediMind',
  full: 'MediMind',
  tagline: 'Your AI medical assistant',
  greeting: 'Where should we begin?',
  inputPlaceholder: 'Ask a medical question…',
  disclaimer:
    'MediMind is AI and can make mistakes. It provides general health information, not a diagnosis or medical advice — always consult a qualified clinician.',
  appId: 'com.medimind.app',
  domain: 'medicalandroid.com',
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
