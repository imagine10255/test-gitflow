# 發版流程規範

> 網站專案 · GitLab CI · 打包上傳私有雲 · 版號由 release-it 管理

---

## 1. 環境對照

| 環境 | 誰在用 | 觸發方式 | 版號範例 |
|---|---|---|---|
| **lab** | 自己隨便測 | merge 進 `test-lab` | `1.0.0-lab.87`(pipeline 序號,不進 git) |
| **qa** | QA 品管 | tag `v1.0.0-beta.N` | `1.0.0-beta.3` |
| **release** | 客戶驗收 | tag `v1.0.0-rc.N` | `1.0.0-rc.0` |
| **live** | 客戶正式用 | tag `v1.0.0`(手動確認) | `1.0.0` |

**lab 是免洗的,不打 tag。** merge 進 `test-lab` 就部署。只有 qa 以上才留 tag,因為那些是別人驗過、需要追溯的版本。

---

## 2. 分支

| 分支 | 從哪開 | 生命週期 |
|---|---|---|
| `main` | — | 永久,等於 live 現況 |
| `develop` | — | 永久,下一版整合區 |
| `test-lab` | — | 永久,但可隨時重置 |
| `feature/*` | `develop` | merge 後砍 |
| `release/1.0` | `develop` | 上線觀察期過後砍 |
| `hotfix/1.0.1` | `main` | 上線後砍 |

分支名用**兩碼**(`release/1.0` 不是 `release/1.0.0`),因為分支內可能發到 `1.0.1`。

### `test-lab` 是單向的沙盒

任何東西都可以 merge **進去**測,但 `test-lab` **永遠不 merge 出來**。

```
feature/*  ──┐
release/1.0 ─┼─→ test-lab ─→ lab 環境
hotfix/*   ──┘                    ✗ 不回流到任何分支
```

因為 `test-lab` 上可能混著還沒驗過、甚至最後不會出的東西。merge 出去就把實驗性的 commit 帶進正式流程了。

**用法**

```bash
git switch test-lab
git merge --no-ff feature/export-filter      # 想測什麼就 merge 什麼
git push                                     # → 自動部 lab
```

衝突隨便解,反正這條分支的歷史不重要。

**定期重置**

歷史髒了、或跟 develop 差太遠,直接砍掉重來:

```bash
git switch test-lab
git reset --hard origin/develop
git push --force
```

建議每個循環開始時(週三開 release 分支那天)重置一次,保持乾淨。

> ⚠️ `test-lab` 要設成**允許 force push**,但**不要**設成任何 MR 的預設 target branch。有人手滑把 `test-lab` merge 進 develop 會很難清。

---

## 3. 時間週期(7 天循環)

```
週三 AM        週三 PM ──────── 週五 PM        週末 ────── 週二        隔週三 AM
   │              │                │                          │             │
 發 rc          窗口開            窗口關                    凍結中        發 rc
 開新分支      收 feat + fix                              只收 fix      (下一循環)
   │
 rc 過 → 發 live
```

| 期間 | 收什麼 |
|---|---|
| 週三下午 ~ 週五下班 | `feat` + `fix` |
| 週五下班 ~ 隔週三早上 | 只收 `fix` |

**由審查者判斷要不要擋。** 窗口是給人判斷用的基準,不是機器規則——凍結期的 `feat` MR 該不該放行,審查者看情況決定。

**兩個階段收的東西不同,但流程完全一樣**:merge 進 `test-lab` 自己驗 → merge 進 release 分支 → 發一顆 `beta.N` → 進 qa。不因為是新功能就重開分支或重置測試基準。

`test-lab` 在前面多一道關卡的好處是:**功能可以在進 release 分支之前先驗一輪**。驗壞了就不 merge,release 分支不會被污染。

---

## 4. 版號規則

```
1.0.0-beta.0  →  beta.1  →  beta.2  →  ...  →  rc.0  →  1.0.0
└──────────── qa 環境 ────────────┘        └─ release ─┘   live
```

