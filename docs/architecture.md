# Kyuliz Education OS — 初期アーキテクチャ

## サービス境界

ブラウザはNext.js UIを使い、同一オリジンのNext.js APIだけを呼び出す。ブラウザからDBには接続しない。各ユーザーデータは`schoolId`で分離し、APIで認証・学校・ロールを確認する。Phase 1は一校内の導入単位を扱う。将来の外部システム連携はAPI境界にアダプタを追加する。

## データ関係

```mermaid
erDiagram
  School ||--o{ AcademicYear : configures
  School ||--o{ Division : configures
  AcademicYear ||--o{ Term : contains
  AcademicYear ||--o{ Grade : configures
  Division o|--o{ Grade : groups
  Grade ||--o{ Class : contains
  AcademicYear ||--o{ Class : configures
  User ||--o{ Enrollment : historical_membership
  AcademicYear ||--o{ Enrollment : records
  Class ||--o{ Enrollment : places
  User ||--o{ TeachingAssignment : teaches
  Class ||--o{ TeachingAssignment : assigned
  School ||--o{ User : belongs_to
```

校種は学校プロフィール上のラベルです。Division/Grade/Classは管理者が必要なだけ作成できます。年度ごとのEnrollmentが進級/編入/クラス替えを表し、User.idは卒業まで一貫します。

## 公開範囲（Phase 2で実装）

ポートフォリオの初期公開値は本人のみ。教師閲覧は担当クラスに限定。担任/教師/クラス/学年/学校/保護者/外部の範囲を個別に認可し、外部公開は明示操作と確認を要求する。画面上の隠し表示に依存せず、APIのすべての読み書きに認可を適用する。
