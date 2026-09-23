// Caregiver mode — manage health records for more than one person (yourself, a
// parent, a child…). A "profile" tags the records-based features (medicines,
// children's vaccines, pregnancy, recovery) so a caregiver can switch between
// people. Profiles themselves are stored as synced records (kind='profile').
// The built-in "Myself" profile (id 'self') is always present.

import { listRecords, upsertRecord, deleteRecord } from './records';

export interface Profile { id: string; name: string; relation: string; self?: boolean }

const ACTIVE_KEY = 'meddroid_active_profile';

export function listProfiles(): Profile[] {
  const recs = listRecords<{ name: string; relation: string }>('profile');
  const custom = recs.map((r) => ({ id: r.id, name: r.data.name, relation: r.data.relation }));
  return [{ id: 'self', name: 'Myself', relation: 'self', self: true }, ...custom];
}

export function activeProfileId(): string {
  try {
    const id = localStorage.getItem(ACTIVE_KEY) || 'self';
    // guard against a deleted profile
    if (id !== 'self' && !listProfiles().some((p) => p.id === id)) return 'self';
    return id;
  } catch { return 'self'; }
}

export function setActiveProfile(id: string) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* ignore */ }
}

export function addProfile(name: string, relation: string): string {
  const r = upsertRecord({ kind: 'profile', data: { name: name.trim(), relation, profile: '__meta' } });
  return r.id;
}

export function removeProfile(id: string) {
  if (id === 'self') return;
  deleteRecord(id);
  if (activeProfileId() === id) setActiveProfile('self');
}

/** True if a record (via its data.profile) belongs to the given profile. Legacy
 *  records without a profile tag are treated as the owner's ('self'). */
export function belongsTo(dataProfile: string | undefined, profileId: string): boolean {
  return (dataProfile || 'self') === profileId;
}
