#!/usr/bin/env node
// 發版前的確認畫面:先算出要發的版號、檢查常見的打錯情況,顯示給人看,輸入 y 才真的執行 release-it。
//
//   npm run release:beta                    → node scripts/release.cjs beta
//   npm run release:beta -- 26.16.0-beta.0  → 指定版號(新 release 分支的第一顆 beta)
//   npm run release:rc / release:live       → 同上
//
// 其他參數原樣傳給 release-it(例如 --dry-run)。非互動環境(CI)要加 --yes 才會執行。
//
// 擋下(不讓執行)的情況:
//   - 不在 release/* 或 hotfix/* 分支
//   - 版號前兩碼跟 release/x.y 分支名對不上(例如在 release/26.15 打成 26.16.0-beta.0)
//   - hotfix/x.y.z 上線的版號不是 x.y.z
//   - 版號類型跟指令不符(release:beta 卻是 rc 版號、release:live 卻帶 -beta)
//   - rc 退回 beta、版號沒有比目前新、tag 已經存在

const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const readline = require('node:readline');
const semver = require('semver');

const MODES = {
    beta: { args: ['--preRelease=beta'], label: 'beta(測試環境)', pre: 'beta' },
    rc: { args: ['--preRelease=rc'], label: 'rc(預發環境)', pre: 'rc' },
    live: { args: ['--increment=release'], label: '正式版(上線)', pre: null },
};

const [mode, ...rest] = process.argv.slice(2);
if (!MODES[mode]) {
    console.error('用法: node scripts/release.cjs <beta|rc|live> [版號] [release-it 參數]');
    process.exit(1);
}
const yes = rest.includes('--yes') || rest.includes('-y');
const passthrough = rest.filter(a => a !== '--yes' && a !== '-y');
const explicit = passthrough.find(a => !a.startsWith('-'));
const extra = passthrough.filter(a => a !== explicit);

const bin = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'release-it.cmd' : 'release-it');
const releaseArgs = [...(explicit ? [explicit] : []), ...MODES[mode].args, '--ci', ...extra];

const git = (...a) => { try { return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const c = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = s => c('1', s), red = s => c('31', s), yellow = s => c('33', s), green = s => c('32', s), dim = s => c('2', s);

// ── 算出版號(release-it --release-version 只計算,不會改任何東西)──────────
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const current = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const probe = spawnSync(bin, [...releaseArgs, '--release-version'], { encoding: 'utf8', shell: process.platform === 'win32' });
const probeOut = `${probe.stdout}\n${probe.stderr}`;
const next = probeOut.split('\n').map(s => s.trim()).filter(s => semver.valid(s)).pop();

const errors = [];
const warnings = [];

if (!/^(release|hotfix)\//.test(branch || '')) errors.push(`目前在 ${branch},只能在 release/* 或 hotfix/* 分支發版`);
if (!next) {
    const reason = probeOut.split('\n').find(l => /ERROR/.test(l)) || probeOut.trim().split('\n').pop();
    errors.push(`release-it 算不出版號:${reason}`);
} else {
    const pre = semver.prerelease(next);
    const preType = pre ? pre[0] : null;
    if (preType !== MODES[mode].pre) {
        errors.push(`release:${mode} 應該發 ${MODES[mode].pre ? `-${MODES[mode].pre}.N` : '不帶 -beta / -rc 的正式版號'},但算出來是 ${next}`);
    }
    if (semver.valid(current) && !semver.gt(next, current)) errors.push(`${next} 沒有比目前的 ${current} 新`);
    if (semver.prerelease(current)?.[0] === 'rc' && preType === 'beta') errors.push(`目前已經是 ${current},rc 不能退回 beta`);

    const m = branch && branch.match(/^release\/(\d+)\.(\d+)$/);
    if (m && (semver.major(next) !== +m[1] || semver.minor(next) !== +m[2])) {
        errors.push(`分支是 ${branch},版號卻是 ${next}(前兩碼應該是 ${m[1]}.${m[2]})`);
    }
    const h = branch && branch.match(/^hotfix\/(\d+\.\d+\.\d+)$/);
    if (h && !preType && next !== h[1]) errors.push(`分支是 ${branch},上線版號卻是 ${next}(應該是 ${h[1]})`);

    if (git('rev-parse', '-q', '--verify', `refs/tags/v${next}`)) errors.push(`tag v${next} 已經存在`);
    else if (git('ls-remote', '--tags', 'origin', `refs/tags/v${next}`)) errors.push(`遠端已經有 tag v${next}`);

    if (explicit && semver.valid(current) && semver.prerelease(current) && semver.diff(current, next) !== 'prerelease' && preType) {
        warnings.push(`指定的版號 ${next} 跟目前的 ${current} 不在同一條線上,確定不是打錯?`);
    }
}

// ── 確認畫面 ──────────────────────────────────────────────────────────────
console.log(`
${bold('┌─ 發版確認 ─────────────────────────────────────')}
│ 分支     ${branch}
│ 類型     ${MODES[mode].label}
│ 版號     ${current}  →  ${next ? bold(green(next)) : red('(算不出來)')}
│ tag      ${next ? `v${next}` : '-'}
│ 指令     release-it ${releaseArgs.join(' ')}`);
if (mode === 'live' && next) {
    console.log(`│ ${yellow('上線後會自動收尾:')}併入 main → develop、刪除 ${branch}、同步其他 release 分支`);
}
console.log(bold('└────────────────────────────────────────────────'));

if (next && errors.length === 0) {
    const log = spawnSync(bin, [...releaseArgs, '--changelog'], { encoding: 'utf8', shell: process.platform === 'win32' });
    const lines = (log.stdout || '').split('\n').filter(l => l.trim() && !/^(WARNING|!)/.test(l));
    if (lines.length > 0) {
        console.log(dim('\n這次會寫進 CHANGELOG 的內容:'));
        const MAX = 20;
        for (const l of lines.slice(0, MAX)) console.log(dim('  ') + l);
        if (lines.length > MAX) console.log(dim(`  …(還有 ${lines.length - MAX} 行)`));
    }
}

if (errors.length === 0) for (const w of warnings) console.log(yellow(`\n⚠ ${w}`));
if (errors.length > 0) {
    for (const e of errors) console.error(red(`\n✗ ${e}`));
    console.error(red('\n沒有執行發版。'));
    process.exit(1);
}

function run() {
    const r = spawnSync(bin, releaseArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
    process.exit(r.status ?? 1);
}

if (yes) run();
if (!process.stdin.isTTY) {
    console.error(red('\n非互動環境,要執行請加 --yes。'));
    process.exit(1);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question(`\n確定要發布 ${bold(next)} 嗎?(y/N) `, answer => {
    rl.close();
    if (/^y(es)?$/i.test(answer.trim())) run();
    console.log('已取消,沒有任何變動。');
});
