const semver = require('semver');

module.exports = {
  git: {
    commitMessage: 'chore(release): v${version}',
    tagName: 'v${version}',
    requireBranch: ['main', 'release/*', 'hotfix/*'],
    requireCleanWorkingDir: true,
    push: true,
    requireUpstream: true
  },
  npm: {
    publish: false
  },
  github: {
    release: true,
    releaseName: 'v${version}'
  },
  hooks: {
    'before:init': ['npm run lint --if-present', 'npm test --if-present']
  },
  plugins: {
    '@release-it/conventional-changelog': {
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
