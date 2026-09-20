/**
 * V2 レシピ一覧（基本設計 第3章 / 第7章）
 *
 * 不足数でグルーピングして表示する。
 * S3（まな板の横に置いて離れて見る）を踏まえ、1件あたりの高さを大きく取り、
 * 1画面に3〜4件しか入らないようにする。
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getIngredient } from '../ingredients/normalizer.ts';
import type { RecipeGroup, ScoredRecipe } from '../search/score.ts';
import { colors, font, MIN_TAP, space } from './theme.ts';

type Props = {
  groups: RecipeGroup[];
  onSelect: (scored: ScoredRecipe) => void;
  onBack: () => void;
};

export function V2RecipeList({ groups, onSelect, onBack }: Props) {
  // 「いま作れる」は常に開く。それ以外は折りたたんで情報量を抑える
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({ 1: false, 2: true });

  const total = groups.reduce((n, g) => n + g.total, 0);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="食材の入力に戻る">
          <Text style={styles.backText}>‹ 食材</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{total}件のレシピ</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {groups.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>作れそうなレシピが見つかりませんでした</Text>
            <Text style={styles.emptyBody}>食材を追加して、もう一度お試しください</Text>
          </View>
        )}

        {groups.map((group) => {
          const isCollapsed = collapsed[group.missing] ?? false;
          return (
            <View key={group.missing} style={styles.group}>
              <Pressable
                onPress={() =>
                  setCollapsed((c) => ({ ...c, [group.missing]: !isCollapsed }))
                }
                style={styles.groupHeader}
              >
                <Text style={styles.groupTitle}>
                  {group.label}
                  <Text style={styles.groupCount}>　{group.total}件</Text>
                </Text>
                <Text style={styles.chevron}>{isCollapsed ? '▼' : '▲'}</Text>
              </Pressable>

              {!isCollapsed &&
                group.items.map((scored) => (
                  <RecipeCard key={scored.recipe.id} scored={scored} onPress={() => onSelect(scored)} />
                ))}

              {!isCollapsed && group.total > group.items.length && (
                <Text style={styles.more}>
                  ほか{group.total - group.items.length}件（上位{group.items.length}件を表示）
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function RecipeCard({ scored, onPress }: { scored: ScoredRecipe; onPress: () => void }) {
  const missingNames = scored.missingIds.map((id) => getIngredient(id)?.name).filter(Boolean);
  // D-09：「指定なし」は ETL で null になっているため、行ごと出さない
  const meta = [scored.recipe.indication, scored.recipe.cost].filter(Boolean).join(' ・ ');

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {scored.recipe.title}
      </Text>

      {missingNames.length > 0 ? (
        <Text style={styles.missing} numberOfLines={1}>
          不足：{missingNames.join('・')}
        </Text>
      ) : (
        <Text style={styles.ok}>材料はそろっています</Text>
      )}

      <Text style={styles.meta}>
        手持ち{scored.matched}品を使用
        {meta ? ` ・ ${meta}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: { minHeight: MIN_TAP, minWidth: MIN_TAP, justifyContent: 'center' },
  backText: { fontSize: font.body, color: colors.accent, fontWeight: '600' },
  headerTitle: { fontSize: font.small, color: colors.subtext },

  scroll: { padding: space.md, gap: space.lg },
  group: { gap: space.sm },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TAP,
  },
  groupTitle: { fontSize: font.section, fontWeight: '700', color: colors.text },
  groupCount: { fontSize: font.small, fontWeight: '400', color: colors.subtext },
  chevron: { fontSize: font.small, color: colors.subtext },

  // S3：1画面に3〜4件。1件を大きく取る
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.xs,
    minHeight: 96,
    justifyContent: 'center',
  },
  cardTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, lineHeight: 28 },
  missing: { fontSize: font.small, color: colors.missing, fontWeight: '600' },
  ok: { fontSize: font.small, color: colors.ok, fontWeight: '600' },
  meta: { fontSize: font.small, color: colors.subtext },
  more: { fontSize: font.small, color: colors.subtext, paddingVertical: space.sm },

  empty: { padding: space.xl, gap: space.sm, alignItems: 'center' },
  emptyTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: font.small, color: colors.subtext, textAlign: 'center' },
});
