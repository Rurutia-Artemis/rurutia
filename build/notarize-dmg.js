// electron-builder afterAllArtifactBuild 钩子：公证 + staple DMG 容器本身。
// 背景：electron-builder 只公证 .app，不公证外层 DMG —— 下载者打开未 staple 的 DMG 时
// Gatekeeper 没有离线票可验，体验打折。这里在所有产物构建完后，把 .dmg 提交公证再 staple，
// 让「下载直装」对 DMG 也成立（.app 已在打包阶段公证+staple，这里只补 DMG 容器）。
//
// 仅当设了 APPLE_KEYCHAIN_PROFILE（即 `npm run dist:release`）时执行；普通 `npm run dist`
// 没有该环境变量 → 直接跳过，本地迭代不被公证拖慢。密码只在钥匙串里，不进环境变量/文件。
'use strict';
const { execFileSync } = require('child_process');

module.exports = async function notarizeDmg(context) {
  const profile = process.env.APPLE_KEYCHAIN_PROFILE;
  const dmgs = (context.artifactPaths || []).filter((p) => p.endsWith('.dmg'));
  if (!profile) {
    console.log('  • DMG 公证跳过：未设 APPLE_KEYCHAIN_PROFILE（普通 dist 只签名不公证）');
    return;
  }
  if (!dmgs.length) return;
  for (const dmg of dmgs) {
    console.log('  • 公证 DMG：' + dmg);
    execFileSync('xcrun', ['notarytool', 'submit', dmg, '--keychain-profile', profile, '--wait'], { stdio: 'inherit' });
    execFileSync('xcrun', ['stapler', 'staple', dmg], { stdio: 'inherit' });
    console.log('  • DMG 公证 + staple 完成：' + dmg);
  }
};
