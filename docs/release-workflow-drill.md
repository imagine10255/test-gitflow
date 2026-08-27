# 發版流程實作練習手冊

> 開一個 GitHub 練習專案,把八個情境實際跑一遍。
> 每個情境都標了**預期結果**,對不上就是哪裡設定錯了。

---

## 0. 前置準備

### 0-1 建專案

```bash
mkdir release-drill && cd release-drill
git init -b main
npm init -y
```

改 `package.json` 的版號當起點:

```bash
npm pkg set version=0.0.0
npm pkg set private=true
```

隨便放一個檔案當作「程式碼」:

```bash
mkdir src && echo "export const app = 'v0';" > src/index.js
echo "node_modules/" > .gitignore
git add -A && git commit -m "chore: init"
```

### 0-2 裝 release-it

```bash
npm i -D release-it @release-it/conventional-changelog
```

### 0-3 `.release-it.json`

```json
{
  "git": {
    "commitMessage": "chore(release): v${version}",
    "tagName": "v${version}",
    "requireBranch": ["main", "release/*", "hotfix/*"],
    "requireCleanWorkingDir": true,
    "push": true
  },
  "npm": {
    "publish": false
  },
  "github": {
    "release": true,
    "releaseName": "v${version}"
  },
  "hooks": {
    "before:init": ["npm run lint --if-present", "npm test --if-present"]
  },
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "angular",
      "infile": "CHANGELOG.md"
    }
  }
}
```

> 練習時 `before:init` 用 `--if-present`,沒寫測試也不會卡住。正式專案要改成真的跑 lint / test。

### 0-4 scripts

```bash
npm pkg set scripts.release:beta="release-it --preRelease=beta --no-plugins.@release-it/conventional-changelog.infile"
npm pkg set scripts.release:rc="release-it --preRelease=rc --no-plugins.@release-it/conventional-changelog.infile"
npm pkg set scripts.release:live="release-it"
```

### 0-5 推上 GitHub

```bash
gh repo create release-drill --private --source=. --remote=origin --push
```

沒有 `gh` 就在網頁上開 repo,然後:

```bash
git remote add origin git@github.com:<你的帳號>/release-drill.git
git push -u origin main
```

### 0-6 GitHub Token

release-it 要 token 才能建 GitHub Release:

```bash
export GITHUB_TOKEN=$(gh auth token)          # 有 gh 的話
# 或到 Settings → Developer settings → PAT,勾 repo scope
# export GITHUB_TOKEN=ghp_xxxxxxxx
```

**驗證**:

```bash
npx release-it --release-version
```

印出版號沒報錯就代表設定通了。

### 0-7 開基礎分支

```bash
git switch -c develop main && git push -u origin develop
git switch -c test-lab develop && git push -u origin test-lab
git switch develop
```

---

## 實例一 · 完整標準循環

**目標**:`0.0.0` → `1.0.0` 上線,走完 lab → qa → release → live。

### ① 做一個功能

```bash
git switch develop
git switch -c feature/export-csv

cat > src/export.js <<'EOF'
export function exportCsv(rows) {
  return rows.map(r => r.join(',')).join('\n');
}
EOF

git add -A && git commit -m "feat: add CSV export"
git push -u origin feature/export-csv
```

### ② 進 test-lab 自己驗

```bash
git switch test-lab
git merge --no-ff feature/export-csv -m "merge: export-csv into test-lab"
git push
```

> **預期**:CI 跑 lab 部署。這一步**不打 tag**,`git tag -l` 應該還是空的。

### ③ 驗過了 → 進 develop → 開 release 分支

```bash
git switch develop
git merge --no-ff feature/export-csv -m "feat: add CSV export"
git push
git branch -d feature/export-csv

git switch -c release/1.0 develop
git push -u origin release/1.0
```

### ④ 發第一顆 beta

先看看會發什麼,不要直接發:

```bash
npm run release:beta -- minor --dry-run
```

> **預期輸出**會出現 `1.0.0-beta.0`,以及它打算跑的 git 指令。

