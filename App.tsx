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
const SIDEBAR_WIDTH = 360;

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
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
    <View style={isWide ? styles.sidebarWide : styles.root}>
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
          const active = isWide && viewer?.entry.code === item.code;
          return (
            <Pressable
              style={[styles.row, active && styles.rowActive]}
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

  const viewerPane = viewer ? (
    <View style={{ flex: 1 }}>
      <View style={styles.viewerHeader}>
        {!isWide && (
          <Pressable onPress={() => setViewer(null)} style={styles.backBtn}>
            <Text style={styles.backText}>{'←'} Back</Text>
          </Pressable>
        )}
        <Text style={styles.viewerTitle} numberOfLines={1}>
          {viewer.entry.title}
        </Text>
      </View>
      <Viewer html={viewer.html} fileUri={viewer.entry.localPath || undefined} />
    </View>
  ) : (
    <View style={[styles.viewerHeader, { justifyContent: 'center', borderBottomWidth: 0 }]}>
      <Text style={styles.empty}>Select a saved page to view it here.</Text>
    </View>
  );

  if (isWide) {
    return (
      <SafeAreaView style={styles.rootWide} edges={['top', 'bottom']}>
        {sidebar}
        <View style={styles.divider} />
        {viewerPane}
      </SafeAreaView>
    );
  }

  if (viewer) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {viewerPane}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {sidebar}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 20 },
  rootWide: { flex: 1, backgroundColor: C.bg, flexDirection: 'row' },
  sidebarWide: { width: SIDEBAR_WIDTH, padding: 20 },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: C.cardBorder },
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
  rowActive: { borderColor: C.accent, borderWidth: 2 },
  rowTitle: { color: C.text, fontSize: 16, fontWeight: '600' },
  rowMeta: { color: C.dim, fontSize: 12, marginTop: 4 },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
    borderBottomColor: C.cardBorder,
    borderBottomWidth: 1,
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  backText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  viewerTitle: { color: C.text, fontSize: 15, fontWeight: '600', flex: 1 },
});
