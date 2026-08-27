export function exportCsv(rows, opts = {}) {
  const sep = opts.sep ?? ',';
  return rows.map(r => r.join(sep)).join('\n');
}
// hotfix in rc