確認沒問題再來真的:

```bash
npm run release:beta -- minor
```

release-it 會問要不要 commit / tag / push,一路 `y`。

> **預期結果**
> - `package.json` version = `1.0.0-beta.0`
> - 多一個 commit `chore(release): v1.0.0-beta.0`
> - tag `v1.0.0-beta.0` 已推上 GitHub
> - GitHub Releases 頁面出現一筆,標著 **Pre-release**
> - CI 部署到 qa

驗證:

```bash
git tag -l
npm pkg get version
gh release list
```

### ⑤ 回補 develop

```bash
git switch develop
git merge --no-ff release/1.0 -m "merge: release/1.0 back to develop"
git push
git switch release/1.0
```

> ⚠️ 這裡開始 `package.json` 的版號會跟著 merge 流動,develop 的版號會變成 `1.0.0-beta.0`。這是正常的,不用改回去。

### ⑥ 窗口期再收一個功能

```bash
git switch develop
git switch -c feature/export-filter
echo "export const filter = r => r.length > 0;" > src/filter.js
git add -A && git commit -m "feat: add row filter"

# 先進 test-lab
git switch test-lab && git merge --no-ff feature/export-filter -m "merge: filter into test-lab" && git push

# 驗過了進 release
git switch release/1.0
git merge --no-ff feature/export-filter -m "feat: add row filter"
npm run release:beta                    # ← 不帶 minor
```

> **預期**:`1.0.0-beta.1`。不帶 increment 參數時,release-it 只遞增 pre-release 的數字。

```bash
git switch develop && git merge --no-ff release/1.0 -m "merge back" && git push
```

### ⑦ 發 rc 給客戶

```bash
git switch release/1.0
npm run release:rc
```

> **預期**:`1.0.0-rc.0`。identifier 從 beta 切到 rc,計數器歸零。CI 部署到 release 環境。

### ⑧ 客戶驗收通過 → 上 live

```bash
git switch main
git merge --no-ff release/1.0 -m "release: v1.0.0"
npm run release:live -- 1.0.0
```

> **預期結果**
> - `package.json` version = `1.0.0`(沒有後綴)
> - **`CHANGELOG.md` 產生了**,裡面有 Features 兩條(CSV export、row filter)
> - GitHub Release **不是** Pre-release
> - CI 的 live job 需要手動確認才跑

驗證:

```bash
cat CHANGELOG.md
gh release view v1.0.0
```

### ⑨ 收尾

```bash
git switch develop && git merge --no-ff main -m "merge: v1.0.0 back to develop" && git push
git push origin --delete release/1.0
git branch -D release/1.0
```

**這時整個 tag 序列應該是**:

```bash
$ git tag -l --sort=v:refname
v1.0.0-beta.0
v1.0.0-beta.1
v1.0.0-rc.0
v1.0.0
```

`--sort=v:refname` 排出來的順序如果跟你發版的順序一致,代表版號沒有倒退。**這是最快的自我檢查方式。**

---

## 實例二 · 凍結期修 bug

**前提**:接續實例一,重新開一輪 `release/1.1`,已經發到 `1.1.0-beta.0`。

```bash
git switch -c release/1.1 develop
git push -u origin release/1.1
npm run release:beta -- minor           # → 1.1.0-beta.0
git switch develop && git merge --no-ff release/1.1 -m "merge back" && git push
```

QA 回報 bug:

```bash
git switch release/1.1
git switch -c fix/csv-encoding

echo "export const encoding = 'utf-8-bom';" > src/encoding.js
git add -A && git commit -m "fix: csv encoding on Windows"

# 先進 test-lab
git switch test-lab && git merge --no-ff fix/csv-encoding -m "merge: fix into test-lab" && git push

# 驗過了進 release
git switch release/1.1
git merge --no-ff fix/csv-encoding -m "fix: csv encoding on Windows"
npm run release:beta                    # → 1.1.0-beta.1

git switch develop && git merge --no-ff release/1.1 -m "merge back" && git push
git branch -d fix/csv-encoding
```

