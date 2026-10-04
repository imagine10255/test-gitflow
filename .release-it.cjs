const { execFileSync } = require('node:child_process');
const semver = require('semver');
const path = require('node:path');
// conventional-changelog 的 exports 只開放 import 條件,直接指到實際檔案(Node >= 22.12 可 require ESM)
const { ConventionalChangelog } = require(
  path.join(__dirname, 'node_modules/conventional-changelog/dist/index.js')
);

// 避免 hotfix 合回 release 分支後,CHANGELOG 把整串 beta 重新產生一次。
// conventional-changelog 會把所有可達的 semver tag 依時間排序(git log --date-order),從 previousTag 之後逐段切範圍。
// hotfix tag(如 v26.9.6)是從 main 合進來的,時間比 previousTag(如 v26.10.0-beta.17)新,
// 於是最後一段變成 `v26.9.6..HEAD`,涵蓋這條 release 線分岔以來的所有 commit,beta.0 ~ beta.N 就全部重出一次。
// 修法:
// 1. 只保留 previousTag 本身及其祖先的 tag,讓範圍固定是 `previousTag..HEAD`。
// 2. hotfix 合進來的 commit 在 `previousTag..HEAD` 裡仍算「新的」,但它們的段落已透過 CHANGELOG.md 的合併帶進來,
//    所以把「從被排除的 tag 可達」的 commit 也略過,只留這條線上真正新增的內容。
// ⚠️ 這段改的是套件內部(this.params、getSemverTags),conventional-changelog 與
//    @release-it/conventional-changelog 必須鎖精確版本;升級後要跑一次 --dry-run 確認沒有重複段落。
function isAncestor(ancestor, descendant) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const originalGetSemverTags = ConventionalChangelog.prototype.getSemverTags;
ConventionalChangelog.prototype.getSemverTags = async function () {
  const tags = await originalGetSemverTags.call(this);
  const { commits } = await this.params;
  const from = commits?.from;
  if (!from || !tags.includes(from)) return tags;

  const keptTags = tags.filter(tag => isAncestor(tag, from));
  const mergedInTags = tags.filter(tag => !keptTags.includes(tag));
  if (mergedInTags.length > 0) {
    const mergedInHashes = execFileSync('git', ['rev-list', ...mergedInTags, `^${from}`], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    if (mergedInHashes.length > 0) {
      commits.ignore = new RegExp(mergedInHashes.join('|'));
    }
  }
  return keptTags;
};


module.exports = {
  git: {
    commitMessage: 'chore(release): v${version}',
    tagName: 'v${version}',
    // 正式與預發布都只能從專用發版分支建立，避免 main 直接跳過 beta / rc。
    requireBranch: ['release/*', 'hotfix/*'],
    requireCleanWorkingDir: true,
    push: true,
    requireUpstream: true
  },
  npm: {
    publish: false
  },
  // 發版不跑 lint / test——那些在 MR 的 CI 就擋過了,發版只負責版號與 tag。
  // 若要在發版前再跑一次,改成:
  //   hooks: { 'before:init': ['npm run lint', 'npm test'] }
  hooks: {
    // 正式版發完自動收尾(release/hotfix → main → develop → 刪分支),預發版會自動略過。
    // 等同 git flow finish 但不打 tag,不需要安裝 git-flow。見 scripts/release-finish.cjs
    'after:release': 'node scripts/release-finish.cjs ${version}'
  },
  plugins: {
    '@release-it/conventional-changelog': {
      // 關掉「依 commit type 推薦版號」。
      // 開著的話 prerelease 遞增會跳號:例如 26.1.0-beta.0 跑 release:rc,若最後一個穩定 tag
      // 與當前版號的 patch 位相同(見 index.js:155-164),會算成 26.1.1-rc.0 而不是 26.1.0-rc.0。
      // 關掉後 beta/rc 保證只遞增序號,前三碼永遠不動。
      // 配套:release:live 用 --increment=release 讓 semver 直接落定(見 package.json)。
      whatBump: false,

      // 讓 merge commit 也能進 CHANGELOG。conventional-changelog 預設 merges: false(= git log --no-merges)。
      // 只有 conventional 格式的 merge 訊息會出現,例如同步 hotfix 時寫 `fix: 併入 hotfix v26.10.2`;
      // 「sync from develop」「Merge branch 'x' into 'develop'」這類沒有 type 的照樣被過濾掉。
      gitRawCommitsOpts: { merges: null },

      // 不解析 commit 裡的 issue 編號(預設會把 #NAS-2821 這類字串轉成
      // 「closes [#NAS-2821](.../issues/NAS-2821)」,而那是 GitLab issue 網址,對外部票號是壞連結)。
      parserOpts: { issuePrefixes: ['__none__'] },

      // angular preset 會丟棄 refactor（見 conventional-changelog-angular/src/writer.js:37,
      // refactor 的分支排在 `else if (discard) return undefined` 之後，只有帶 BREAKING CHANGE 才進得去）。
      // 改用 conventionalcommits 並自行指定要顯示的類型。
      preset: {
        name: 'conventionalcommits',
        types: [
          { type: 'feat', section: 'Features' },
          { type: 'fix', section: 'Bug Fixes' },
          { type: 'perf', section: 'Performance Improvements' },
          { type: 'refactor', section: 'Code Refactoring' },
          { type: 'revert', section: 'Reverts' },
          { type: 'docs', hidden: true },
          { type: 'style', hidden: true },
          { type: 'test', hidden: true },
          { type: 'build', hidden: true },
          { type: 'ci', hidden: true },
          { type: 'chore', hidden: true }
        ]
      },
      infile: 'CHANGELOG.md',
      writerOpts: {
        // 標題層級:正式版用 #、prerelease 用 ##。
        // conventionalcommits preset 的標題模板寫死 `## `(templates.js:25),不看 isPatch,
        // 所以要自己提供 headerPartial。compare 連結照抄 preset 展開後的寫法(writer.js:15-17、52)。
        headerPartial:
          '{{#if isPatch}}##{{else}}#{{/if}} {{#if @root.linkCompare~}}\n' +
          '  [{{version}}]({{~@root.host}}/{{#if this.owner}}{{~this.owner}}{{else}}{{~@root.owner}}{{/if}}/' +
          '{{#if this.repository}}{{~this.repository}}{{else}}{{~@root.repository}}{{/if}}/compare/{{previousTag}}...{{currentTag}})\n' +
          '{{~else}}\n' +
          '  {{~version}}\n' +
          '{{~/if}}\n' +
          '{{~#if title}} "{{title}}"\n' +
          '{{~/if}}\n' +
          '{{~#if date}} ({{date}})\n' +
          '{{/if}}\n',
        // isPatch 原本的意思是「patch 位 != 0」,改成「是不是 prerelease」
        finalizeContext(context) {
          context.isPatch = !!semver.prerelease(context.version);
          // 自訂 finalizeContext 會整個覆蓋掉內建的那份,linkCompare 得自己補回來
          // 見 conventional-changelog/dist/ConventionalChangelog.js:148
          if (typeof context.linkCompare !== 'boolean' && context.previousTag && context.currentTag) {
            context.linkCompare = true;
          }
          return context;
        }
      }
    }
  }
};
