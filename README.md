# Fix 知乎

众所周知，在 2024 年的今天，非登录用户无法阅读知乎的答案，导致一些优质内容无法在互联网上分享，许多人只能选择转载或截图。
所以，我写了这个项目，方便大家在社群里分享知乎的内容。

## 使用方法

在知乎里找到你想要分享的答案，复制答案的链接，将链接中的 `https://www.zhihu.com` 替换为 `https://www.fxzhihu.com` 即可。
例如这个答案：`https://www.zhihu.com/question/586886503/answer/2922442098`

替换后：

```
https://www.fxzhihu.com/question/586886503/answer/2922442098
```

问题：

```
https://www.fxzhihu.com/question/586886503
```

专栏文章：

```
https://zhuanlan.fxzhihu.com/p/425664231
```

想法

```
https://www.fxzhihu.com/pin/1802686122138144770
```

在 URL 末尾添加 `?redirect=false` 可以禁止跳转到知乎原贴。

<details>
<summary>展开：复制答案链接的方法</summary>

找到答案底部的发布时间，复制链接即可。

![复制答案链接](screenshots/image.png)

</details>

## 支持 URL

- [x] 答案
- [x] 问题
- [x] 专栏
- [x] 想法

## 部署

Cloudflare Workers

## Telegram 机器人

[@fxzhihu_bot](https://t.me/fxzhihu_bot)

## 油猴脚本

https://greasyfork.org/zh-CN/scripts/510234-zhihu-link-fixer

![油猴脚本](screenshots/userscript.jpg)

## 常见问题

### 为什么默认跳转到知乎？

虽然 `redirect=false` 可以生成一个静态的网页允许非登录用户阅读全文，然而，这个项目主要是方便在 Telegram 中分享知乎的内容，这时 Telegram 会生成 Instant View 方便用户阅读。而用户点击链接时，通常是对原贴原作感兴趣，我希望尊重原创，所以默认重定向到知乎原链接，所以:

**这个项目不是知乎的镜像工具，不会保存任何原创的内容。**

---

## 开发

```
pnpm dev
```

专栏链接是 `https://zhuanlan.zhihu.com/p/NUMBER`, 访问 <http://localhost:8787/p/NUMBER?redirect=no> 就能看到效果

回答是 `https://www.zhihu.com/question/N1/answer/N2`，访问 <http://localhost:8787/question/N1/answer/N2?redirect=no> 就能看到效果
