# Kyuliz Education OS

学校種別や教育課程を固定せず、生徒の学習・制作・探究・活動・振り返りをつなぐ教育プラットフォームです。現在の実装はPhase 1の認証と学校構造・メンバー管理に、ダッシュボードの初期表示を加えたMVP基盤です。

## アーキテクチャ

- Next.js App Router + React + TypeScript: レスポンシブWeb UI、サーバーレンダリング、内部REST API
- Prisma ORM: 型付きデータアクセス
- SQLite: 無料のローカル開発・実証用DB。PostgreSQLを本番候補とし、Prismaスキーマのデータ型/移行を確認したうえで切替える
- パスワード: bcryptハッシュ（cost 12）
- セッション: DBにはSHA-256トークンハッシュのみ保存し、HttpOnly/SameSite=Lax Cookieでブラウザへ渡す
- ファイル/メール/外部認証: 未導入。外部サービス契約も不要

## データ設計

`School`の下に、年度ごとの`AcademicYear`、年度に属する`Term`、可変の`Division`（教育段階）、`Grade`、`Class`を置きます。学年・クラスは年度に属し、年度進行やクラス替えの履歴は`Enrollment`として保持します。生徒の内部IDは`User.id`で固定され、`studentNumber`・学年・クラス・出席番号とは別です。学校に6学年、3学年、6+3学年、その他の構成を設定できます。特定の総年数・クラス人数は制約しません。

Phase 2以降で追加する主要モデルは次の通りです。

- `PortfolioItem`: 所有者、タイトル、説明、日付、構造化カテゴリ、タグ、添付/URL、振り返り、公開範囲
- `Comment` / `Reflection`: 教師フィードバック、本人の振り返り
- `Project` / `ProjectMember` / `ProjectTask`: 個人/グループ活動、担当、期限、工程、成果物
- `FileObject` / `Permission` / `Notification`: 非公開ファイル、権限、通知
- `AuditLog`: 認証・管理操作の記録（Phase 1で実装）

## ディレクトリ構成

```text
prisma/schema.prisma             DBモデル
prisma/seed.ts                   ローカル用の例データ
src/app/api/auth/*               ログイン、ログアウト、パスワード変更
src/app/api/school/*             学校構造、教師/生徒の管理API
src/app/login                    ログイン画面
src/app/dashboard                生徒/教師/管理者ダッシュボード
src/app/admin                    学校設定・メンバー登録画面
src/components/shell.tsx         共通ナビゲーション
src/lib/auth.ts                  セッション、ハッシュ、監査ログ
src/lib/guards.ts                ロール、Origin確認
src/lib/db.ts                    Prismaクライアント
```

## 認証・権限

- ロール: `STUDENT`、`TEACHER`、`SCHOOL_ADMIN`
- すべてのログインIDと対象IDを`schoolId`でスコープ
- ログイン時は学校ID + ログインIDで照合し、エラー文はアカウント有無を区別しない
- セッションCookieはHttpOnly、SameSite=Lax、HTTPS環境でSecure。トークンは256-bit乱数で、DBにはSHA-256ハッシュのみ保存。期限7日
- パスワード変更は12文字以上を要求し、他セッションを失効
- 書き込みAPIはOriginのhostを検証。入力はZodで検証し、Prismaのパラメータ化クエリを利用
- 管理APIは学校管理者のみ。教師一覧APIは担当クラスまたは担任クラスの在籍生徒に限定
- 構造・認証の管理操作を監査ログに記録
- 認証エンドポイントの永続Rate Limit、パスワードリセットの本人確認フロー、MFA、CSRFトークン、ファイルスキャン、運用者向け監視は未実装であり、本番提供前の必須作業

## API（Phase 1）

| Method | Route | 権限 | 用途 |
|---|---|---|---|
| POST | `/api/auth/login` | 公開 | 学校ID/ログインID/パスワードでログイン |
| POST | `/api/auth/logout` | 認証 | セッション失効 |
| POST | `/api/auth/password` | 認証 | パスワード変更 |
| GET/POST | `/api/school/structure` | 管理者（GETは教師も可） | 学校、年度、学期、教育段階、学年、クラス |
| GET/POST | `/api/school/people` | 管理者（GETは担当教師も可） | 教師・生徒一覧、アカウント登録 |

パスワードリセットのメール配送は、メールアドレスを収集しない運用や学校確認を含む本人確認方法が決まっていないため、まだ提供していません。現状は管理者へ問い合わせる案内です。復旧機能の設計・実装は、学校の本人確認フローを定めてから行います。

## 画面一覧

- ログイン: 学校ID、ログインID、パスワード
- ダッシュボード（生徒）: 最近の活動、ポートフォリオ、プロジェクト、コメント、目標、予定のUI
- ダッシュボード（教師）: 現在の担当生徒一覧
- ダッシュボード（管理者）: 生徒/教師/クラス数、学校内生徒一覧
- 学校設定（管理者）: 学校情報、年度、教育段階、学年、クラス、教師、生徒
- 共通: ログアウト、レスポンシブのナビゲーション

ポートフォリオやプロジェクトのダッシュボードカードはUI見本で、保存API/記録は未実装です。データと異なる表示を避けるため機能準備中の表記を行っています。

## ローカル起動

Node.js 20.19+ / 22.12+、npmを使用します。

```bash
cp .env.example .env
# AUTH_SECRETは32バイト以上のランダム値に変更（例: openssl rand -base64 48）
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

`http://localhost:3000` を開きます。Seederはローカル試用向けです。サンプルアカウントはいずれも `ChangeMe2026!` です。

- 学校ID: `demo-school`
- 管理者: `admin`
- 教師: `teacher`
- 生徒: `student`

本番へデモアカウントを持ち込まないでください。シードスクリプトは本番環境では明示許可なしに停止します。デモパスワードはサンプル用で、実データに使用しないでください。

## Phase状況

- Phase 1: 学校構造、年度/学期、ロール、ログイン/ログアウト/パスワード変更、教師/生徒アカウント、在籍履歴と担任/担当クラス、初期ダッシュボードを実装
- Phase 2: ポートフォリオ保存、添付、コメント、公開権限は未実装
- Phase 3: Project OS、タスク、教師レビューは未実装
- Phase 4: 検索、通知、データエクスポートは未実装
- Phase 5: AI・外部連携は未実装。AIによる生徒評価や進級などの自動決定は設計しない

本番提供前に、PostgreSQL移行/RLS、パスワードリセット、永続Rate Limit、CSRFトークン、防御的セキュリティ検証、ファイルの隔離/サイズ/MIME/マルウェア検査、バックアップ、復元演習、監視、学校のプライバシー/保存規則を実装・レビューする必要があります。現時点で本番提供可能な完成品とは扱わず、Phase 1の開発用MVPとして扱ってください。

## 低コスト方針

開発はオープンソースのNext.js、Prisma、SQLite、Node.jsでローカル完結し、外部契約・有料APIを使いません。Google Fontsはオンライン時の任意表示です。デプロイ先、保存サービス、メール配送等は未契約で、学校実証後に無料枠とデータ保護条件を比較して選定します。
