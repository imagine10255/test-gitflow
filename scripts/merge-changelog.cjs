#!/usr/bin/env node
// CHANGELOG.md 的段落合併(取代 .gitattributes 的 merge=union)。
//
// union 是逐行合併,兩邊都在檔案最上面加了新段落時,會把兩邊的行交錯在一起,
// 結果某個版本的內容被塞到別的版本底下(實測:26.11.0-beta.0 的內容跑到 26.10.0-beta.0 底下)。
// 這裡改成以「版本段落」為單位:兩邊的段落取聯集,同一版本只留一份(以目前分支為準),
// 再依版號由新到舊排序。每段內容一定跟著自己的版本走。
//
// 用法:
//   git merge driver: node scripts/merge-changelog.cjs %O %A %B   (結果寫回 %A)
//   安裝 driver 設定: node scripts/merge-changelog.cjs --install   (npm 的 prepare 會自動跑)

const fs = require('node:fs');
const semver = require('semver');

const HEADING = /^#{1,2} \[?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/;

function parse(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const head = [];
    const sections = new Map();
    let current = null;
    for (const line of lines) {
        const m = line.match(HEADING);
        if (m) {
            current = { version: m[1], lines: [line] };
            if (!sections.has(current.version)) sections.set(current.version, current);
            else current = { version: m[1], lines: [line], dup: true };   // 同檔內重複的段落:略過
            continue;
        }
        if (current) { if (!current.dup) current.lines.push(line); }
        else head.push(line);
    }
    return { head, sections };
}

function render(section) {
    return section.lines.join('\n').replace(/\s+$/, '') + '\n';
}

function mergeChangelog(oursText, theirsText) {
    const ours = parse(oursText);
    const theirs = parse(theirsText);
    const merged = new Map(ours.sections);
    for (const [v, s] of theirs.sections) if (!merged.has(v)) merged.set(v, s);

    const versions = [...merged.keys()].sort((a, b) => semver.rcompare(a, b));
    const head = (ours.head.join('\n').replace(/\s+$/, '') || '# Changelog') + '\n';
    return [head, ...versions.map(v => render(merged.get(v)))].join('\n');
}

module.exports = { mergeChangelog };

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args[0] === '--install') {
        // 只設定 merge driver;不是 git repo(例如 CI 打包環境)就安靜略過,不讓 npm install 失敗
        const { execFileSync } = require('node:child_process');
        try {
            execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
            execFileSync('git', ['config', 'merge.changelog.name', 'CHANGELOG 段落合併']);
            execFileSync('git', ['config', 'merge.changelog.driver', 'node scripts/merge-changelog.cjs %O %A %B']);
        } catch {}
        process.exit(0);
    }

    const [, oursPath, theirsPath] = args;
    if (!oursPath || !theirsPath) {
        console.error('用法: node scripts/merge-changelog.cjs <base> <ours> <theirs>');
        process.exit(1);
    }
    const result = mergeChangelog(fs.readFileSync(oursPath, 'utf8'), fs.readFileSync(theirsPath, 'utf8'));
    fs.writeFileSync(oursPath, result);
    process.exit(0);
}
