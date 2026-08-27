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
      preset: 'angular',
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
