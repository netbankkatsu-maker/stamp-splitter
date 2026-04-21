# LINEスタンプ切り取りツール

複数のLINEスタンプが並んだ画像を均等分割して、背景透過PNG形式でZIPダウンロードできるWebアプリケーションです。

## 機能

- 🖼️ **画像アップロード**：ドラッグ&ドロップまたはクリックで画像を選択
- 📊 **柔軟な分割オプション**：8/16/24/32/40枚から選択可能
- 👁️ **リアルタイムプレビュー**：分割ラインをオーバーレイ表示
- 🎨 **背景透過処理**：JPG画像の白背景を自動で透過に変換
- 📦 **ZIP一括ダウンロード**：すべてのスタンプをZIPで配布
- 📱 **レスポンシブデザイン**：PC/タブレット/スマートフォン対応

## 分割パターン

| 枚数 | グリッド | 用途 |
|------|--------|------|
| 8枚 | 2列 × 4行 | 少量スタンプ |
| 16枚 | 4列 × 4行 | 標準的な4×4セット |
| 24枚 | 4列 × 6行 | 中程度のセット |
| 32枚 | 4列 × 8行 | 大規模セット |
| 40枚 | 5列 × 8行 | 最大サイズ |

## 技術スタック

- **フレームワーク**: Next.js 15.x (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **画像処理**: Canvas API (ブラウザ内)
- **圧縮**: JSZip
- **デプロイ**: Vercel

## ローカル開発

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

### 本番ビルド

```bash
npm run build
npm start
```

## Vercelへのデプロイ手順

### 1. Vercelアカウント作成（初回のみ）

- https://vercel.com にアクセス
- GitHubアカウントでサインアップ

### 2. このプロジェクトをGitHubへプッシュ

```bash
# Gitの初期化
git init
git add .
git commit -m "Initial commit: LINE stamp splitter tool"

# GitHubでリポジトリを作成後
git remote add origin https://github.com/YOUR_USERNAME/stamp-splitter.git
git branch -M main
git push -u origin main
```

### 3. Vercelでデプロイ

**方法1: Vercel Web UI（最も簡単）**

1. https://vercel.com/dashboard にアクセス
2. 「Add New」→「Project」をクリック
3. GitHubからリポジトリを選択
4. 「Import」をクリック
5. 環境変数の設定（このプロジェクトでは不要）
6. 「Deploy」をクリック

**方法2: Vercel CLI**

```bash
# Vercel CLIをインストール
npm i -g vercel

# Vercelにログイン
vercel login

# デプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

### 4. デプロイ完了

- デプロイが完了するとURL（例：https://stamp-splitter.vercel.app）が割り当てられます
- 自動的にセットアップされた環境で運用可能です

## トラブルシューティング

### npm install でエラーが出る場合

```bash
# キャッシュをクリア
npm cache clean --force

# node_modulesを削除してリインストール
rm -rf node_modules package-lock.json
npm install
```

### ブラウザで "Client-side rendering failed" というエラーが出る場合

開発サーバーを再起動してください：

```bash
npm run dev
```

## 仕様詳細

### ファイル構成

```
.
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # メインページ
│   └── globals.css         # グローバルスタイル
├── components/
│   └── StampSplitter.tsx   # メインコンポーネント
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── postcss.config.js
```

### Canvas処理フロー

1. ユーザーが画像をアップロード
2. 選択した分割数に基づいてグリッドサイズを計算
3. 各セルをキャンバスで描画
4. オプション：白背景を透過に変換
5. 各スタンプをPNG形式で書き出し
6. JSZipで圧縮してZIP作成
7. ブラウザからダウンロード

### 白背景透過処理

- JPG画像のRGB(255, 255, 255)を検出
- アルファチャンネルを0（完全透過）に設定

## ブラウザ互換性

- Chrome/Edge: ✅ 完全対応
- Firefox: ✅ 完全対応
- Safari: ✅ 完全対応（iOS 13+）

## パフォーマンス

- **クライアント処理**: すべてブラウザ内で完結
- **レスポンス時間**: 画像サイズに依存（通常 1-3秒）
- **メモリ使用量**: アップロード画像サイズと同程度

## ライセンス

MIT License

## サポート

問題が発生した場合は、GitHubのIssuesセクションで報告してください。
