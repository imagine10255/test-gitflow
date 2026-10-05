#!/usr/bin/env node
// 正式版發完後自動收尾,等同 git flow finish 但不打 tag(tag 已由 release-it 打好)。
//
//   ① release/* 或 hotfix/*  →  main  →  develop  →  推送  →  刪除分支
//   ② 同步到其他進行中的 release 分支:
//        版號是 rc   → 從 main 補(不能從 develop,會夾帶下一版的功能)
//        版號是 beta → 從 develop 補
//
// 由 .release-it.cjs 的 after:release hook 呼叫:node scripts/release-finish.cjs ${version}
// 預發版(beta / rc)直接略過,只有正式版才收尾。
//
// 衝突處理(① ② 相同,見下方 resolveConflicts):
//   package.json 逐欄位合併(版號取新的、對方的套件改動保留)、package-lock.json 重新產生、
//   CHANGELOG.md 以版本段落合併。其他檔案衝突:① 中止並印出接手指令;② 跳過那條分支,最後列出要人處理的。

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
// 合併模組要在一開始就載入:合併到一半時 package.json 可能帶著衝突標記,
// 這時再 require 會因為 Node 讀不了 package.json 而整個崩潰(實測踩過)。
const { mergePackageJson } = require('./merge-package-json.cjs');
const { mergeChangelog } = require('./merge-changelog.cjs');

const version = process.argv[2];
if (!version) {
    console.error('用法: node scripts/release-finish.cjs <version>');
    process.exit(1);
}
if (version.includes('-')) {
    console.log(`[finish] ${version} 是預發版,略過收尾`);
    process.exit(0);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const run = (...args) => execFileSync('git', args, { stdio: 'inherit' });
const tryGit = (...args) => { try { return git(...args); } catch { return null; } };

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (!/^(release|hotfix)\//.test(branch)) {
    console.error(`[finish] 目前在 ${branch},只能從 release/* 或 hotfix/* 收尾`);
    process.exit(1);
}
// 主分支:遠端有 main 就用 main,否則用 master。要指定別的名稱可設環境變數 RELEASE_MAIN_BRANCH。
const MAIN = process.env.RELEASE_MAIN_BRANCH
    || (tryGit('ls-remote', '--exit-code', '--heads', 'origin', 'main') ? 'main' : 'master');
const isHotfix = branch.startsWith('hotfix/');
const label = isHotfix ? 'hotfix' : 'release';

// ── 衝突處理(① ② 共用)──────────────────────────────────────────────
//   package.json      逐欄位三方合併:只有一邊改的欄位照收,兩邊都改 version 取新的(見 merge-package-json.cjs)
//                     ⚠️ 不能 checkout --ours 整份檔案,那會把對方對 dependencies 的改動丟掉
//   package-lock.json package.json 合好之後重新產生
//   CHANGELOG.md      以版本段落合併(見 merge-changelog.cjs)
//   其他檔案          不處理,回傳失敗
// 有裝 merge driver 時 package.json / CHANGELOG.md 通常已被 git 自動解掉,這裡是沒裝時的備援。

const AUTO_FILES = ['package.json', 'package-lock.json', 'CHANGELOG.md'];

function resolveConflicts() {
    const conflicts = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
    const others = conflicts.filter(f => !AUTO_FILES.includes(f));
    if (others.length > 0) return `其他檔案衝突:${others.join(', ')}`;

    const stage = (n, f) => tryGit('show', `:${n}:${f}`) ?? '';
    if (conflicts.includes('package.json')) {
        const { text, conflicts: keys } = mergePackageJson(stage(1, 'package.json'), stage(2, 'package.json'), stage(3, 'package.json'));
        if (keys.length > 0) return `package.json 兩邊都改了:${keys.join(', ')}`;
        fs.writeFileSync('package.json', text);
        git('add', 'package.json');
    }
    if (conflicts.includes('CHANGELOG.md')) {
        fs.writeFileSync('CHANGELOG.md', mergeChangelog(stage(2, 'CHANGELOG.md'), stage(3, 'CHANGELOG.md')));
        git('add', 'CHANGELOG.md');
    }
    if (conflicts.includes('package-lock.json')) {
        git('checkout', '--ours', 'package-lock.json');
        try {
            execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], { stdio: 'ignore' });
        } catch {
            return 'package-lock.json 重新產生失敗(npm install --package-lock-only)';
        }
        git('add', 'package-lock.json');
    }
    git('-c', 'core.editor=true', 'commit', '--no-edit');
    return null;
}

