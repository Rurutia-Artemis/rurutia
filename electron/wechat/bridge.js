// 微信 ClawBot 编排层：把「消息来源」和「本机大脑」接起来，彻底不经 openclaw。
//  消息来源两条：① 桌面输入框（本地直连，方便不掏手机也能聊、也方便自测）② iLink 长轮询（手机微信）。
//  大脑：本机 claude / codex 无头实例（driver.js），工作目录 = FanBox 当前打开的项目目录。
//  会话按 conversationId 各自续上下文；全部落盘，重启不丢。
const path = require('path');
const os = require('os');
const fs = require('fs');
const ilink = require('./ilink');
const driver = require('./driver');
const memory = require('./memory');

let DATA_DIR = null;
function dataDir() {
  if (DATA_DIR) return DATA_DIR;
  try { DATA_DIR = path.join(require('electron').app.getPath('userData'), 'wechat'); }
  catch { DATA_DIR = path.join(os.homedir(), '.fanbox', 'wechat'); }
  return DATA_DIR;
}
const f = (name) => path.join(dataDir(), name);
const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// 微信场景默认人格：claude/codex 桌面端很啰嗦，手机上刷屏难受——注入这条让回复适配手机。可自定义。
const WX_PERSONA_DEFAULT = '你正通过微信被花叔遥控，回复会显示在手机微信里。请：用中文、简洁直接、适合手机阅读；先给结论，细节按需再展开；除非花叔明确要求，别贴大段代码或长列表；做了改动用一两句话说清改了什么。';

// 发文件协议：让 agent 能把本机文件/图片发到微信。在回复末尾追加标记，系统解析后发送、并从展示里剥掉。
const WX_FILE_PROTOCOL = [
  '如果花叔要你把某个文件或图片发到微信，在回复的最末尾追加发送标记（每个文件一行，可多个）：',
  '<wxfile>文件的绝对路径</wxfile>',
  '路径用绝对路径（相对路径会按当前工作目录解析）。系统会把这些文件发到微信，所以正文里不要重复贴路径、也不要说“无法发送文件”。只有花叔明确要发文件时才加这个标记。',
].join('\n');

// 从回复里抽出 <wxfile> 路径，返回 { clean(剥掉标记的正文), files:[原始路径] }
function extractFiles(reply) {
  const files = [];
  const clean = String(reply || '').replace(/<wxfile>\s*([\s\S]*?)\s*<\/wxfile>/gi, (_, p) => { const s = p.trim(); if (s) files.push(s); return ''; }).trim();
  return { clean, files };
}

// 控制别的终端协议：让 agent 能往本机其他正在运行的终端发指令/按键（fire-and-forget，结果下一轮在状态里体现）。
const WX_TERM_PROTOCOL = [
  '上下文里会给你一份「本机其他终端实时状态」（带 #编号、目录、前台进程、最近输出）。花叔可能让你看它们在跑啥、或去操控它们。',
  '要往某个终端输入内容（命令或回答它的提问），在回复末尾追加标记（每个一行，可多个）：',
  '<term n="编号">要输入的文本</term>',
  '注意：要执行命令必须让文本以换行结尾（相当于按回车），例如 <term n="2">npm test\\n</term>；只回车确认就写一个 \\n。只有花叔明确要你操控某终端时才用，别擅自发指令。',
].join('\n');

// 终端输入规范化：① 把 agent 按协议写的字面转义（\n \r \t）还原成控制符；
// ② 交互式 TUI（claude/codex 输入框）里「回车提交」是 CR(\r) 不是 LF(\n)——把换行统一成 \r，
//    否则文本只换行、停在输入框里发不出去。
function normTermText(text) {
  return String(text == null ? '' : text)
    .replace(/\\r\\n|\\r|\\n/g, '\n') // 字面 \n / \r 还原为真换行
    .replace(/\\t/g, '\t')           // 字面 \t 还原为制表符
    .replace(/\r\n|\n/g, '\r');      // 换行 → 回车，才会真正提交
}

// 长任务安抚语：超过阈值没动静时随机挑一句发出去，让花叔知道链路还活着、agent 还在干活。
const REASSURE = ['还在弄，稍等一下', '这个有点复杂，正在跑', '处理中，马上好', '正在想，再给我点时间', '还在处理，没断'];
function pickReassure() { return REASSURE[Math.floor(Math.random() * REASSURE.length)]; }

