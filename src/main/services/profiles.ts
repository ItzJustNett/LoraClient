import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { GameProfile } from '../../shared/types';

interface ProfileStore {
  profiles: GameProfile[];
  selectedProfileId: string | null;
}

const store = new Store<ProfileStore>({
  name: 'profiles',
  defaults: {
    profiles: [],
    selectedProfileId: null,
  },
});

export class ProfileService {
  getAllProfiles(): GameProfile[] {
    return store.get('profiles', []);
  }

  getProfile(id: string): GameProfile | undefined {
    const profiles = this.getAllProfiles();
    return profiles.find(p => p.id === id);
  }

  getSelectedProfile(): GameProfile | undefined {
    const selectedId = store.get('selectedProfileId');
    if (!selectedId) return undefined;
    return this.getProfile(selectedId);
  }

  setSelectedProfile(id: string): void {
    store.set('selectedProfileId', id);
  }

  createProfile(data: Omit<GameProfile, 'id' | 'created'>): GameProfile {
    const profile: GameProfile = {
      ...data,
      id: uuidv4(),
      created: new Date().toISOString(),
    };

    const profiles = this.getAllProfiles();
    profiles.push(profile);
    store.set('profiles', profiles);

    if (profiles.length === 1) {
      store.set('selectedProfileId', profile.id);
    }

    return profile;
  }

  updateProfile(id: string, data: Partial<GameProfile>): GameProfile | null {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex(p => p.id === id);
    
    if (index === -1) return null;

    profiles[index] = { ...profiles[index], ...data };
    store.set('profiles', profiles);

    return profiles[index];
  }

  deleteProfile(id: string): boolean {
    const profiles = this.getAllProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    
    if (filtered.length === profiles.length) return false;

    store.set('profiles', filtered);

    const selectedId = store.get('selectedProfileId');
    if (selectedId === id) {
      store.set('selectedProfileId', filtered.length > 0 ? filtered[0].id : null);
    }

    return true;
  }

  updateLastPlayed(id: string): void {
    this.updateProfile(id, { lastPlayed: new Date().toISOString() });
  }

  createDefaultProfile(version: string): GameProfile {
    return this.createProfile({
      name: `Vanilla ${version}`,
      version,
      versionType: 'vanilla',
      memory: {
        min: 512,
        max: 2048,
      },
    });
  }
}

export const profileService = new ProfileService();