// ── ① 併回 main → develop ─────────────────────────────────────────────

function mergeInto(target, source, message) {
    run('switch', target);
    run('pull', '--ff-only', 'origin', target);
    let failure = null;
    try {
        git('merge', '--no-ff', source, '-m', message);
    } catch {
        try { failure = resolveConflicts(); } catch (e) { failure = `自動解衝突失敗:${e.message}`; }
    }
    if (failure) {
        tryGit('merge', '--abort');
        tryGit('switch', branch);
        console.error(`
[finish] ✗ ${source} → ${target} 合併衝突(${failure}),已還原這次合併。
         v${version} 的 tag 已經推上去了,請手動完成剩下的步驟:

           git switch ${target}
           git merge --no-ff ${source} -m "${message}"
           # 解完衝突後繼續下面的步驟
`);
        process.exit(1);
    }
    run('push', 'origin', target);
}

console.log(`[finish] v${version}:${branch} → ${MAIN} → develop`);
mergeInto(MAIN, branch, `${label}: v${version}`);
mergeInto('develop', MAIN, `merge: v${version} back to develop`);

run('push', 'origin', '--delete', branch);
run('branch', '-d', branch);

// ── ② 同步到其他進行中的 release 分支 ─────────────────────────────────

// hotfix 的同步用 fix: 開頭,會進 CHANGELOG(「併入 hotfix vX」);
// release 上線後的同步用 chore:,不進 CHANGELOG(內容在上一版的段落已經寫過)。
const syncMessage = isHotfix ? `fix: 併入 hotfix v${version}` : `chore: 併入 v${version}`;

function syncRelease(target) {
    run('switch', target);
    run('pull', '--ff-only', 'origin', target);

    const v = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
    const source = v.includes('-rc.') ? MAIN : v.includes('-beta.') ? 'develop' : null;
    if (!source) return { target, status: 'skip', reason: `版號 ${v} 不是 beta / rc` };

    try {
        git('merge', '--no-ff', source, '-m', syncMessage);
    } catch {
        let failure;
        try { failure = resolveConflicts(); } catch (e) { failure = `自動解衝突失敗:${e.message}`; }
        if (failure) {
            tryGit('merge', '--abort');
            return { target, status: 'fail', source, reason: failure };
        }
    }
    run('push', 'origin', target);
    return { target, status: 'ok', source, version: v };
}

run('fetch', '--prune', 'origin');
const others = git('for-each-ref', '--format=%(refname:strip=3)', 'refs/remotes/origin/release/')
    .split('\n').filter(Boolean);

const results = others.map(syncRelease);
run('switch', 'develop');

// ── 結果 ──────────────────────────────────────────────────────────────

console.log(`\n[finish] ✓ ${branch} 已併入 ${MAIN}、develop 並刪除。`);
if (results.length === 0) {
    console.log('         沒有其他進行中的 release 分支。');
}
for (const r of results) {
    if (r.status === 'ok') console.log(`         ✓ ${r.target}(${r.version})← 從 ${r.source} 補,「${syncMessage}」`);
    if (r.status === 'skip') console.log(`         - ${r.target} 略過:${r.reason}`);
}
const failed = results.filter(r => r.status === 'fail');
if (failed.length > 0) {
    console.error('\n[finish] ✗ 以下分支需要手動同步(已還原,沒有動到):');
    for (const r of failed) {
        console.error(`
           ${r.target}:${r.reason}
             git switch ${r.target}
             git merge --no-ff ${r.source} -m "${syncMessage}"
             # 依上面的原因手動解;解完 package.json 後跑 npm install --package-lock-only 重產 lock`);
    }
    process.exit(1);
}