const bridge = {
  win: null,
  target: 'claude',                // 当前大脑：claude / codex（默认 claude——已验证无头 JSON 干净可用）
  persona: WX_PERSONA_DEFAULT,     // 微信 bot 人格（手机场景行为指令），可自定义
  cwd: os.homedir(),               // agent 工作目录（前端 navigate 时推过来）
  conversations: {},               // cid -> { id, label, messages:[{role,text,time}], claudeSession }
  activeCid: 'desktop',            // UI 当前展示的会话
  account: null,                   // iLink 账号 { token, baseUrl, accountId, userId }
  pollAbort: null,
  avail: null,                     // { codex, claude } CLI 可用性缓存
  expired: false,                  // 已连过但 token 失效（轮询/探活发现）→ 当作未连，需重新扫码
  onConnChange: null,              // 连接态变化回调（主进程用来联动「离开不待机」电源守卫）
  termControl: null,               // 跨终端感知/控制（主进程注入 { list(), send(id,text) }）
  _termRoster: [],                 // 上一轮注入的终端花名册，用来把 <term n=编号> 映回内部 id

  // 连接是否真活着：有账号、有 token、且没被标记失效
  isConnected() { return !!(this.account && this.account.token && !this.expired); },
  fireConnChange() { try { if (this.onConnChange) this.onConnChange(this.isConnected()); } catch { /* */ } },

  init(win) {
    this.win = win;
    const st = ilink.readJson(f('state.json'), {}) || {};
    this.target = st.target || 'claude';
    this.cwd = st.cwd || os.homedir();
    if (typeof st.persona === 'string' && st.persona.trim()) this.persona = st.persona;
    this.conversations = ilink.readJson(f('conversations.json'), {}) || {};
    this.account = ilink.readJson(f('account.json'), null);
    driver.warmEnv(); // 启动时预热「终端环境复刻」(抓 PATH/代理)，免得第一条微信消息卡几百毫秒
    if (this.account && this.account.token) { this.startPolling(); this.fireConnChange(); } // 已登录则自动恢复收消息
  },
  persistState() { ilink.writeJson(f('state.json'), { target: this.target, cwd: this.cwd, persona: this.persona }); },
  setPersona(p) { this.persona = (typeof p === 'string' && p.trim()) ? p : WX_PERSONA_DEFAULT; this.persistState(); return { ok: true, persona: this.persona }; },
  persistConvos() { ilink.writeJson(f('conversations.json'), this.conversations); },
  emit(ch, m) { if (this.win && !this.win.isDestroyed()) this.win.webContents.send(ch, m); },

  conv(cid) {
    if (!this.conversations[cid]) this.conversations[cid] = { id: cid, label: cid === 'desktop' ? '桌面' : cid, messages: [], claudeSession: '', codexSession: '' };
    return this.conversations[cid];
  },
  push(cid, role, text) {
    const c = this.conv(cid);
    c.messages.push({ role, text, time: now() });
    c.updatedAt = Date.now();        // 最近活跃时间：决定打开面板默认显示哪个会话（落盘随 persistConvos）
    if (c.messages.length > 400) c.messages = c.messages.slice(-400);
    this.persistConvos();
    if (cid === this.activeCid) this.emit('wechat:message', { cid });
  },
  // 最近活跃的会话 id：打开面板默认显示它，而不是写死的 desktop（否则重启/用过桌面框后总先看到旧线）。
  // 老数据没时间戳时偏向手机会话（@im.wechat）——那才是花叔遥控的真进展，桌面框只是本地草稿。
  latestCid() {
    const entries = Object.entries(this.conversations).filter(([, c]) => c && c.messages && c.messages.length);
    if (!entries.length) return 'desktop';
    entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0) || ((a[0] === 'desktop') - (b[0] === 'desktop')));
    return entries[0][0];
  },

  async targets() {
    if (!this.avail) this.avail = { codex: await driver.which('codex'), claude: await driver.which('claude') };
    return [
      { id: 'codex', label: 'Codex', available: this.avail.codex },
      { id: 'claude', label: 'Claude Code', available: this.avail.claude },
    ];
  },
  // 主动探活：打开面板时调，给前端一个权威的连接状态（不只是读「有没有存账号」）
  async check() {
    if (!this.isConnected()) return { ok: true, state: this.account ? 'expired' : 'disconnected' };
    try {
      const r = await ilink.ping(this.account);
      const j = r.json || {};
      if (r.status === 401 || r.status === 403 || j.errcode === -14 || j.ret === -14) {
        this.expired = true; this.fireConnChange(); this.emit('wechat:expired', {});
        return { ok: true, state: 'expired' };
      }
      if (r.ok) { this.expired = false; return { ok: true, state: 'connected' }; }
      return { ok: true, state: 'unreachable' }; // 临时网络问题，别逼用户重扫
    } catch { return { ok: true, state: 'unreachable' }; }
  },
  async env() {
    return {
      ok: true,
      connected: this.isConnected(),
      account: this.account ? this.account.accountId : '',
      target: this.target,
      targets: await this.targets(),
      cwd: this.cwd,
      cwdName: path.basename(this.cwd || '') || '/',
      persona: this.persona,
      personaDefault: WX_PERSONA_DEFAULT,
    };
  },
  setTarget(t) { if (t === 'codex' || t === 'claude') { this.target = t; this.persistState(); } return { ok: true, target: this.target }; },
  setCwd(dir) { if (dir && typeof dir === 'string') { this.cwd = dir; this.persistState(); } return { ok: true }; },
  conversation(cid) {
    const id = cid || this.latestCid();            // 不指定就取最近活跃会话，别再写死回 desktop
    this.activeCid = id;                            // 同步活跃会话，让后续推送的 emit 门控跟着当前展示的线走
    const c = this.conv(id);
    return { ok: true, id: c.id, messages: c.messages };
  },

  // 本机其他终端实时状态：花名册（编号/目录/进程/忙闲）+ 最近输出尾巴，注入给 agent 感知
  async buildTermContext() {
    if (!this.termControl) return '';
    let list = [];
    try { list = await this.termControl.list(); } catch { return ''; }
    this._termRoster = list; // 存下来，<term n=编号> 按此映回内部 id
    if (!list.length) return '【本机其他终端】当前没有正在运行的终端。';
    const oneLine = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(-360);
    const lines = list.map((t, i) => `#${i + 1} ${t.name || '终端'}｜目录:${t.cwd || '?'}｜前台:${t.proc || 'shell'}${t.busy ? '(运行中)' : '(空闲)'}\n  最近输出: ${oneLine(t.tail) || '（无）'}`);
    return '【本机其他终端实时状态】（花叔可能让你查看或操控它们）\n' + lines.join('\n');
  },
  // 抽出 <term n=编号>文本</term>，返回 { clean, ops:[{n,text}] }
  extractTermOps(reply) {
    const ops = [];
    const clean = String(reply || '').replace(/<term\s+n=["']?(\d+)["']?\s*>([\s\S]*?)<\/term>/gi, (_, n, txt) => { ops.push({ n: parseInt(n, 10), text: txt }); return ''; }).trim();
    return { clean, ops };
  },
  // 执行 agent 发出的终端操作：按花名册编号映回 id，写进对应 pty。返回一句话回执（附到正文）。
  runTermOps(reply) {
    const { clean, ops } = this.extractTermOps(reply);
    if (!ops.length || !this.termControl) return clean || reply;
    const done = [];
    for (const op of ops) {
      const t = this._termRoster[op.n - 1];
      if (!t) { done.push(`#${op.n}（找不到）`); continue; }
      const r = this.termControl.send(t.id, normTermText(op.text));
      done.push(r && r.ok ? `#${op.n} ${t.name || ''}`.trim() : `#${op.n}（失败）`);
    }
    return (clean || '') + (done.length ? `\n\n⌨️ 已向终端发送：${done.join('、')}` : '');
  },

  // 跑一轮大脑：按 target 选 driver，带上该会话的工作目录与（claude 的）续话 session
  // onProgress：可选，driver 流式跑时把「正在干啥」回调出来，用于微信实时播报
  async runAgent(cid, text, onProgress) {
    const c = this.conv(cid);
    // 系统提示 = 人格 + 注入记忆 + 记忆协议 + 发文件协议 + 控制终端协议 + 别的终端实时状态
    const termCtx = await this.buildTermContext();
    const sys = [this.persona, memory.inject(), memory.PROTOCOL, WX_FILE_PROTOCOL, WX_TERM_PROTOCOL, termCtx].filter(Boolean).join('\n\n');
    let raw;
    if (this.target === 'claude') {
      const r = await driver.runClaude(text, this.cwd, c.claudeSession, sys, onProgress);
      if (r.sessionId) { c.claudeSession = r.sessionId; this.persistConvos(); }
      raw = r.text;
    } else {
      const r = await driver.runCodex(text, this.cwd, sys, c.codexSession, onProgress);
      if (r.sessionId) { c.codexSession = r.sessionId; this.persistConvos(); }
      raw = r.text;
    }
    // 抽出 <memory> ops 确定性落盘（去污染），把记忆块从展示里剥掉
    const { clean, ops } = memory.extractOps(raw);
    if (ops.length) { try { memory.applyOps(ops); } catch (e) { console.error('[wechat] memory apply', e); } }
    // 抽出 <term> ops 写进别的终端（fire-and-forget），把标记从展示里剥掉、附一句回执
    return this.runTermOps(clean || raw);
  },

  // 桌面输入框 → 本机大脑（不经微信，纯本地）
  async sendDesktop(text) {
    const cid = 'desktop';
    this.activeCid = cid;
    this.push(cid, 'user', text);
    let reply;
    try { reply = await this.runAgent(cid, text); }
    catch (e) { reply = `（出错）${String(e && e.message || e).slice(0, 300)}`; }
    reply = extractFiles(reply).clean || reply; // 桌面无收件人，只剥掉发文件标记，不真发
    this.push(cid, 'assistant', reply);
    return { ok: true, messages: this.conv(cid).messages };
  },

  // ---------- iLink（手机微信）----------
  async login(onErr) {
    try {
      const qr = await ilink.fetchQrcode();
      const content = qr.qrcode_img_content || qr.qrcode || '';
      let dataUrl = '';
      try { dataUrl = await require('qrcode').toDataURL(content, { width: 240, margin: 1 }); } catch { /* 退回原始串 */ }
      this.emit('wechat:qr', { dataUrl, content });
      // 轮询扫码状态
      let base = ilink.LOGIN_BASE, verify = '', tries = 0;
      while (tries++ < 480) {
        const st = await ilink.pollQrStatus(base, qr.qrcode, verify);
        const s = st.status;
        if (s === 'confirmed') {
          this.account = { token: st.bot_token, baseUrl: st.baseurl || base, accountId: st.ilink_bot_id || '', userId: st.ilink_user_id || '' };
          this.expired = false;
          ilink.writeJson(f('account.json'), this.account);
          this.emit('wechat:connected', { ok: true, account: this.account.accountId });
          this.startPolling();
          this.fireConnChange();
          return { ok: true };
        }
        if (s === 'scaned_but_redirect' && st.redirect_host) { base = `https://${st.redirect_host}`; continue; }
        if (s === 'binded_redirect') { // 已绑过，当作成功（需已有 account）
          if (this.account) { this.emit('wechat:connected', { ok: true, account: this.account.accountId }); this.startPolling(); return { ok: true }; }
        }
        if (s === 'expired') { this.emit('wechat:qr', { expired: true }); return { ok: false, error: '二维码过期，请重试' }; }
      }
      return { ok: false, error: '登录超时' };
    } catch (e) { if (onErr) onErr(e); return { ok: false, error: String(e && e.message || e) }; }
  },
  startPolling() {
    if (this.pollAbort) return; // 已在跑
    const ac = new AbortController();
    this.pollAbort = ac;
    (async () => {
      let buf = (ilink.readJson(f('cursor.json'), {}) || {}).buf || '';
      let fails = 0, timeout = 35000;
      while (!ac.signal.aborted && this.account) {
        try {
          const resp = await ilink.getUpdates(this.account, buf, timeout, ac.signal);
          if (resp.longpolling_timeout_ms > 0) timeout = resp.longpolling_timeout_ms;
          if ((resp.ret && resp.ret !== 0) || (resp.errcode && resp.errcode !== 0)) {
            if (resp.errcode === -14 || resp.ret === -14) { this.expired = true; this.emit('wechat:expired', {}); this.fireConnChange(); break; } // token 失效
            fails++; await sleep(fails >= 3 ? 30000 : 2000); continue;
          }
          fails = 0;
          if (resp.get_updates_buf) { buf = resp.get_updates_buf; ilink.writeJson(f('cursor.json'), { buf }); } // 先推进游标=去重
          for (const msg of resp.msgs || []) await this.onWechatMsg(msg);
        } catch (e) {
          if (ac.signal.aborted) break;
          fails++; await sleep(fails >= 3 ? 30000 : 2000);
        }
      }
    })();
  },
  // 入站媒体原始 JSON 落盘：用来确认图片/文件消息的字段结构，好实现 downloadMedia 真读取。
  logInbound(msg) {
    try { fs.appendFileSync(f('inbound-media.log'), JSON.stringify(msg) + '\n'); } catch { /* */ }
  },

  // 生命体征控制器：在 agent 跑的整段时间里维持「链路活着」的感知，回收时一次性收尾。
  //  ① typing 心跳：微信「正在输入」气泡几秒就消失，每 4s 续一次让它一直亮着。
  //  ② 进度播报：driver 流式回调的「正在看 X」节流后发出去（≥15s 才发一条，不刷屏）。
  //  ③ 安抚兜底：超过 22s 没有任何真消息（纯思考、没工具调用），随机发一句安抚。
  //  真消息（进度/安抚/最终回复）才是微信平台「判活」的依据——只靠 typing 仍会被判「连接不到」。
  startLiveness(from, ctxToken) {
    let lastBeat = Date.now();
    let alive = true;
    const beat = (textMsg) => {
      if (!alive || !textMsg) return;
      lastBeat = Date.now();
      ilink.sendText(this.account, from, textMsg, ctxToken).catch(() => {});
      this.push(from, 'assistant', textMsg);
    };
    ilink.sendTyping(this.account, from, true);
    const typingTimer = setInterval(() => { if (alive) ilink.sendTyping(this.account, from, true); }, 4000);
    const reassureTimer = setInterval(() => { if (alive && Date.now() - lastBeat > 22000) beat(pickReassure()); }, 4000);
    return {
      onProgress: (note) => { if (alive && note && Date.now() - lastBeat > 15000) beat('⏳ ' + note); },
      stop: () => { alive = false; clearInterval(typingTimer); clearInterval(reassureTimer); ilink.sendTyping(this.account, from, false); },
    };
  },

  async onWechatMsg(msg) {
    if (msg.message_type !== 1) return;           // 只处理用户发来的
    const from = msg.from_user_id;
    if (!from) return;
    const { text, medias } = ilink.contentFromMsg(msg);
    if (!text && !medias.length) return;          // 真空消息才丢
    this.activeCid = from;
    // UI/历史里展示用户发了啥；纯媒体没配文字时给个占位
    this.push(from, 'user', text || `（${medias.map((m) => (m.kind === 'image' ? '图片' : '文件')).join('、')}）`);
    // 媒体真读取：下载解密落盘到收件箱，把绝对路径喂给 agent 让它 Read。失败的留个原始 JSON 样本好排查。
    let mediaNote = '';
    if (medias.length) {
      const ok = [], bad = [];
      for (const m of medias) {
        try { ok.push(await ilink.downloadMedia(m.item, f('inbox'))); }
        catch (e) { bad.push(`${m.name}（${String(e && e.message || e).slice(0, 80)}）`); this.logInbound(msg); }
      }
      const okLine = ok.length ? `花叔通过微信发来${ok.length}个文件，已存到本机，请用 Read 工具直接读取来理解内容、再回应他：\n${ok.map((p) => `- ${p}`).join('\n')}` : '';
      const badLine = bad.length ? `另有没下下来的：${bad.join('、')}。如实告诉花叔这几个没收到。` : '';
      mediaNote = `\n\n[${[okLine, badLine].filter(Boolean).join('\n')}]`;
    }
    const live = this.startLiveness(from, msg.context_token);
    let reply;
    try { reply = await this.runAgent(from, (text || '（无文字说明）') + mediaNote, live.onProgress); }
    catch (e) { reply = `（出错）${String(e && e.message || e).slice(0, 300)}`; }
    finally { live.stop(); }
    const { clean, files } = extractFiles(reply);
    reply = clean || reply;
    if (reply) await ilink.sendText(this.account, from, reply, msg.context_token).catch(() => {});
    // 发文件：相对路径按工作目录解析，逐个发；失败/缺失回一句话，不闷掉
    const sent = [];
    for (const raw of files) {
      const fp = path.isAbsolute(raw) ? raw : path.join(this.cwd, raw);
      try {
        if (!fs.existsSync(fp)) { await ilink.sendText(this.account, from, `（找不到文件：${raw}）`, msg.context_token).catch(() => {}); continue; }
        await ilink.sendMedia(this.account, from, fp, msg.context_token);
        sent.push(path.basename(fp));
      } catch (e) { await ilink.sendText(this.account, from, `（发文件失败：${path.basename(fp)} — ${String(e && e.message || e).slice(0, 150)}）`, msg.context_token).catch(() => {}); }
    }
    this.push(from, 'assistant', reply + (sent.length ? `\n📎 已发送：${sent.join('、')}` : ''));
  },
  disconnect() {
    if (this.pollAbort) { try { this.pollAbort.abort(); } catch { /* */ } this.pollAbort = null; }
    this.account = null;
    this.expired = false;
    ilink.writeJson(f('account.json'), null);
    this.fireConnChange();
    return { ok: true };
  },
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

module.exports = bridge;