- **identifier 只切一次**(`beta` → `rc`),單向不回頭
- beta 階段 QA 要重驗?`beta.N+1`,數字加就好
- rc 階段有小 bug?`rc.N+1`,客戶繼續測,QA 不介入
- **patch 位有兩個用途**:rc 修正要 QA 重驗(`1.0.1-beta.0`)、live 之後的 hotfix(`1.0.1`)
- 下一個循環是 minor(`1.0.0` → `1.1.0`)

> ⚠️ **rc 階段不回頭。** semver 的 pre-release identifier 是字母序比大小,`beta < rc`,同一個 patch 內發完 `rc.0` 就不能再回去發 `beta.N`。
>
> - **rc 有小 bug** → 發 `rc.N+1` 給客戶,**QA 不介入**
> - **修正大到需要 QA 重驗** → 在**同一條 `release/1.0`** 上升 patch 切回 beta:
>
>   ```bash
>   npm run release:beta -- patch     # 1.0.0-rc.2 → 1.0.1-beta.0
>   ```
>
>   patch 升上去了,版號沒有倒退。重走 qa → rc,`1.0.0` 就此作廢不上 live。
>
> 這就是分支名用兩碼的原因:`release/1.0` 裡面跑到 `1.0.3` 都還合理。

---

## 5. Git 線圖 · 單一循環

```
          週三PM                        週五PM              隔週三AM
            │  窗口期(feat+fix)          │   凍結期(只收fix)    │
            ▼                            ▼                     ▼
develop ─●──┬──●──●───────────────────────────────────────────────────●──
         │  │  ▲  ▲                                                  ▲
         │  │  └──┴── 新功能繼續進 develop(下一版)                    │
         │  │                                                         │ merge main
         │  └─ 開 release/1.0                                         │
         │                                                            │
release/ └──────●──────●──────●──────●──────●──────●──────●───────────┘
  1.0           │      │      │      │      │      │      │
             beta.0  beta.1 beta.2 beta.3 beta.4 beta.5  rc.0
             (feat)  (feat) (feat)  (fix)  (fix)  (fix)   │
              └─────── qa 環境 ─────────────────────┘      │
                                                    release 環境(客戶)
                                                            │
                                                       驗收通過
                                                            ▼
main ───────────────────────────────────────────────────────●── v1.0.0
                                                                  │
                                                                live
```

**回補**:release 分支每次 commit 後,當天 merge 回 develop。不要等最後一起 merge,隔太久衝突會很難解。

---

## 6. Git 線圖 · 兩條 release 分支重疊

進入 rc 之後就開新分支收新功能,舊分支保持乾淨到上線。

```
develop ──●─────────●──────────────●────────────●─────────
           \       ↗ \            ↗            ↗
            \     /   \          /            /
release/1.0  ●───●─────●────────●            /   ← rc 階段只修 bug
            beta rc.0  fix    (merge main)  /
                        │                  /
                        └──── 補進 ───────┤
                                          /
release/1.1              ●──●──●──●──●───●      ← 同時在收 feat
                       beta.0 ...      rc.0
                                            │
main ──────────────────●────────────────────●──
                    v1.0.0                v1.1.0
```

⚠️ **`release/1.0` 在 rc 階段修的 bug 要補三個地方**:

```bash
git switch release/1.0 && git commit -m "fix: ..." && git push
npm run release:rc                                    # v1.0.0-rc.1

git switch develop     && git merge --no-ff release/1.0   # ①
git switch release/1.1 && git merge --no-ff develop       # ② 最容易漏
```

漏掉 ②,`1.1.0` 上線會把剛修好的 bug 又蓋回去。網站是單一 live,蓋回去直接影響所有使用者,沒有緩衝。

---

## 7. Git 線圖 · hotfix

```
main ──●───────────────────●──────
     v1.0.0               │ v1.0.1
        \                ↗       \
hotfix/  ●──●──●────────┘         \
 1.0.1   fix rc.0                  \
                                    ↓
develop ────────────────────────────●──────
                                     \
release/1.1 ──────────────────────────●────  ← 也要補
```