> **重點**:凍結期的 fix 跟窗口期的 feat **走完全一樣的路**,只是 commit type 不同。

---

## 實例三 · rc 有小 bug

**前提**:`release/1.1` 已經發到 `1.1.0-rc.0`,客戶回報一個小問題(文字錯字)。

```bash
git switch release/1.1
npm run release:rc                      # 先確保在 rc.0

# 客戶回報
sed -i.bak 's/utf-8-bom/UTF-8-BOM/' src/encoding.js && rm src/encoding.js.bak
git add -A && git commit -m "fix: correct encoding label casing"

git switch test-lab && git merge --no-ff release/1.1 -m "merge into test-lab" && git push

git switch release/1.1
npm run release:rc                      # → 1.1.0-rc.1
git switch develop && git merge --no-ff release/1.1 -m "merge back" && git push
```

> **預期**:`1.1.0-rc.1`。
> **重點**:QA **不介入**。這顆只給客戶重測,不回頭發 beta。

---

## 實例四 · rc 的修正要 QA 重驗

**前提**:`release/1.1` 在 `1.1.0-rc.1`,客戶回報一個**改動範圍大**的問題,QA 必須重驗一輪。

```bash
git switch release/1.1

cat > src/export.js <<'EOF'
export function exportCsv(rows, opts = {}) {
  const sep = opts.sep ?? ',';
  return rows.map(r => r.join(sep)).join('\n');
}
EOF
git add -A && git commit -m "fix: rewrite csv serializer for large datasets"

git switch test-lab && git merge --no-ff release/1.1 -m "merge into test-lab" && git push

# 關鍵:同一條分支,升 patch 切回 beta
git switch release/1.1
npm run release:beta -- patch --dry-run     # 先看
npm run release:beta -- patch               # → 1.1.1-beta.0
```

> **預期**:`1.1.1-beta.0`。
>
> 為什麼合法?`1.1.1-beta.0 > 1.1.0-rc.1`,patch 位進位了,版號沒有倒退。
>
> **`1.1.0` 就此作廢,不會上 live。** 之後走 `1.1.1-beta.N` → `1.1.1-rc.0` → `1.1.1`。

驗證版號順序:

```bash
git tag -l --sort=v:refname | tail -6
```

`v1.1.0-rc.1` 應該排在 `v1.1.1-beta.0` 前面。

---

## 實例五 · 兩條 release 分支重疊

**前提**:`release/1.1` 已經發 rc,同時要開下一輪。

```bash
# 發 rc 的同時開新分支
git switch release/1.1
npm run release:rc                      # → 1.1.1-rc.0

git switch -c release/1.2 develop
git push -u origin release/1.2
npm run release:beta -- minor           # → 1.2.0-beta.0
```

> ⚠️ **一定要帶 `minor`**。不帶的話 release-it 看到 `package.json` 是 `1.1.1-rc.0`,會算成 `1.1.1-rc.1`,兩條分支的 tag 就撞在一起了。

現在 `release/1.1` 客戶回報 bug:

```bash
git switch release/1.1
echo "// hotfix in rc" >> src/export.js
git add -A && git commit -m "fix: null guard on empty rows"
npm run release:rc                      # → 1.1.1-rc.1

# 三段回補
git switch develop     && git merge --no-ff release/1.1 -m "merge back"
git switch release/1.2 && git merge --no-ff develop -m "sync from develop"
```

### 這裡一定會遇到 package.json 衝突

```
CONFLICT (content): Merge conflict in package.json
```

因為兩條分支的 `version` 欄位不同。**解法:保留當前分支的版號**。

```bash
# 在 release/1.2 上,保留 1.2.0-beta.0
git checkout --ours package.json
# 但其他欄位如果 develop 有改(例如新依賴),要手動合進來
git add package.json
git merge --continue
```

