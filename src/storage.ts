import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

const INDEX_KEY = 'offline-artifacts:index';
const WEB_HTML_PREFIX = 'offline-artifacts:html:';

export type SavedArtifact = {
  code: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
  savedAt: string;
  /** file:// URI on native; unused on web (html lives in AsyncStorage instead) */
  localPath: string;
};

function artifactsDir(): Directory {
  return new Directory(Paths.document, 'offline-artifacts');
}

async function readIndex(): Promise<SavedArtifact[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedArtifact[];
  } catch {
    return [];
  }
}

async function writeIndex(list: SavedArtifact[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

export async function listSavedArtifacts(): Promise<SavedArtifact[]> {
  const list = await readIndex();
  return [...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveArtifact(params: {
  code: string;
  html: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
}): Promise<SavedArtifact> {
  const { code, html, title, sourceUrl, createdAt } = params;
  let localPath = '';

  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(`${WEB_HTML_PREFIX}${code}`, html);
  } else {
    const dir = artifactsDir();
    if (!dir.exists) dir.create({ intermediates: true });
    const file = new File(dir, `${code}.html`);
    if (file.exists) file.delete();
    file.create();
    file.write(html);
    localPath = file.uri;
  }

  const entry: SavedArtifact = {
    code,
    title,
    sourceUrl,
    createdAt,
    savedAt: new Date().toISOString(),
    localPath,
  };

  const list = await readIndex();
  const withoutExisting = list.filter(a => a.code !== code);
  await writeIndex([entry, ...withoutExisting]);

  return entry;
}

export async function readSavedHtml(entry: SavedArtifact): Promise<string> {
  if (Platform.OS === 'web') {
    const html = await AsyncStorage.getItem(`${WEB_HTML_PREFIX}${entry.code}`);
    if (!html) throw new Error('Saved content is missing.');
    return html;
  }
  const file = new File(entry.localPath);
  if (!file.exists) throw new Error('Saved file is missing from this device.');
  return await file.text();
}

export async function deleteSavedArtifact(code: string): Promise<void> {
  const list = await readIndex();
  const entry = list.find(a => a.code === code);
  if (entry) {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(`${WEB_HTML_PREFIX}${code}`);
    } else if (entry.localPath) {
      const file = new File(entry.localPath);
      if (file.exists) file.delete();
    }
  }
  await writeIndex(list.filter(a => a.code !== code));
}