```bash
git switch -c hotfix/1.0.1 main          # 從 main 開(main 就是 live 現況)
git commit -m "fix: null crash on empty dataset"
git push                                  # → lab 自己驗

npm run release:rc -- patch               # → v1.0.1-rc.0,客戶驗

git switch main && git merge --no-ff hotfix/1.0.1
npm run release:live -- 1.0.1             # → v1.0.1 上 live

git switch develop     && git merge --no-ff main
git switch release/1.1 && git merge --no-ff develop
git push origin --delete hotfix/1.0.1
```

**要不要走 rc**,看嚴重度:

- 系統當掉、資料錯亂 → 跳過 rc,lab 驗完直接上 live,事後補回歸
- 功能壞但不致命 → 照走 rc,客戶驗過再上

---

## 8. 指令速查

### `.release-it.json`

```json
{
  "git": {
    "commitMessage": "chore(release): v${version}",
    "tagName": "v${version}",
    "requireBranch": ["main", "release/*", "hotfix/*"],
    "requireCleanWorkingDir": true,
    "push": true
  },
  "npm": { "publish": false },
  "gitlab": { "release": true, "releaseName": "v${version}" },
  "hooks": { "before:init": ["npm run lint", "npm test"] },
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "angular",
      "infile": "CHANGELOG.md"
    }
  }
}
```

### `package.json`

```json
{
  "release:beta": "release-it --preRelease=beta --no-plugins.@release-it/conventional-changelog.infile",
  "release:rc":   "release-it --preRelease=rc   --no-plugins.@release-it/conventional-changelog.infile",
  "release:live": "release-it"
}
```

預發布階段不寫 CHANGELOG,等 live 那次一次生成完整的。

### 一個循環

```bash
# ── 週三 AM:開分支 + 重置 test-lab ──
git switch -c release/1.0 develop
git push -u origin release/1.0

git switch test-lab
git reset --hard origin/develop && git push --force

# ── 窗口期:收 feat ──
git switch test-lab
git merge --no-ff feature/export-filter
git push                                       # → 自動部 lab,自己先驗

# 驗過了才進 release 分支
git switch release/1.0
git merge --no-ff feature/export-filter
npm run release:beta -- minor                  # → v1.0.0-beta.0(第一顆要帶 minor)
git switch develop && git merge --no-ff release/1.0

# ── 凍結期:修 bug ──
git switch -c fix/dropdown release/1.0
git commit -m "fix: filter dropdown misaligned"

git switch test-lab && git merge --no-ff fix/dropdown && git push   # lab 驗

git switch release/1.0 && git merge --no-ff fix/dropdown
npm run release:beta                           # → v1.0.0-beta.1
git switch develop && git merge --no-ff release/1.0

# ── 隔週三 AM:發 rc ──
git switch release/1.0
npm run release:rc                             # → v1.0.0-rc.0
git switch -c release/1.1 develop              # 同時開下一輪
git push -u origin release/1.1

# ── rc 過:上 live ──
git switch main && git merge --no-ff release/1.0
npm run release:live -- 1.0.0                  # → v1.0.0,CHANGELOG 生成
git switch develop     && git merge --no-ff main
git switch release/1.1 && git merge --no-ff develop

# ── 觀察一天沒事:砍分支 ──
git push origin --delete release/1.0
```

> 每條 release 分支的第一顆 beta 要帶 `minor`,因為 release-it 看到最新 tag 是上一版的 `rc.N`,自己算會接錯。之後就能自動遞增。

### 砍分支前的檢查

```bash
git branch --merged develop     | grep release/1.0   # 有輸出才安全
git branch --merged release/1.1 | grep release/1.0
git tag -l "v1.0.0"
```

三個都過再砍。commit 都在 main 歷史裡,tag 永久指著那個點,砍分支不會弄丟東西。

---

## 9. `.gitlab-ci.yml`

