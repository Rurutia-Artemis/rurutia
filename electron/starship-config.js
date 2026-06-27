'use strict';
/**
 * 极小 TOML 解析 / 合并 / 序列化 —— 只覆盖本项目 starship 预设用到的子集：
 *   · 表头 [a]、[a.b]（含子表）
 *   · key = 字符串('单引号' / "双引号" / """三引号多行""") / 布尔 / 整数
 *   · 注释行、空行
 * 不支持数组、行内表、点号键——这些预设里一律用不到（刻意约束，换取实现可靠）。
 *
 * 核心思路：字符串值「原样搬运」。解析时只记下引号内的原始文本 + 引号种类，
 * 从不解码内容；序列化时把原文塞回同种引号。所以续行 `\`、转义 `\(`、多行 format
 * 都不会被破坏——没被修饰件覆盖的键，往返是字节级不变的。
 *
 * 合并：modifier 表深合并进 base 表，同名键 modifier 覆盖；都是子表则递归。
 * 用途：buildConfig(主题toml, [叠加修饰toml...]) → 一个完整的 active.toml 字符串。
 */

// 值表示：叶子 = { __leaf:true, raw:<引号内原文或裸 token>, q:'"""'|'"'|"'"|'' }；子表 = 普通对象
function leaf(raw, q) { return { __leaf: true, raw: raw, q: q }; }
function isLeaf(v) { return v && v.__leaf === true; }

function ensureTable(root, parts) {
  let cur = root;
  for (const p of parts) {
    if (!cur[p] || isLeaf(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  return cur;
}

function parse(text) {
  const root = {};
  let cur = root;
  const lines = String(text).split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (t === '' || t[0] === '#') { i++; continue; }
    if (t[0] === '[') {
      const close = t.indexOf(']');
      const name = t.slice(1, close).trim();
      cur = ensureTable(root, name.split('.').map((s) => s.trim()));
      i++; continue;
    }
    const eq = line.indexOf('=');
    if (eq < 0) { i++; continue; } // 容错：不认识的行跳过
    const key = line.slice(0, eq).trim();
    let rest = line.slice(eq + 1).trim();
    if (rest.startsWith('"""')) {
      let inner = rest.slice(3);
      const endSame = inner.indexOf('"""');
      if (endSame >= 0) {            // 同一行就闭合
        cur[key] = leaf(inner.slice(0, endSame), '"""'); i++; continue;
      }
      const acc = [inner]; i++;      // 跨行累积到下一个含 """ 的行
      while (i < lines.length && lines[i].indexOf('"""') < 0) { acc.push(lines[i]); i++; }
      const last = i < lines.length ? lines[i] : '';
      acc.push(last.slice(0, last.indexOf('"""')));
      cur[key] = leaf(acc.join('\n'), '"""'); i++; continue;
    }
    if (rest[0] === '"') {
      const end = rest.indexOf('"', 1);
      cur[key] = leaf(rest.slice(1, end), '"'); i++; continue;
    }
    if (rest[0] === "'") {
      const end = rest.indexOf("'", 1);
      cur[key] = leaf(rest.slice(1, end), "'"); i++; continue;
    }
    // 裸 token（true/false/整数）：去掉行内注释
    cur[key] = leaf(rest.replace(/\s*#.*$/, '').trim(), ''); i++; continue;
  }
  return root;
}

function merge(base, mod) {
  for (const k of Object.keys(mod)) {
    const mv = mod[k], bv = base[k];
    if (!isLeaf(mv) && bv && !isLeaf(bv)) merge(bv, mv); // 都是子表 → 递归
    else base[k] = mv;                                   // 否则 modifier 整值覆盖
  }
  return base;
}

function wrap(v) {
  if (v.q === '') return v.raw;
  return v.q + v.raw + v.q; // '"""'+raw+'"""' 也成立（raw 可含换行/续行，原样回填）
}

function serialize(obj, prefix) {
  let out = '';
  const leaves = [], tables = [];
  for (const k of Object.keys(obj)) (isLeaf(obj[k]) ? leaves : tables).push(k);
  for (const k of leaves) out += k + ' = ' + wrap(obj[k]) + '\n'; // 表内标量必须在子表头之前
  for (const k of tables) {
    const path = prefix ? prefix + '.' + k : k;
    out += '\n[' + path + ']\n' + serialize(obj[k], path);
  }
  return out;
}

function buildConfig(baseText, modTexts) {
  const root = parse(baseText);
  for (const m of (modTexts || [])) { if (m) merge(root, parse(m)); }
  return serialize(root, '');
}

module.exports = { parse, merge, serialize, buildConfig };
