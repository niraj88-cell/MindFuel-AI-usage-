import * as SecureStore from 'expo-secure-store';

// SecureStore has a 2048 byte limit. We need to split large values (like Supabase auth token) into chunks.
export const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const value = await SecureStore.getItemAsync(key);
    if (!value) return null;

    if (value.startsWith('chunked:')) {
      const partsCount = parseInt(value.replace('chunked:', ''), 10);
      let fullValue = '';
      for (let i = 0; i < partsCount; i++) {
        const part = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (!part) return null; // Corrupted
        fullValue += part;
      }
      return fullValue;
    }
    return value;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length < 2000) {
      await SecureStore.setItemAsync(key, value);
    } else {
      const chunks = value.match(/.{1,2000}/g) || [];
      await SecureStore.setItemAsync(key, `chunked:${chunks.length}`);
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    const value = await SecureStore.getItemAsync(key);
    if (value?.startsWith('chunked:')) {
      const partsCount = parseInt(value.replace('chunked:', ''), 10);
      for (let i = 0; i < partsCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
    }
    await SecureStore.deleteItemAsync(key);
  }
};