> 這是這套流程最常見的摩擦點。如果覺得煩,可以在 repo 根目錄加 `.gitattributes`:
>
> ```
> package.json merge=union
> CHANGELOG.md merge=union
> ```
>
> 但 `union` 會把兩邊的行都留下,package.json 會變成無效 JSON。**比較實際的做法是接受手動解**,反正每次只有一行。

繼續:

```bash
git switch release/1.2
npm run release:beta                    # → 1.2.0-beta.1
git push
```

**驗證兩條線沒撞號**:

```bash
git tag -l --sort=v:refname | tail -8
```

```
v1.1.1-beta.0
v1.1.1-rc.0
v1.1.1-rc.1
v1.2.0-beta.0
v1.2.0-beta.1
```

---

## 實例六 · Hotfix

**前提**:`1.1.1` 已經上 live,發現 crash。

先把 `release/1.1` 上線:

```bash
git switch main && git merge --no-ff release/1.1 -m "release: v1.1.1"
npm run release:live -- 1.1.1
git switch develop     && git merge --no-ff main -m "merge back"
git switch release/1.2 && git merge --no-ff develop -m "sync"
git push origin --delete release/1.1
```

live 出事:

```bash
git switch -c hotfix/1.1.2 main
echo "export const guard = x => x ?? [];" > src/guard.js
git add -A && git commit -m "fix: null crash on empty dataset"

# lab 自己驗
git switch test-lab && git merge --no-ff hotfix/1.1.2 -m "merge hotfix into test-lab" && git push

# 給客戶驗(急的話跳過這步)
git switch hotfix/1.1.2
npm run release:rc -- patch             # → 1.1.2-rc.0

# 上 live
git switch main && git merge --no-ff hotfix/1.1.2 -m "hotfix: v1.1.2"
npm run release:live -- 1.1.2

# 三段回補
git switch develop     && git merge --no-ff main -m "merge back"
git switch release/1.2 && git merge --no-ff develop -m "sync"
git push origin --delete hotfix/1.1.2
git branch -d hotfix/1.1.2
```

> ⚠️ **最後那段 `release/1.2` 的同步最容易漏。** 漏了的話 `1.2.0` 上線會把剛修好的 crash 帶回來。

驗證有沒有補到:

```bash
git branch --contains $(git rev-parse main) | grep release/1.2
```

有輸出才代表補到了。

---

## 實例七 · 重置 test-lab

跑幾輪之後 `test-lab` 會很髒。每個循環開始時重置:

```bash
git switch test-lab
git reset --hard origin/develop
git push --force
```

> **前提**:GitHub 的 branch protection **不要**保護 `test-lab`,不然 force push 會被擋。
>
> Settings → Branches → 確認 `test-lab` 不在保護規則內。

**驗證重置成功**:

```bash
git log --oneline -1 test-lab
git log --oneline -1 develop
```

兩個 SHA 應該一樣。

---

## 實例八 · 故意做錯:版號倒退

這個一定要跑一次,親眼看到它怎麼壞,以後就不會犯。

**前提**:目前在 `release/1.2`,已經發到 `1.2.0-rc.0`。

```bash
git switch release/1.2
npm run release:rc                      # 確保在 rc.0

# 故意退回 beta
npm run release:beta -- --dry-run
```

> **預期輸出**:release-it 算出 `1.2.0-beta.0`。
>
> 但這顆 tag **早就存在**(實例五發過)。真的執行的話:
>
> ```
> ! [rejected] v1.2.0-beta.0 -> v1.2.0-beta.0 (already exists)
> ```

用 `--dry-run` 看完就好,不要真的跑。

**再驗證一次為什麼**:

```bash
node -e "const s=require('semver'); console.log(s.gt('1.2.0-rc.0','1.2.0-beta.9'))"
```

輸出 `true` —— `rc.0` 比 `beta.9` **大**。字母序 `beta < rc`,數字再大也追不上。

**正確做法**(實例四):

```bash
npm run release:beta -- patch --dry-run     # → 1.2.1-beta.0 ✓
```

---

## 驗收檢查表

八個實例跑完,repo 應該是這樣:

