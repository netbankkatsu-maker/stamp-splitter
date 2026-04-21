# LINEスタンプ切り取りツール - セットアップ＆デプロイガイド

## 概要

このガイドでは、ローカル開発から Vercel へのデプロイまでの手順を説明します。

## ✅ 前提条件

- Node.js 18.0 以上がインストールされていること
- npm または yarn がインストールされていること
- GitHub アカウント（Vercelデプロイに必須）
- Vercel アカウント（無料で作成可）

## 📦 セットアップ手順

### ステップ 1: 依存パッケージのインストール

```bash
npm install
```

#### トラブルシューティング

**エラー**: `npm ERR! notarget No matching version found`

→ 解決策:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ステップ 2: ローカル開発サーバーの起動

```bash
npm run dev
```

出力例：
```
> stamp-splitter@0.1.0 dev
> next dev

  ▲ Next.js 15.1.3
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.1s
```

ブラウザで http://localhost:3000 にアクセスしてアプリケーションが表示されるか確認します。

### ステップ 3: 動作確認

1. **テスト画像の準備**
   - 複数のスタンプが並んだ画像を用意します
   - 推奨：正方形のスタンプが複数並んだ画像

2. **アプリケーションのテスト**
   - 画像をアップロード
   - 分割数を選択（例：16枚）
   - プレビューに分割ラインが表示されるか確認
   - 「切り取ってダウンロード」をクリック
   - ZIP ファイルがダウンロードされるか確認

## 🚀 Vercelへのデプロイ

### 方法 1: Web UI でのデプロイ（推奨）

#### ステップ 1: GitHub にプッシュ

```bash
# Git の初期化
git init

# すべてのファイルをステージング
git add .

# 最初のコミット
git commit -m "Initial commit: LINE stamp splitter tool"

# GitHub でリポジトリを作成後、以下を実行
git remote add origin https://github.com/YOUR_USERNAME/stamp-splitter.git
git branch -M main
git push -u origin main
```

**GitHub でのリポジトリ作成手順:**
1. https://github.com/new にアクセス
2. Repository name: `stamp-splitter`
3. Description: `LINE stamp splitter tool`
4. Public/Private: お好みで選択
5. 「Create repository」をクリック

#### ステップ 2: Vercel でインポート

1. https://vercel.com/dashboard にアクセス
2. ログイン（GitHub アカウントが便利）
3. 「Add New」ボタン → 「Project」をクリック
4. 「Import Git Repository」セクションから GitHub リポジトリを選択
   - 検索欄で `stamp-splitter` を検索
   - 該当するリポジトリを選択
5. 「Import」ボタンをクリック

#### ステップ 3: デプロイ設定

Vercel の設定画面で：

- **Framework Preset**: Next.js（自動で検出）
- **Build Command**: `next build`（デフォルト）
- **Output Directory**: `.next`（デフォルト）
- **Environment Variables**: なし（このプロジェクトでは不要）

すべてデフォルトのままで OK です。

#### ステップ 4: デプロイ実行

「Deploy」ボタンをクリック

デプロイが完了するまで待機します（通常 2-5 分）

#### ステップ 5: 公開 URL の取得

デプロイが完了すると、以下のような URL が割り当てられます：

```
https://stamp-splitter.vercel.app
```

この URL でアプリケーションにアクセスできます。

### 方法 2: Vercel CLI でのデプロイ

```bash
# Vercel CLI をグローバルインストール
npm install -g vercel

# ログイン（ブラウザが起動します）
vercel login

# デプロイ（開発環境）
vercel

# 本番環境へデプロイ
vercel --prod
```

## 🔧 継続的なデプロイ

GitHub にプッシュすると、自動的に Vercel がデプロイを実行します：

```bash
# 機能を追加
# ファイルを編集
# テストしてコミット
git add .
git commit -m "Add new feature"

# GitHub にプッシュ → 自動で Vercel にデプロイ
git push origin main
```

## 📋 プロジェクト構成

