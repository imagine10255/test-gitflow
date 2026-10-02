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
// 衝突處理:
//   ①  任何衝突都中止並還原,印出接手指令。
//   ②  package.json / package-lock.json 保留 release 分支的版號(一定比較新)、
//      CHANGELOG.md 兩邊都保留;其他檔案衝突就跳過那條分支,最後列出要人處理的。

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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
const isHotfix = branch.startsWith('hotfix/');
const label = isHotfix ? 'hotfix' : 'release';

// ── ① 併回 main → develop ─────────────────────────────────────────────

function mergeInto(target, source, message) {
    run('switch', target);
    run('pull', '--ff-only', 'origin', target);
    try {
        run('merge', '--no-ff', source, '-m', message);
    } catch {
        tryGit('merge', '--abort');
        tryGit('switch', branch);
        console.error(`
[finish] ✗ ${source} → ${target} 合併衝突,已還原這次合併。
         v${version} 的 tag 已經推上去了,請手動完成剩下的步驟:

           git switch ${target}
           git merge --no-ff ${source} -m "${message}"
           # 解完衝突(package.json 版號選新的)後繼續下面的步驟
`);
        process.exit(1);
    }
    run('push', 'origin', target);
}

console.log(`[finish] v${version}:${branch} → main → develop`);
mergeInto('main', branch, `${label}: v${version}`);
mergeInto('develop', 'main', `merge: v${version} back to develop`);

run('push', 'origin', '--delete', branch);
run('branch', '-d', branch);

// ── ② 同步到其他進行中的 release 分支 ─────────────────────────────────

// hotfix 的同步用 fix: 開頭,會進 CHANGELOG(「併入 hotfix vX」);
// release 上線後的同步用 chore:,不進 CHANGELOG(內容在上一版的段落已經寫過)。
const syncMessage = isHotfix ? `fix: 併入 hotfix v${version}` : `chore: 併入 v${version}`;

const VERSION_FILES = ['package.json', 'package-lock.json'];

function unionChangelog() {
    // 兩邊都保留:用 git merge-file --union 把 base / ours / theirs 合成一份
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'finish-'));
    const write = (stage, name) => {
        const p = path.join(tmp, name);
        fs.writeFileSync(p, tryGit('show', `:${stage}:CHANGELOG.md`) ?? '');
        return p;
    };
    const ours = write(2, 'ours'), base = write(1, 'base'), theirs = write(3, 'theirs');
    const merged = execFileSync('git', ['merge-file', '--union', '-p', ours, base, theirs], { encoding: 'utf8' });
    fs.writeFileSync('CHANGELOG.md', merged.endsWith('\n') ? merged : merged + '\n');
    fs.rmSync(tmp, { recursive: true, force: true });
}

function syncRelease(target) {
    run('switch', target);
    run('pull', '--ff-only', 'origin', target);

    const v = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
    const source = v.includes('-rc.') ? 'main' : v.includes('-beta.') ? 'develop' : null;
    if (!source) return { target, status: 'skip', reason: `版號 ${v} 不是 beta / rc` };

    try {
        git('merge', '--no-ff', source, '-m', syncMessage);
    } catch {
        const conflicts = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
        const others = conflicts.filter(f => !VERSION_FILES.includes(f) && f !== 'CHANGELOG.md');
        if (others.length > 0) {
            tryGit('merge', '--abort');
            return { target, status: 'fail', source, reason: `其他檔案衝突:${others.join(', ')}` };
        }
        for (const f of conflicts) {
            if (VERSION_FILES.includes(f)) git('checkout', '--ours', f);
            else unionChangelog();
            git('add', f);
        }
        git('-c', 'core.editor=true', 'commit', '--no-edit');
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

console.log(`\n[finish] ✓ ${branch} 已併入 main、develop 並刪除。`);
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
             # package.json 版號選新的,CHANGELOG.md 兩邊都保留`);
    }
    process.exit(1);
}
