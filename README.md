# Syno Labs

Syno Labs LLC 的独立公司主页。英文入口为 `/`，中文入口为 `/zh/`。

## 本地开发

在此目录运行以下命令。

```sh
npm ci
npm run dev -- --port 4173
```

如需联调 Syno Ring 产品站，在产品站仓库中运行 `npm run dev -- --hostname 127.0.0.1 --port 3000`。公司站在开发模式下会链接到本机产品站的对应语言页面。

## Vercel

导入 `SynoRing/llc-web` 时，使用仓库根目录。构建命令为 `npm run build`，输出目录为 `dist`。网站的图片与字体均随构建产物分发。

正式构建中，产品站的公司链接默认指向 `https://synolabs.org`，可用产品项目的 `NEXT_PUBLIC_COMPANY_URL` 修改。公司站的产品链接默认指向 `https://www.synoring.ai`，可用公司项目的 `SYNO_RING_URL` 修改。

公司站的规范网址、中英文互链、分享卡片、结构化数据和站点地图默认使用 `https://synolabs.org`。如需更换域名，在公司项目的构建环境中设置 `SYNO_LABS_URL`。站点地图和爬虫入口分别在 `/sitemap.xml` 和 `/robots.txt`。

## 编辑

`index.html` 是两种语言共用的页面模板。文案在 `src/copy.js`，样式在 `src/style.css`。Vite 在开发和构建时生成完整的中英文 HTML。交互示例在浏览器中运行。自动播放会演示确认和中途改选目的地两条路径，手动选择阶段或文件夹时会暂停。

## 手势动画与字体

- 首屏把三个真人镜头采样到同一张点阵上。食指指向、单手张开、双手划开均按拍摄顺序正放，镜头切换在点阵内完成。[指向 · ROCKETMANN TEAM](https://www.pexels.com/video/close-up-of-a-hand-raising-the-index-finger-9465544/) · [张手 · Kevin Malik](https://www.pexels.com/video/a-person-doing-hand-gestures-9019587/) · [双手 · ROCKETMANN TEAM](https://www.pexels.com/video/close-up-of-hands-doing-gestures-9465182/) · [Pexels 许可](https://www.pexels.com/license/)
- 动画与静态首帧为 `public/assets/gesture-sequence.mp4` 和 `public/assets/gesture-sequence.webp`。将上述三个原片依次保存为 `9465544.mp4`、`9019587.mp4` 和 `9465182.mp4`，在安装 NumPy、Pillow 和 ffmpeg 的环境中运行 `python3 art/render-hand.py /path/to/clips` 即可重新生成。
- 首屏背景的细线取自双手划开镜头的指尖轮廓，浏览器以 SVG 贝塞尔曲线绘制。运行 `python3 art/render-traces.py /path/to/clips/9465182.mp4` 可重新生成 `public/assets/gesture-traces.svg`。沿线移动的光点和点阵手势共用首屏的播放按钮。
- Syno Ring R1 产品图和标志来自现有 Syno 品牌素材。
- 英文字体 Figtree 使用 SIL Open Font License 1.1。[字体作者](https://github.com/erikdkennedy/figtree) · [字体许可](public/assets/figtree-license.txt)