```yaml
stages: [build, deploy]

# ── lab:merge 進 test-lab 觸發 ──
build:lab:
  stage: build
  rules:
    - if: $CI_COMMIT_BRANCH == "test-lab"
  script:
    - npm ci && npm run build
    - tar czf app-lab-$CI_COMMIT_SHORT_SHA.tar.gz dist/
  artifacts:
    paths: [app-lab-*.tar.gz]
    expire_in: never

deploy:lab:
  stage: deploy
  needs: [build:lab]
  environment: lab
  rules:
    - if: $CI_COMMIT_BRANCH == "test-lab"
  script:
    - ./scripts/upload.sh app-lab-$CI_COMMIT_SHORT_SHA.tar.gz lab

# ── qa / release / live:tag 觸發 ──
build:tag:
  stage: build
  rules:
    - if: $CI_COMMIT_TAG =~ /^v/
  script:
    - npm ci && npm run build
    - tar czf app-$CI_COMMIT_TAG.tar.gz dist/
  artifacts:
    paths: [app-*.tar.gz]
    expire_in: never

.deploy: &deploy
  stage: deploy
  needs: [build:tag]
  script:
    - ./scripts/upload.sh app-$CI_COMMIT_TAG.tar.gz $TARGET_ENV

deploy:qa:
  <<: *deploy
  environment: qa
  variables: { TARGET_ENV: qa }
  rules:
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+-beta\.\d+$/

deploy:release:
  <<: *deploy
  environment: release
  variables: { TARGET_ENV: release }
  rules:
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+-rc\.\d+$/

deploy:live:
  <<: *deploy
  environment: live
  variables: { TARGET_ENV: live }
  rules:
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/      # 不含後綴才上 live
      when: manual                                   # 一律手動確認
```

正規表示式互斥,一個 tag 只會觸發一個 deploy job。`deploy:live` 的 rule 從機制上擋掉「rc 誤上 live」。

---

## 10. 容易出事的地方

**① 忘記回補**

release 分支修完的東西沒補進 develop / 下一條 release 分支,下一版把 bug 帶回去。

建議加 CI 檢查:`main` 或 `release/1.0` 有新 commit 而目標分支沒有時,pipeline 發警告。比人記得可靠。

**② 兩條分支平行期間的溝通**

`qa` 跑 `1.1.0-beta.0`、`release` 跑 `1.0.0-rc.1` 的時候,跟 QA 和客戶講話一定要帶版號,不然「你說的那個 bug 我這邊看不到」會很常發生。GitLab 的 Operations → Environments 頁面會顯示每個環境現在跑哪個版本,可以直接給連結。

**③ commit type 要照實寫**

流程上 feat 和 fix 一視同仁,但 **commit message 還是要分**:

```bash
git commit -m "feat: add export filter"
git commit -m "fix: filter dropdown misaligned"
```

conventional-changelog 靠 type 分區塊。全寫 `fix:` 的話,CHANGELOG 只有 Bug Fixes 一節,客戶看不出這版加了什麼。

**④ 窗口最後一天不進大功能**

週五進的 feat 只被測半天。建議週五只進小的,或週五進的東西週一自己在 lab 完整回歸一次再交給 QA。

**⑤ 破例次數要追蹤**

每個循環都有一兩次「這個真的很急」放行,那不是紀律問題,是窗口太短或週期太長。審查者連續三次覺得難判斷,就該調整窗口。

**⑥ `test-lab` 不能 merge 出來**

那條分支上可能混著沒驗過、甚至最後不會出的東西。有人手滑 `git merge test-lab` 進 develop,會把實驗性 commit 帶進正式流程,而且很難清乾淨。

保護方式:GitLab 的 Protected branches 不要保護 `test-lab`(要能 force push),但在 MR 範本或 CI 加一條檢查,`develop` / `release/*` / `main` 的 MR 來源是 `test-lab` 就直接擋。

**⑦ build 產物不保證一致**

qa 和 release 是兩次獨立 build,程式碼一樣但產物不保證 byte-identical。至少要:`package-lock.json` commit、build 用 `npm ci`。真的在意的話,每次 deploy 記錄產物 hash,出事時可以比對。