```
stamp-splitter/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # メインページコンポーネント
│   └── globals.css         # グローバルスタイル
├── components/
│   └── StampSplitter.tsx   # メインアプリケーションロジック
├── public/                 # 静的ファイル（画像など）
├── package.json            # 依存パッケージ定義
├── tsconfig.json           # TypeScript 設定
├── next.config.js          # Next.js 設定
├── tailwind.config.ts      # Tailwind CSS 設定
├── postcss.config.js       # PostCSS 設定
├── vercel.json             # Vercel 設定
├── .eslintrc.json          # ESLint 設定
├── .gitignore              # Git 無視ファイル
└── README.md               # プロジェクト説明
```

## 🐛 トラブルシューティング

### デプロイが失敗する場合

**確認事項:**

1. **GitHub リポジトリが正しくコミットされているか**
   ```bash
   git log --oneline
   # 複数のコミットが表示されることを確認
   ```

2. **Node.js バージョン確認**
   ```bash
   node --version
   # v18.0.0 以上であることを確認
   ```

3. **ローカルでビルドができるか確認**
   ```bash
   npm run build
   npm start
   ```
   - http://localhost:3000 でアプリが起動するか確認

### ローカルで起動できない場合

```bash
# キャッシュをクリア
npm cache clean --force
rm -rf node_modules .next

# 再インストール
npm install

# ビルド
npm run build

# 実行
npm start
```

### 画像がアップロードできない場合

1. **ブラウザのコンソールを確認**
   - F12 キーで開発者ツールを開く
   - Console タブでエラーメッセージを確認

2. **ファイルサイズを確認**
   - 推奨：10MB 以下
   - スマートフォンでテストする場合：5MB 以下

### ZIP ダウンロードが機能しない場合

1. **ブラウザのキャッシュをクリア**
2. **別のブラウザでテスト**
3. **ブラウザのダウンロード設定を確認**

## 📱 本番運用のヒント

### URL をカスタムドメインに設定

1. Vercel ダッシュボード → プロジェクト選択
2. 「Settings」タブ → 「Domains」
3. カスタムドメインを追加

例：`stamps.example.com`

### SSL 証明書

- Vercel が自動で Let's Encrypt の SSL 証明書を設定します
- 追加費用なし

### アクセス分析

- Vercel ダッシュボードで基本的なアクセス統計が確認できます
- さらに詳細な分析が必要な場合は、Google Analytics などを追加できます

## 🔐 セキュリティに関する注意事項

このアプリケーション：

- ✅ **すべての処理がブラウザ内で完結**
  - サーバーに画像がアップロードされない
  - ユーザーのプライバシーが保護される

- ✅ **API キーが不要**
  - 外部サービスとの連携がない
  - セキュリティリスクが最小化される

- ✅ **HTTPS で自動保護**
  - Vercel が SSL/TLS を自動で設定

## 📚 参考資料

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Vercel デプロイガイド](https://vercel.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [JSZip ドキュメント](https://stuk.github.io/jszip/)

## ✨ さらにカスタマイズする場合

### カラーテーマの変更

`tailwind.config.ts` を編集：

```typescript
theme: {
  extend: {
    colors: {
      primary: '#3B82F6',  // 青色
    },
  },
},
```

### タイトルやテキストの変更

`components/StampSplitter.tsx` を編集：

```typescript
<h1 className="text-4xl font-bold text-gray-800 mb-2">
  カスタムタイトル
</h1>
```

### 新しい分割パターンの追加

`components/StampSplitter.tsx` の `GRID_PATTERNS` を編集：

```typescript
const GRID_PATTERNS: Record<number, GridPattern> = {
  // ... 既存のパターン
  48: { cols: 6, rows: 8, count: 48 },  // 新しいパターンを追加
};
```

ボタンも追加：

```typescript
{[8, 16, 24, 32, 40, 48].map((count) => (
  // ...
))}
```

## 🎉 デプロイ完了！

これで LINEスタンプ切り取りツール がインターネットで公開されました。

友人や同僚と URL を共有して、すぐに使用開始できます！

---

**質問や問題がある場合は、GitHub Issues で報告してください。**
