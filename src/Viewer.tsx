import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { C } from './theme';

type Props = {
  html: string;
  code: string;
  onClose: () => void;
  /** Reports the page's own background so the app can match the status bar to it. */
  onPageColor?: (isLight: boolean) => void;
};

// Runs before the page's own code: turns off what makes a web view feel like a browser
// (pinch zoom, tap flashes, long-press menus, rubber-band scrolling) and reports the page colour.
const BEFORE = `(function(){
  var css='html{-webkit-text-size-adjust:100%;overscroll-behavior:none}'
    +'*{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}'
    +'body{-webkit-user-select:none;user-select:none}'
    +'input,textarea,[contenteditable]{-webkit-user-select:text;user-select:text}';
  function color(){
    try{
      var c=getComputedStyle(document.body).backgroundColor;
      if(!c||c==='transparent'||/rgba\\(0, 0, 0, 0\\)/.test(c))c=getComputedStyle(document.documentElement).backgroundColor;
      if(!c||c==='transparent'||/rgba\\(0, 0, 0, 0\\)/.test(c))c='rgb(255, 255, 255)';
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({bg:c}));
    }catch(e){}
  }
  function ready(){
    var old=document.querySelectorAll('meta[name=viewport]');
    for(var i=0;i<old.length;i++)old[i].parentNode.removeChild(old[i]);
    var m=document.createElement('meta');m.name='viewport';
    m.content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
    var s=document.createElement('style');s.textContent=css;
    if(document.documentElement.outerHTML.indexOf('safe-area-inset')<0)
      s.textContent+='html{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}';
    (document.head||document.documentElement).appendChild(m);
    (document.head||document.documentElement).appendChild(s);
    color();setTimeout(color,400);
    document.addEventListener('click',function(){setTimeout(color,80)},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
  document.addEventListener('gesturestart',function(e){e.preventDefault()});
})();true;`;

function isLightColor(css: string): boolean {
  const n = css.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255];
  return 0.299 * n[0] + 0.587 * n[1] + 0.114 * n[2] > 150;
}

export function Viewer({ html, code, onClose, onPageColor }: Props) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const [bg, setBg] = useState<string>(C.bg);
  const [shown, setShown] = useState(false);
  // Each page gets an address of its own, so what it saves (progress, settings) stays with it.
  const baseUrl = `https://${code.toLowerCase()}.offline-artifacts.app/`;

  const reveal = () => {
    if (shown) return;
    setShown(true);
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };

  useEffect(() => {
    const t = setTimeout(reveal, 2500);
    return () => clearTimeout(t);
  });

  const edge = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx > 12 && Math.abs(g.dy) < 30,
        onPanResponderRelease: (_, g) => {
          if (g.dx > 70) onClose();
        },
      }),
    [onClose],
  );

  const closeButton = (
    <Pressable
      onPress={onClose}
      hitSlop={10}
      accessibilityLabel="Back to saved pages"
      style={({ pressed }) => [styles.close, { bottom: insets.bottom + 14, right: insets.right + 14, opacity: pressed ? 1 : 0.6 }]}
    >
      <Text style={styles.closeText}>{'✕'}</Text>
    </Pressable>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fill}>
        {React.createElement('iframe', {
          srcDoc: html,
          style: { flex: 1, border: 'none', width: '100%', height: '100%', background: '#fff' },
          sandbox: 'allow-scripts allow-same-origin',
        })}
        {closeButton}
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: bg }]}>
      <Animated.View style={[styles.fill, { opacity: fade }]}>
        <WebView
          source={{ html, baseUrl }}
          originWhitelist={['*']}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          containerStyle={{ backgroundColor: 'transparent' }}
          injectedJavaScriptBeforeContentLoaded={BEFORE}
          onMessage={e => {
            try {
              const color = JSON.parse(e.nativeEvent.data).bg as string;
              if (color) {
                setBg(color);
                onPageColor?.(isLightColor(color));
                reveal();
              }
            } catch {}
          }}
          onLoadEnd={reveal}
          onShouldStartLoadWithRequest={req => {
            if (req.url.startsWith(baseUrl) || req.url.startsWith('about:') || req.isTopFrame === false) return true;
            if (/^https?:/i.test(req.url)) Linking.openURL(req.url).catch(() => {});
            return false;
          }}
          bounces={false}
          overScrollMode="never"
          decelerationRate="normal"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          allowsLinkPreview={false}
          allowsBackForwardNavigationGestures={false}
          dataDetectorTypes="none"
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          scalesPageToFit={false}
          textZoom={100}
          hideKeyboardAccessoryView
          keyboardDisplayRequiresUserAction={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          domStorageEnabled
          showsHorizontalScrollIndicator={false}
          setSupportMultipleWindows={false}
        />
      </Animated.View>
      {!shown && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={C.dim} />
        </View>
      )}
      <View style={styles.edge} {...edge.panHandlers} />
      {closeButton}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  loading: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 18 },
  close: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,22,30,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
