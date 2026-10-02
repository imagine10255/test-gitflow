#!/usr/bin/env node
// 正式版發完後自動收尾,等同 git flow finish 但不打 tag(tag 已由 release-it 打好)。
//
//   release/* 或 hotfix/*  →  main  →  develop  →  推送  →  刪除分支
//
// 由 .release-it.cjs 的 after:release hook 呼叫:node scripts/release-finish.cjs ${version}
// 預發版(beta / rc)直接略過,只有正式版才收尾。
//
// 任何一步合併衝突就中止並還原該次合併,印出接手指令,不會留下合併到一半的狀態。
// 並行中的其他 release 分支要手動同步(beta 從 develop、rc 從 main),這裡不處理。

const { execFileSync } = require('node:child_process');

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

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (!/^(release|hotfix)\//.test(branch)) {
    console.error(`[finish] 目前在 ${branch},只能從 release/* 或 hotfix/* 收尾`);
    process.exit(1);
}
const label = branch.startsWith('hotfix/') ? 'hotfix' : 'release';

function mergeInto(target, source, message) {
    run('switch', target);
    run('pull', '--ff-only', 'origin', target);
    try {
        run('merge', '--no-ff', source, '-m', message);
    } catch {
        try { git('merge', '--abort'); } catch {}
        try { git('switch', branch); } catch {}
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

console.log(`
[finish] ✓ 完成:${branch} 已併入 main、develop 並刪除。

  別忘了把這次的內容同步到其他進行中的 release 分支:
    還在 beta 的:git switch release/x.y && git merge --no-ff develop
    已經進 rc 的:git switch release/x.y && git merge --no-ff main
  (package.json 版號衝突一律選新的)
`);
