/**
 * V3 レシピ詳細（基本設計 第3章 / D-01 / D-04 / D-09）
 *
 * 調理手順は保持していないため、「作り方を見る」で楽天レシピのページを開く（D-01）。
 * react-native-webview は使わず expo-web-browser を使う。
 * iOS では SFSafariViewController がモーダル表示され、依存も1つ減る。
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as WebBrowser from 'expo-web-browser';
import { getIngredient } from '../ingredients/normalizer.ts';
import type { ScoredRecipe } from '../search/score.ts';
import { colors, font, MIN_TAP, space } from './theme.ts';

type Props = {
  scored: ScoredRecipe;
  onBack: () => void;
};

export function V3RecipeDetail({ scored, onBack }: Props) {
  useKeepAwake(); // NFR-07：レシピを見ながら調理するので画面を消さない
  const [opening, setOpening] = useState(false);
  const { recipe } = scored;

  const missingSet = new Set(scored.missingIds);
  // 表示用の材料。重複した食材は1行にまとめず、元の並びをそのまま見せる（M-01）
  const materials = recipe.materials.filter((m) => m.ingredientId !== null);
  const meta = [recipe.indication, recipe.cost].filter(Boolean); // D-09

  const openRecipe = async () => {
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(recipe.url);
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="レシピ一覧に戻る">
          <Text style={styles.backText}>‹ 一覧</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{recipe.title}</Text>

        {meta.length > 0 && <Text style={styles.meta}>{meta.join(' ・ ')}</Text>}

        {scored.missingIds.length > 0 && (
          <View style={styles.missingBox}>
            <Text style={styles.missingTitle}>買い足すもの</Text>
            <Text style={styles.missingNames}>
              {scored.missingIds.map((id) => getIngredient(id)?.name).join('・')}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>材料</Text>
        <View style={styles.list}>
          {materials.map((m, i) => {
            const ing = getIngredient(m.ingredientId!);
            const isMissing = missingSet.has(m.ingredientId!);
            const isStaple = ing?.staple ?? false;
            return (
              <View key={`${m.raw}-${i}`} style={styles.row}>
                <Text style={[styles.mark, isMissing && styles.markMissing]}>
                  {isMissing ? '✕' : '✓'}
                </Text>
                <Text style={[styles.rowText, isMissing && styles.rowTextMissing]}>
                  {m.raw}
                  {isStaple && <Text style={styles.stapleTag}>　常備</Text>}
                </Text>
              </View>
            );
          })}
        </View>

        {/* D-04：正規化できなかった材料は判定から外している。隠さず正直に出す */}
        {scored.unknownRaws.length > 0 && (
          <View style={styles.unknownBox}>
            <Text style={styles.sectionTitle}>確認が必要な材料</Text>
            <Text style={styles.unknownNote}>
              これらは自動判定できなかったため、上の「作れる／不足」には含めていません
            </Text>
            {scored.unknownRaws.map((raw, i) => (
              <Text key={`${raw}-${i}`} style={styles.unknownItem}>
                ・{raw}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={openRecipe} disabled={opening} style={styles.openButton}>
          <Text style={styles.openLabel}>{opening ? '開いています…' : '作り方を見る'}</Text>
        </Pressable>
        <Text style={styles.credit}>楽天レシピのページが開きます</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: { minHeight: MIN_TAP, minWidth: MIN_TAP, justifyContent: 'center' },
  backText: { fontSize: font.body, color: colors.accent, fontWeight: '600' },

  scroll: { padding: space.md, gap: space.md, paddingBottom: space.xl },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text, lineHeight: 38 },
  meta: { fontSize: font.small, color: colors.subtext },

  missingBox: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.missing,
    borderWidth: 1,
    borderRadius: 12,
    padding: space.md,
    gap: space.xs,
  },
  missingTitle: { fontSize: font.small, color: colors.missing, fontWeight: '700' },
  missingNames: { fontSize: font.body, color: colors.missing, fontWeight: '700' },

  sectionTitle: { fontSize: font.section, fontWeight: '700', color: colors.text },
  list: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, minHeight: 32 },
  mark: { fontSize: font.body, color: colors.ok, width: 24 },
  markMissing: { color: colors.missing },
  rowText: { fontSize: font.body, color: colors.text, flex: 1, lineHeight: 28 },
  rowTextMissing: { color: colors.missing },
  stapleTag: { fontSize: 13, color: colors.subtext },

  unknownBox: {
    marginTop: space.md,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.xs,
  },
  unknownNote: { fontSize: font.small, color: colors.subtext, lineHeight: 24 },
  unknownItem: { fontSize: font.small, color: colors.text },

  footer: {
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.xs,
  },
  openButton: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openLabel: { fontSize: font.body, fontWeight: '700', color: '#fff' },
  credit: { fontSize: 13, color: colors.subtext, textAlign: 'center' },
});
