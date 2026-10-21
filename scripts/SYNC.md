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
