import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Platform,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

// Default URL: Vercel URL or your PC's network IP (e.g. http://172.21.10.9:3000)
const INITIAL_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.21.10.9:3000';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [serverUrl, setServerUrl] = useState(INITIAL_URL);
  const [inputUrl, setInputUrl] = useState(INITIAL_URL);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleConnect = (urlToConnect) => {
    let target = (urlToConnect || inputUrl).trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `http://${target}`;
    }
    setServerUrl(target);
    setHasError(false);
    setLoading(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#f6f7fb" />
      <View style={styles.container}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandLetter}>H</Text>
            </View>
            <Text style={styles.errorTitle}>Connect to Haven HMS</Text>
            <Text style={styles.errorSubtitle}>
              Could not reach: {serverUrl}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Server URL (Vercel or Local Network IP):</Text>
              <TextInput
                style={styles.urlInput}
                value={inputUrl}
                onChangeText={setInputUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="e.g. https://your-hms.vercel.app or http://172.21.10.9:3000"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity style={styles.connectButton} onPress={() => handleConnect(inputUrl)}>
              <Text style={styles.connectButtonText}>Connect to Server</Text>
            </TouchableOpacity>

            <View style={styles.hintsBox}>
              <Text style={styles.hintTitle}>Tips:</Text>
              <Text style={styles.hintText}>• If testing locally, your phone and PC must be on the same Wi-Fi.</Text>
              <Text style={styles.hintText}>• Or paste your live Vercel URL once deployed.</Text>
            </View>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: serverUrl }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            allowsBackForwardNavigationGestures={true}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
            }}
            onLoadStart={() => {
              setLoading(true);
              setHasError(false);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0f766e" />
                <Text style={styles.loadingText}>Loading Haven Hostel...</Text>
              </View>
            )}
            startInLoadingState={true}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f6f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f6f7fb',
  },
  brandIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandLetter: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  urlInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  connectButton: {
    backgroundColor: '#0f766e',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  hintsBox: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
});
