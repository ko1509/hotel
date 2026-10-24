# サイト記事の取り込み（毎日）

運営管理アプリ（https://claude.ai/artifact/NdPqJiidEhofck2f5fQGCh ）のアーカイブに、sumibiki.com の公開記事を取り込む手順です。スケジュールされたタスクが毎朝この手順を実行します。

アプリのページは他のサイトに接続できないため、取得はこのリポジトリのスクリプトで行い、結果を ArtifactData でアプリのデータベースに書きます。

## データベースの置き場所

| 場所 | 中身 |
| --- | --- |
| `app/site` | 取得の記録（取得日時・件数・記事ごとの更新日時） |
| `siteposts/p<投稿ID>` | 一覧用（タイトル・リンク・カテゴリー・タグ・言語・小さなアイキャッチ） |
| `sitebodies/p<投稿ID>` | 記事ページ用（本文HTML・大きなアイキャッチ・本文中の画像） |

アプリはこの3つを読むだけで、書きません。号・ホテル記事などの管理データ（`app/main`・`hotels/*`）には触れないでください。

## 手順

1. リポジトリのブランチ `claude/zen-volta-umtgda` を最新にする。
2. ArtifactData `get`（collection `app`、doc_id `site`、out_dir `sync-prev`）で前回の記録を取る。まだない場合は 3 で `--prev` を付けない。
3. `node scripts/sync-site.mjs --prev sync-prev/app/site.json --out sync-out` を実行する。
   - 更新された記事だけが `sync-out/siteposts/`・`sync-out/sitebodies/` に出る。消す記事は `sync-out/plan.json` の `remove`。
4. `plan.json` の `write` の各IDについて、`siteposts` と `sitebodies` に `set`（file_path で各JSONを渡す）。
   - 既にある文書は if_version が必要。`list`（collection `siteposts` / `sitebodies`）で version を確かめてから書く。
   - batch は本文込みで 1MiB までなので、1回に3件程度に分ける。
5. `remove` の各IDを `siteposts` と `sitebodies` から `delete` する。
6. `app/site` に `sync-out/app-site.json` を `set` する（既にあれば 2 で得た version を if_version に）。
7. 件数（取得・更新・削除）を報告する。コミットやプッシュはしない。

## 失敗するとき

- `/wp-json/` が 403：ConoHa WING の「国外IPアクセス制限」。スクリプトは `?rest_route=` で取得するので通常は問題ない。両方失敗したら、制限の設定を確認する。
- https の証明書エラー：独自SSLがまだ有効になっていない。スクリプトは http でも取得する。
- 1文書が 256KiB を超える：本文の画像は容量内に収まる分だけ入れ、残りは省略して件数を記録する。

# アクセス解析（GA4）の取り込み

アプリの「アクセス」画面に、GA4のアクセス状況（ユーザー数・流入元・国と都市・端末・よく見られたページ・外部リンクのクリック）を表示するための取り込みです。

## 前提

サイトの記事の取り込みとは別のタスク（毎朝6:14）で実行します。環境変数が登録されていることが必要です。

| 変数 | 中身 |
| --- | --- |
| `GA4_SERVICE_ACCOUNT_JSON` | サービスアカウントのJSONキー（中身そのもの。base64でも可） |
| `GA4_PROPERTY_ID` | GA4の数字のプロパティID |

どちらかが未設定のときは、エラーにせず「GA4は未設定のため取り込みをしませんでした」とだけ報告して終わります。**鍵の中身は表示・記録・コミットしないでください。**

## データベースの置き場所

| 場所 | 中身 |
| --- | --- |
| `analytics/summary` | 直近7・30・90日の集計と、日ごとの推移（約10KB。毎回まるごと置き換える） |

## 手順

1. `node scripts/sync-ga.mjs --out ga-out` を実行する。失敗したときは、表示された理由（認証・権限・プロパティID）をそのまま報告する。
2. ArtifactData `get`（collection `analytics`、doc_id `summary`）で既存の文書の version を確かめる。無ければ新規作成。
3. `ga-out/summary.json` を ArtifactData `set`（file_path で渡す。既存があれば if_version を付ける）で `analytics/summary` に書く。ユーザー数などが0でも、取得に成功していれば書く（アプリが「まだアクセスの記録がありません」と表示できる）。取得に失敗したときはスクリプトが異常終了するので、そのときは何も書かない。
4. 直近30日のユーザー数・セッション数・表示回数を報告する。

## 失敗するとき

- 認証に失敗：JSONキーが正しいか、サービスアカウントが無効化されていないかを確認する。
- 403：GA4の「プロパティのアクセス管理」にサービスアカウントを閲覧者で追加し、Google Analytics Data API を有効にする。
- 404：`GA4_PROPERTY_ID` が数字のプロパティIDか確認する（測定ID `G-…` ではない）。
- 外部リンクのクリックが取れない：GA4の拡張計測（外部リンクのクリック）が無効。アプリでは「—」と表示され、他の数字には影響しない。
