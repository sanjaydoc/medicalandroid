// Central branding for the app. Rename here and it updates everywhere.
export const BRAND = {
  name: 'MedDroid',
  full: 'MedDroid',
  tagline: 'Your AI medical assistant',
  greeting: "AI medical assistant, let's begin?",
  inputPlaceholder: 'Ask a medical question…',
  disclaimer:
    'MedDroid is AI and can make mistakes. It provides general health information, not a diagnosis or medical advice — always consult a qualified clinician.',
  appId: 'com.meddroid.app',
  domain: 'medicalandroid.com',
  supportEmail: 'dr.sanjayanbu@gmail.com',
  // The ONLY account allowed into the admin dashboard. This is a UI gate;
  // the database is also locked to this email by Supabase RLS (see
  // supabase/schema.sql), so a non-admin can never read the data even via the API.
  adminEmail: 'dr.sanjayanbu@gmail.com',
};

// Speciality quick-picks for the home. Labels MUST match the Assistant's
// SPECIALTIES labels so a pick carries over cleanly on the handoff.
// Labels MUST match the Assistant's SPECIALTIES labels exactly so a home pick
// carries over cleanly on the handoff.
export const SPECIALITIES: string[] = [
  'General Physician',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Dermatology',
  'Paediatrics',
  'Gynaecology & Obstetrics',
  'Gastroenterology',
  'Endocrinology (Diabetes & Thyroid)',
  'Pulmonology',
  'Nephrology',
  'Urology',
  'Oncology & Haematology',
  'Regenerative Medicine',
  'ENT (Ear, Nose & Throat)',
  'Ophthalmology',
  'Dentistry',
  'Psychiatry & Mental Health',
  'Psychology & Counselling',
  'Rheumatology',
  'Physiotherapy & Rehab',
  'Nutrition & Dietetics',
  'General Surgery',
  'Infectious Diseases',
  'Allergy & Immunology',
  'Sexual Health',
  'Emergency Medicine',
  'Geriatrics (Elderly Care)',
  'Hepatology (Liver)',
  "Andrology & Men's Health",
  'Pain Management',
  'Radiology & Imaging',
  'Neurosurgery',
  'Cardiac & Thoracic Surgery',
  'Plastic & Cosmetic Surgery',
  'Vascular Surgery',
  'Paediatric Surgery',
  'Bariatric (Weight-loss) Surgery',
];
