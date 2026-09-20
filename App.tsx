/**
 * アプリのエントリポイント
 *
 * D-07：画面が3つだけなので、ルーティングライブラリを入れず useState で切り替える。
 * A-01：バックエンドを持たず、バンドルした SQLite だけで動作する（完全オフライン）。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { loadAllRecipes } from './src/db/queries.ts';
import { searchRecipes, type Recipe, type RecipeGroup, type ScoredRecipe } from './src/search/score.ts';
import { V1IngredientInput } from './src/ui/V1IngredientInput.tsx';
import { V2RecipeList } from './src/ui/V2RecipeList.tsx';
import { V3RecipeDetail } from './src/ui/V3RecipeDetail.tsx';
import { colors, font, space } from './src/ui/theme.ts';

export default function App() {
  return (
    // react-native の SafeAreaView は非推奨で、ノッチ端末で上下の余白が効かない。
    // react-native-safe-area-context を使う
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="recipes.db"
        assetSource={{ assetId: require('./assets/recipes.db') }}
        onInit={async (db: SQLiteDatabase) => {
          // 読み取り専用で使う。書き込みは行わない（基本設計 M-03）
          await db.execAsync('PRAGMA query_only = ON;');
        }}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" />
          <Screens />
        </SafeAreaView>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

type Screen =
  | { name: 'input' }
  | { name: 'list' }
  | { name: 'detail'; scored: ScoredRecipe };

function Screens() {
  const db = useSQLiteContext();

  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ingredientIds, setIngredientIds] = useState<number[]>([]);
  const [unknownWords, setUnknownWords] = useState<string[]>([]);
  const [groups, setGroups] = useState<RecipeGroup[]>([]);
  const [screen, setScreen] = useState<Screen>({ name: 'input' });

  // D-15：起動時に一度だけ全件読み込み、以降の検索はメモリ上で行う
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await loadAllRecipes(db);
        if (!cancelled) setRecipes(all);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const handleChange = useCallback((ids: number[], unknown: string[]) => {
    setIngredientIds(ids);
    setUnknownWords(unknown);
  }, []);

  const handleSearch = useCallback(() => {
    if (!recipes) return;
    setGroups(searchRecipes(recipes, ingredientIds));
    setScreen({ name: 'list' });
  }, [recipes, ingredientIds]);

  const content = useMemo(() => {
    if (loadError) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>レシピを読み込めませんでした</Text>
          <Text style={styles.errorBody}>{loadError}</Text>
        </View>
      );
    }

    switch (screen.name) {
      case 'list':
        return (
          <V2RecipeList
            groups={groups}
            onSelect={(scored) => setScreen({ name: 'detail', scored })}
            onBack={() => setScreen({ name: 'input' })}
          />
        );
      case 'detail':
        return (
          <V3RecipeDetail scored={screen.scored} onBack={() => setScreen({ name: 'list' })} />
        );
      default:
        return (
          <V1IngredientInput
            ingredientIds={ingredientIds}
            unknownWords={unknownWords}
            onChange={handleChange}
            onSearch={handleSearch}
            ready={recipes !== null}
          />
        );
    }
  }, [screen, groups, ingredientIds, unknownWords, recipes, loadError, handleChange, handleSearch]);

  return content;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.sm },
  errorTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, textAlign: 'center' },
  errorBody: { fontSize: font.small, color: colors.subtext, textAlign: 'center' },
});
