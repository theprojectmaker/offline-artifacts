import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArtifactApiError, fetchArtifactByCode } from './src/api';
import {
  deleteSavedArtifact,
  listSavedArtifacts,
  readSavedHtml,
  saveArtifact,
  type SavedArtifact,
} from './src/storage';
import { Viewer } from './src/Viewer';
import { C } from './src/theme';

const WIDE_BREAKPOINT = 700;

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

type ViewerState = { entry: SavedArtifact; html: string };

function Main() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [saved, setSaved] = useState<SavedArtifact[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [pageIsLight, setPageIsLight] = useState(false);

  const refresh = useCallback(() => {
    listSavedArtifacts().then(setSaved);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openEntry = async (entry: SavedArtifact) => {
    try {
      const html = await readSavedHtml(entry);
      setViewer({ entry, html });
    } catch (e) {
      Alert.alert('Could not open', e instanceof Error ? e.message : String(e));
    }
  };

  const onDownload = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const fetched = await fetchArtifactByCode(code);
      const entry = await saveArtifact(fetched);
      setCode('');
      refresh();
      openEntry(entry);
    } catch (e) {
      setError(e instanceof ArtifactApiError ? e.message : `Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = (entry: SavedArtifact) => {
    Alert.alert('Remove this?', entry.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteSavedArtifact(entry.code);
          if (viewer?.entry.code === entry.code) setViewer(null);
          refresh();
        },
      },
    ]);
  };

  const sidebar = (
    <View style={[styles.home, isWide && styles.homeWide]}>
      <Text style={styles.heading}>Offline Artifacts</Text>
      <Text style={styles.subheading}>
        Type the 4-letter code from <Text style={styles.mono}>/offlineapp</Text> to download a page
        for offline viewing.
      </Text>

      <View style={styles.entryRow}>
        <TextInput
          value={code}
          onChangeText={t => setCode(t.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
          placeholder="CODE"
          placeholderTextColor={C.dim}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={4}
          style={styles.input}
          onSubmitEditing={onDownload}
        />
        <Pressable
          onPress={onDownload}
          disabled={busy || code.length !== 4}
          style={[styles.downloadBtn, (busy || code.length !== 4) && styles.downloadBtnDisabled]}
        >
          {busy ? <ActivityIndicator color={C.text} /> : <Text style={styles.downloadBtnText}>Download</Text>}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionLabel}>Saved ({saved.length})</Text>
      <FlatList
        data={saved}
        keyExtractor={a => a.code}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>Nothing downloaded yet.</Text>}
        renderItem={({ item }) => {
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
              onPress={() => openEntry(item)}
              onLongPress={() => onDelete(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.code} · saved {new Date(item.savedAt).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );

  if (viewer) {
    return (
      <View style={styles.viewerRoot}>
        <StatusBar style={pageIsLight ? 'dark' : 'light'} />
        <Viewer
          key={viewer.entry.code}
          html={viewer.html}
          code={viewer.entry.code}
          onClose={() => setViewer(null)}
          onPageColor={setPageIsLight}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      {sidebar}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  viewerRoot: { flex: 1, backgroundColor: C.bg },
  home: { flex: 1, padding: 20 },
  homeWide: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingTop: 40 },
  heading: { color: C.text, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subheading: { color: C.dim, fontSize: 14, marginBottom: 20, lineHeight: 20 },
  mono: { fontFamily: 'Courier', color: C.accent },
  entryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.card,
    borderColor: C.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    color: C.text,
    fontSize: 20,
    letterSpacing: 4,
    textAlign: 'center',
    paddingVertical: 12,
    fontWeight: '700',
  },
  downloadBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    minWidth: 92,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBtnDisabled: { opacity: 0.4 },
  downloadBtnText: { color: '#fff', fontWeight: '700' },
  error: { color: C.danger, marginBottom: 12 },
  sectionLabel: { color: C.dim, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  empty: { color: C.dim, fontStyle: 'italic', paddingVertical: 20, textAlign: 'center' },
  row: {
    backgroundColor: C.card,
    borderColor: C.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: { color: C.text, fontSize: 16, fontWeight: '600' },
  rowMeta: { color: C.dim, fontSize: 12, marginTop: 4 },
});
