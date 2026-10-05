#!/usr/bin/env node
// package.json 的逐欄位三方合併(git merge driver)。
//
// 不能用 `git checkout --ours package.json`:那會拿整份檔案,連對方對 dependencies 的改動也一起丟掉。
// 實測:hotfix 升級了 dayjs,同步進 release 分支後 dayjs 消失,沒有任何警告。
//
// 規則(以 JSON 欄位為單位,物件會往下遞迴):
//   只有一邊改   → 採用有改的那邊
//   兩邊改成一樣 → 照用
//   兩邊都改了頂層 version → 取 semver 比較新的(release 分支的版號一定比較新)
//   兩邊把同一個欄位改成不同值 → 真的衝突:輸出帶衝突標記的文字合併結果,交給人處理
//
// 用法:
//   git merge driver: node scripts/merge-package-json.cjs %O %A %B   (結果寫回 %A)

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const semver = require('semver');

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function merge3(base, ours, theirs, path, conflicts) {
    if (same(ours, theirs)) return ours;
    if (same(ours, base)) return theirs;
    if (same(theirs, base)) return ours;
    if (path.length === 1 && path[0] === 'version' && semver.valid(ours) && semver.valid(theirs)) {
        return semver.gt(ours, theirs) ? ours : theirs;
    }
    if (isObj(ours) && isObj(theirs)) {
        const b = isObj(base) ? base : {};
        const result = {};
        const keys = [...new Set([...Object.keys(ours), ...Object.keys(theirs)])];
        for (const k of keys) {
            const v = merge3(b[k], ours[k], theirs[k], [...path, k], conflicts);
            if (v !== undefined) result[k] = v;
        }
        return result;
    }
    conflicts.push(path.join('.'));
    return ours;
}

/** 回傳 { text, conflicts }:conflicts 為空代表合併成功 */
function mergePackageJson(baseText, oursText, theirsText) {
    const parse = t => (t && t.trim() ? JSON.parse(t) : {});
    const conflicts = [];
    const merged = merge3(parse(baseText), parse(oursText), parse(theirsText), [], conflicts);
    const indent = (oursText.match(/^[ \t]+(?=")/m) || ['  '])[0];
    return { text: JSON.stringify(merged, null, indent) + '\n', conflicts };
}

module.exports = { mergePackageJson };

if (require.main === module) {
    const [basePath, oursPath, theirsPath] = process.argv.slice(2);
    if (!oursPath || !theirsPath) {
        console.error('用法: node scripts/merge-package-json.cjs <base> <ours> <theirs>');
        process.exit(1);
    }
    const read = p => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
    try {
        const { text, conflicts } = mergePackageJson(read(basePath), read(oursPath), read(theirsPath));
        if (conflicts.length === 0) {
            fs.writeFileSync(oursPath, text);
            process.exit(0);
        }
        console.error(`[merge-package-json] 兩邊都改了:${conflicts.join(', ')},需要手動處理`);
    } catch (e) {
        console.error(`[merge-package-json] 無法解析 JSON(${e.message}),改用一般合併`);
    }
    // 真的衝突:輸出一般的文字合併結果(帶衝突標記),回傳非 0 讓 git 標成衝突
    try {
        const out = execFileSync('git', ['merge-file', '-p', oursPath, basePath, theirsPath], { encoding: 'utf8' });
        fs.writeFileSync(oursPath, out);
    } catch (e) {
        if (e.stdout) fs.writeFileSync(oursPath, e.stdout);
    }
    process.exit(1);
}
