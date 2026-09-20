/**
 * V1 食材入力（基本設計 第3章）
 *
 * 音声入力と食材の確認・修正を1画面に統合する（A-04）。
 * 画面を分けると誤認識のたびに往復が発生し、S2（手が汚れている）に反する。
 */
import { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { getIngredient } from '../ingredients/normalizer.ts';
import { parseSpeech } from '../ingredients/speechParser.ts';
import { useSpeechInput } from '../speech/useSpeechInput.ts';
import { colors, font, MIN_TAP, space } from './theme.ts';

type Props = {
  ingredientIds: number[];
  unknownWords: string[];
  onChange: (ids: number[], unknown: string[]) => void;
  onSearch: () => void;
  ready: boolean;
};

export function V1IngredientInput({
  ingredientIds,
  unknownWords,
  onChange,
  onSearch,
  ready,
}: Props) {
  // FR-05：追加で話した内容は上書きせず、既存のリストに足す
  const handleResult = useCallback(
    (text: string) => {
      const parsed = parseSpeech(text);
      onChange(
        [...new Set([...ingredientIds, ...parsed.ids])],
        [...new Set([...unknownWords, ...parsed.unknown])],
      );
    },
    [ingredientIds, unknownWords, onChange],
  );

  const speech = useSpeechInput(handleResult);
  const listening = speech.status === 'listening';

  const removeIngredient = (id: number) =>
    onChange(ingredientIds.filter((x) => x !== id), unknownWords);
  const removeUnknown = (word: string) =>
    onChange(ingredientIds, unknownWords.filter((w) => w !== word));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>いま家にある食材は？</Text>

        {ingredientIds.length === 0 && unknownWords.length === 0 && (
          <Text style={styles.hint}>
            マイクを押して「玉ねぎと豚こまと卵」のように話してください
          </Text>
        )}

        <View style={styles.chips}>
          {ingredientIds.map((id) => (
            <Pressable
              key={id}
              onPress={() => removeIngredient(id)}
              style={styles.chip}
              accessibilityLabel={`${getIngredient(id)?.name} を削除`}
            >
              <Text style={styles.chipText}>{getIngredient(id)?.name}</Text>
              <Text style={styles.chipRemove}>✕</Text>
            </Pressable>
          ))}
        </View>

        {/* FR-10：認識できなかった食材を隠さずに見せる */}
        {unknownWords.length > 0 && (
          <View style={styles.unknownBox}>
            <Text style={styles.unknownTitle}>この食材は登録されていません</Text>
            <View style={styles.chips}>
              {unknownWords.map((w) => (
                <Pressable key={w} onPress={() => removeUnknown(w)} style={styles.unknownChip}>
                  <Text style={styles.unknownChipText}>{w}</Text>
                  <Text style={styles.chipRemove}>✕</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.unknownNote}>検索には使われません</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {/* 認識中であることを必ず見せる（無反応だと話し続けてよいか分からない） */}
        <Text style={styles.status} numberOfLines={2}>
          {listening ? (speech.interim || '聞いています…') : (speech.message ?? ' ')}
        </Text>

        <Pressable
          onPress={listening ? speech.stop : speech.start}
          style={[styles.mic, listening && styles.micActive]}
          accessibilityLabel={listening ? '音声入力を止める' : '音声で食材を入力する'}
        >
          <Text style={styles.micIcon}>{listening ? '■' : '🎤'}</Text>
          <Text style={styles.micLabel}>{listening ? '停止' : '話す'}</Text>
        </Pressable>

        <Pressable
          onPress={onSearch}
          disabled={!ready || ingredientIds.length === 0}
          style={[
            styles.searchButton,
            (!ready || ingredientIds.length === 0) && styles.searchButtonDisabled,
          ]}
        >
          {ready ? (
            <Text style={styles.searchLabel}>
              レシピを探す{ingredientIds.length > 0 ? `（${ingredientIds.length}品）` : ''}
            </Text>
          ) : (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.searchLabel}>レシピを読み込み中…</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.md, paddingBottom: space.lg },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text, marginBottom: space.md },
  hint: { fontSize: font.small, color: colors.subtext, lineHeight: 24 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: space.md,
    minHeight: MIN_TAP, // S2：手が汚れていても押せる大きさ
  },
  chipText: { fontSize: font.body, color: colors.text, fontWeight: '600' },
  chipRemove: { fontSize: font.small, color: colors.subtext },

  unknownBox: {
    marginTop: space.lg,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unknownTitle: { fontSize: font.small, color: colors.subtext, marginBottom: space.sm },
  unknownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: space.md,
    minHeight: MIN_TAP,
  },
  unknownChipText: { fontSize: font.small, color: colors.subtext },
  unknownNote: { fontSize: 13, color: colors.subtext, marginTop: space.sm },

  footer: {
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.md,
  },
  status: { fontSize: font.small, color: colors.subtext, minHeight: 44, textAlign: 'center' },

  // S1：片手の親指で押せるよう下部に大きく配置する
  mic: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accentSoft,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: { backgroundColor: colors.accent },
  micIcon: { fontSize: 44 },
  micLabel: { fontSize: font.small, fontWeight: '700', color: colors.text, marginTop: space.xs },

  searchButton: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: { backgroundColor: colors.disabled },
  searchLabel: { fontSize: font.body, fontWeight: '700', color: '#fff' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
