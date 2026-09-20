/**
 * 音声入力（FR-01 / NFR-01 / NFR-02）
 *
 * iOS 標準の音声認識（SFSpeechRecognizer）を expo-speech-recognition 経由で使う。
 *
 * ★ requiresOnDeviceRecognition は事前確認なしに有効化してはならない
 *
 * モジュールの型定義に明記されている：
 *   「Use getSupportedLocales() to verify if the locale is installed on the device
 *     prior to enabling this option.」
 *
 * 日本語のオフラインモデルが端末に入っていない状態で true にすると
 * ネイティブ側でアプリが落ちる（シミュレータで再現・確認済み）。
 * 起動時に installedLocales を調べ、ja が入っているときだけ有効にする。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { INGREDIENTS } from '../ingredients/normalizer.ts';

/**
 * 認識のヒントに渡す食材名（SFSpeechRecognitionRequest.contextualStrings）。
 * 常備調味料はユーザーが口に出さない前提（UC-03）なので除く。
 * Apple はこの配列を少数に保つことを推奨しているため、上限を設ける。
 */
const MAX_CONTEXTUAL_STRINGS = 100;
const CONTEXTUAL_STRINGS = INGREDIENTS.filter((i) => !i.staple)
  .map((i) => i.name)
  .slice(0, MAX_CONTEXTUAL_STRINGS);

export type SpeechStatus = 'idle' | 'listening' | 'denied' | 'error';

export type UseSpeechInput = {
  status: SpeechStatus;
  /** 認識途中のテキスト。「聞いている」ことを示すために表示する */
  interim: string;
  /** ユーザーに提示するメッセージ */
  message: string | null;
  /** オフライン認識が使えるか（判定前は null） */
  onDeviceAvailable: boolean | null;
  start: () => Promise<void>;
  stop: () => void;
};

export function useSpeechInput(onResult: (text: string) => void): UseSpeechInput {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [interim, setInterim] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [onDeviceAvailable, setOnDeviceAvailable] = useState<boolean | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // 端末に日本語のオフラインモデルが入っているかを起動時に一度だけ調べる
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
        const hasJapanese = installedLocales.some((l) => l.toLowerCase().startsWith('ja'));
        if (!cancelled) setOnDeviceAvailable(hasJapanese);
      } catch {
        // 取得に失敗した場合はオフライン認識を使わない（落とさないことを優先する）
        if (!cancelled) setOnDeviceAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setStatus('listening');
    setMessage(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setStatus((s) => (s === 'listening' ? 'idle' : s));
    setInterim('');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript ?? '';
    if (!transcript) return;
    if (event.isFinal) {
      setInterim('');
      onResultRef.current(transcript);
    } else {
      setInterim(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setInterim('');
    setStatus('error');
    setMessage(errorMessage(event.error));
  });

  const start = useCallback(async () => {
    setMessage(null);
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('denied');
        setMessage('マイクと音声認識の使用を許可してください（設定 → 音声レシピ）');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'ja-JP',
        interimResults: true,
        continuous: false,
        // 日本語のオフラインモデルが確認できたときだけ true にする
        requiresOnDeviceRecognition: onDeviceAvailable === true,
        addsPunctuation: false,
        contextualStrings: CONTEXTUAL_STRINGS,
      });
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : '音声認識を開始できませんでした');
    }
  }, [onDeviceAvailable]);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // 停止に失敗しても画面を壊さない
    }
  }, []);

  return { status, interim, message, onDeviceAvailable, start, stop };
}

function errorMessage(code: string | undefined): string {
  switch (code) {
    case 'no-speech':
      return '音声を聞き取れませんでした。もう一度話してください';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'マイクの使用が許可されていません';
    case 'network':
      return 'ネットワークに接続できませんでした';
    default:
      return '音声認識に失敗しました。もう一度お試しください';
  }
}
