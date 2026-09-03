const semver = require('semver');

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
  hooks: {},
  plugins: {
    '@release-it/conventional-changelog': {
      // 關掉「依 commit type 推薦版號」。
      // 開著的話 prerelease 遞增會跳號:例如 26.1.0-beta.0 跑 release:rc,若最後一個穩定 tag
      // 與當前版號的 patch 位相同(見 index.js:155-164),會算成 26.1.1-rc.0 而不是 26.1.0-rc.0。
      // 關掉後 beta/rc 保證只遞增序號,前三碼永遠不動。
      // 配套:release:live 用 --increment=release 讓 semver 直接落定(見 package.json)。
      whatBump: false,

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
        // angular preset 預設是「patch 位 != 0 就用 ##」，跟穩定/預發無關，
        // 結果 hotfix 正式版 1.1.3 是 ##，比 1.2.0-beta.0 的 # 還小。
        // 改成:prerelease 用 ##、正式版用 #
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
