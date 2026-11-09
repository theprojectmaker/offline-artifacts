import React from 'react';
import { Platform, View } from 'react-native';
import WebView from 'react-native-webview';

type Props = {
  html: string;
  /** file:// URI; used on native so relative asset references inside the page still resolve */
  fileUri?: string;
};

export function Viewer({ html, fileUri }: Props) {
  if (Platform.OS === 'web') {
    // react-native-webview has no web implementation; fall back to a plain iframe,
    // which is enough to confirm the fetched/stored HTML renders with no network calls.
    return React.createElement('iframe', {
      srcDoc: html,
      style: { flex: 1, border: 'none', width: '100%', height: '100%' },
      sandbox: 'allow-scripts',
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={fileUri ? { uri: fileUri } : { html }}
        originWhitelist={['*']}
        allowFileAccess
        allowUniversalAccessFromFileURLs
      />
    </View>
  );
}