```bash
# 1. tag 順序 = 發版順序
git tag -l --sort=v:refname

# 2. 分支只剩三條長期的 + 一條進行中
git branch -a

# 3. CHANGELOG 只有正式版的紀錄(beta/rc 不寫)
cat CHANGELOG.md

# 4. GitHub Releases:正式版沒標 Pre-release
gh release list

# 5. develop 包含 main 的所有東西
git log develop..main --oneline        # 應該是空的
```

第 5 條是最重要的健康檢查。**有輸出就代表有東西沒回補**,下一版會把已修的 bug 帶回去。

建議把它做成一個 script:

```bash
cat > scripts/check-sync.sh <<'EOF'
#!/bin/bash
MISSING=$(git log develop..main --oneline)
if [ -n "$MISSING" ]; then
  echo "❌ main 有以下 commit 還沒回補進 develop:"
  echo "$MISSING"
  exit 1
fi
echo "✅ develop 與 main 同步"
EOF
chmod +x scripts/check-sync.sh
```

---

## GitHub Actions

練習時可以先不設,想看完整效果再加。`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [test-lab]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build --if-present
      - run: tar czf app.tar.gz src/
      - uses: actions/upload-artifact@v4
        with:
          name: app-${{ github.ref_name }}
          path: app.tar.gz
          retention-days: 0        # 0 = 用 repo 預設(最長 90 天)

  lab:
    needs: build
    if: github.ref == 'refs/heads/test-lab'
    runs-on: ubuntu-latest
    environment: lab
    steps:
      - run: echo "deploy to lab"

  qa:
    needs: build
    if: contains(github.ref, '-beta.')
    runs-on: ubuntu-latest
    environment: qa
    steps:
      - run: echo "deploy to qa · ${{ github.ref_name }}"

  release:
    needs: build
    if: contains(github.ref, '-rc.')
    runs-on: ubuntu-latest
    environment: release
    steps:
      - run: echo "deploy to release · ${{ github.ref_name }}"

  live:
    needs: build
    if: startsWith(github.ref, 'refs/tags/v') && !contains(github.ref, '-')
    runs-on: ubuntu-latest
    environment: live          # 在 Settings 設 required reviewers → 等同 manual
    steps:
      - run: echo "deploy to live · ${{ github.ref_name }}"
```

**跟 GitLab 版的兩個差異**:

- GitHub Actions 沒有 `when: manual`,改用 **Environment protection rules**。Settings → Environments → `live` → 勾 Required reviewers,部署前就會停下來等人按。
- artifact 保存期在 Settings → Actions → Artifact retention 統一設,job 裡的 `retention-days` 只能往下調不能往上。要永久保存得推到自己的儲存空間。

---

## 練習時的實務地雷

**① `requireCleanWorkingDir` 會擋你**

release-it 預設要求工作區乾淨。練習時常常改了檔案忘了 commit,會直接中止。commit 或 stash 再跑。

**② 每條 release 分支的第一顆一定要帶 increment**

`minor`(新循環)或 `patch`(rc 重來)。不帶的話 release-it 會從 `package.json` 現有版號往下算,結果通常不是你要的。

**③ `--dry-run` 是免費的**

不確定會算出什麼版號,先跑一次 dry-run。它會把所有 git 指令印出來但不執行。

**④ tag 推錯了怎麼救**

```bash
git tag -d v1.0.0-beta.5                     # 刪本地
git push origin :refs/tags/v1.0.0-beta.5     # 刪遠端
gh release delete v1.0.0-beta.5 --yes        # 刪 GitHub Release
git reset --hard HEAD~1                      # 退掉 release commit
```

練習環境隨便刪。**正式環境的 tag 不要刪**,已經有人拿去測了,刪掉會對不上。

**⑤ package.json 衝突很正常**

兩條 release 分支並行時每次 merge 都會撞版號欄位。保留當前分支的版號就對了,不要想著自動化。

**⑥ `git tag -l --sort=v:refname` 是你的朋友**

任何時候不確定版號有沒有亂,跑這行。排序結果跟發版順序一致就沒問題。
