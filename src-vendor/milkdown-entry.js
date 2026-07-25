// esbuild 入口：把 Milkdown Crepe(Notion 式所见即所得 md 编辑器) 打成单文件 vendor
// 构建：npm run build:milkdown  → 产物 public/vendor/milkdown/milkdown.js + .css（运行时无构建）
import { Crepe } from '@milkdown/crepe';
import { imageBlockSchema } from '@milkdown/kit/component/image-block';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

// Milkdown 的 image-block 拿 alt 位存图片缩放比例：![封面图说明](url) 往返一趟变成 ![1.00](url)。
// alt 在花叔的文章里是图注正文（排版器、公众号都要读），丢了整篇就判「往返有损」被锁进源码模式。
// 这里把语义改回「alt 归 alt」：alt 文本原样往返；缩放比只在 alt 为空时借那个位置，
// 于是 Crepe 自己写出来的老文件（![1.00](url)）仍能读回比例，而人写的图注一个字都不动。
function keepImageAlt(editor) {
  return editor.config((ctx) => {
    ctx.update(imageBlockSchema.key, (make) => (c) => {
      const s = make(c);
      return {
        ...s,
        attrs: { ...s.attrs, alt: { default: '', validate: 'string' } },
        parseDOM: [{
          tag: 'img[data-type="image-block"]',
          getAttrs: (dom) => ({
            src: dom.getAttribute('src') || '',
            caption: dom.getAttribute('caption') || '',
            alt: dom.getAttribute('alt') || '',
            ratio: Number(dom.getAttribute('ratio')) || 1,
          }),
        }],
        parseMarkdown: {
          match: s.parseMarkdown.match,
          runner: (state, node, type) => {
            const raw = String(node.alt == null ? '' : node.alt);
            // 只认 Crepe 自己写出来的那个形状（1.00 / 0.75，两位小数、10 倍以内），
            // 免得把 ![2026](chart.png) 这种数字图注当成缩放比例吃掉
            const num = Number(raw);
            const isRatio = /^\d+\.\d{2}$/.test(raw) && num > 0 && num <= 10;
            state.addNode(type, {
              src: node.url,
              caption: node.title || '',
              ratio: isRatio ? num : 1,
              alt: isRatio ? '' : raw,
            });
          },
        },
        toMarkdown: {
          match: s.toMarkdown.match,
          runner: (state, node) => {
            const r = Number.parseFloat(node.attrs.ratio);
            // 有图注写图注；没图注且被缩放过才写比例，免得给 ![](url) 平白塞个 1.00
            const alt = node.attrs.alt || (Number.isFinite(r) && r !== 1 ? r.toFixed(2) : '');
            state.openNode('paragraph');
            state.addNode('image', undefined, undefined, {
              title: node.attrs.caption,
              url: node.attrs.src,
              alt,
            });
            state.closeNode();
          },
        },
      };
    });
  });
}

window.FanboxCrepe = { Crepe, keepImageAlt };
