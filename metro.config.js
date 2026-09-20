// アプリにバンドルする SQLite (assets/recipes.db) を Metro がアセットとして扱えるようにする
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('db');

module.exports = config;
