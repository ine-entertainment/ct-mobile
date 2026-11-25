# ct-mobile · 未命名项目移动端

> 按现有网页端设计实现的 **iOS / Android 原生 App**，以及配套的 **运营后台网站 + Node API**。
>
> App 使用 React Native + Expo Router，调用原生控件与原生导航，不是 WebView 套壳。GitHub Actions 会同时编译 Android APK 与 iOS Simulator App。

---

## 目录

```text
ct-mobile/
├─ mobile/                     React Native / Expo Router 原生 App
│  ├─ src/app/                 Expo Router 路由（页面入口）
│  ├─ src/screens/             14 个 App 页面
│  ├─ src/components/          原生 UI、底部弹层、商品卡、订单卡
│  ├─ src/context/             登录态、目录数据、Toast
│  ├─ src/api/                 API 客户端
│  ├─ app.json                 iOS/Android 包名、权限、图标、API 默认地址
│  └─ plugins/                 Android 中文应用名配置插件
├─ web/
│  ├─ server/                  现有 Node + Express + SQLite 后端
│  ├─ admin/                   运营后台网站
│  ├─ public/                  现有 Web 用户端
│  └─ docs/                    后端与后台说明
├─ .github/workflows/mobile.yml  双端编译（Android + iOS）
├─ start-web.bat               启动 Web API + 后台
└─ start-mobile.bat            启动 Expo 手机开发服务
```

---

## 一、先启动 Web API + 后台

手机 App 需要访问 API，建议先把本仓库里的后端跑起来：

```bash
cd web/server
npm install
npm start
```

启动后：

- API：`http://127.0.0.1:3000/api`
- 运营后台：`http://127.0.0.1:3000/admin`
- 手机同 Wi-Fi 时：`http://<电脑局域网IP>:3000/api`

默认管理员：`admin` / `admin123`
默认测试手机号：`13800000001`，验证码 `123456`

Windows 也可以双击 `start-web.bat`。数据库会在首次启动时自动创建并写入演示数据。

> 如果本机 IP 不是 `192.168.50.84`，请在 App 登录页底部的“服务地址”里改成你的电脑局域网 IP。

---

## 二、运行移动端

```bash
cd mobile
npm install
npx expo start --lan
```

### 手机测试方式

1. 安装 **Expo Go**（App Store / Google Play）；
2. 手机与电脑连同一 Wi-Fi；
3. 扫描终端里的二维码；
4. 在 App 登录页底部点击服务地址，改成 `http://电脑IP:3000/api`；
5. 用测试手机号登录，或填微信模拟码 `wx-demo-3`。

如果 Expo Go 的 SDK 版本不匹配，使用开发构建：

```bash
cd mobile
npx expo run:android
# 或 macOS 上
npx expo run:ios
```

Windows 也可以双击 `start-mobile.bat`。

### App 内已实现

- 登录：手机号固定验证码、微信模拟授权码、服务地址切换
- 首页：天气、套餐 Hero、快捷入口、客片、风格筛选、商品流
- 租衣：搜索、日期、风格、商品网格
- 商品详情：相册、尺码库存、租期、配送、费用、客片、收藏
- 确认订单 + 收货地址 + 押金 + 安心险 + 模拟微信支付
- 支付成功页
- 订单列表、订单详情、订单进度、退款申请、预约归还
- 摄影列表、摄影师详情、作品、套餐、档期、定金支付
- 社区内容、点赞、同款商品
- 我的、会员卡、订单入口、地址、退出登录
- 账号与安全：手机号/微信绑定解绑、昵称、账号合并、服务地址
- 城市攻略、妆造师列表

### 演示账号与合并联调

| 场景 | 账号 |
| --- | --- |
| 手机号 | `13800000001` / 验证码 `123456` |
| 手机号 | `13800000002` / 验证码 `123456`（已绑定 `wx-demo-2`） |
| 仅微信 | `wx-demo-3` |
| 后台 | `admin` / `admin123` |

用 `13800000001` 登录后，在「我的 → 账号与安全」绑定微信 `wx-demo-2`，会触发与「阿梨」的账号合并流程，可选择保留当前或对方账号。

---

## 三、GitHub Actions 双端编译

工作流：`.github/workflows/mobile.yml`

触发方式：

- push 到 `main` 且改动 `mobile/**`
- 或在 GitHub Actions 页面手动 **Run workflow**

产物：

| Job | 产物 | 说明 |
| --- | --- | --- |
| Android | `ct-mobile-android-debug` | 可直接安装的 debug APK |
| iOS | `ct-mobile-ios-simulator` | 未签名 Simulator `.app` 压缩包 |

在 Actions run 页面底部 **Artifacts** 下载。

> iOS 真机安装 / App Store 需要 Apple Developer 签名证书与 provisioning profile。仓库没有提交任何证书；iOS job 以“无签名 Simulator 编译”验证双端工程可构建。需要真机 IPA 时，在 GitHub Secrets 配置签名，或改用 EAS Build / Xcode 归档。

### 本地构建

```bash
cd mobile
npx expo prebuild --clean
# Android
npx expo run:android
# iOS（仅 macOS）
npx expo run:ios
```

`android/` 与 `ios/` 是按 Expo CNG 生成的目录，不提交到仓库；由本地命令或 Actions 每次生成。

---

## 四、运营后台网站

运营后台已随仓库放在 `web/admin/`，由 `web/server` 直接托管在 `/admin`：

- 仪表盘：用户、订单、实收、冻结押金、近 7 天趋势、库存预警
- 订单：筛选、详情、状态推进、内部备注
- 押金：冻结、退回、部分扣除
- 商品与 SKU 库存：新增/编辑/上下架
- 摄影预约、摄影师、妆造师
- 用户：身份、订单、消费、资料、解绑
- 社区内容、操作日志、管理员账号

后台与 App 使用同一套 API；用户端 token 无法访问后台接口。

---

## 五、API 与限制

完整接口、账号合并规则、数据模型、部署注意事项见：

- [web/docs/07-Web后端与运营后台说明.md](web/docs/07-Web后端与运营后台说明.md)
- [web/server/schema.sql](web/server/schema.sql)

当前仍是本地演示版：

- 短信固定验证码 `123456`
- 微信登录为模拟授权码
- 支付为模拟“确认支付”
- 物流、妆造预约下单、社区发布/关注为下一版
- iOS/Android 已允许本地 HTTP 调试；正式上线请切换 HTTPS 并收紧 ATS/cleartext 配置

---

## 六、默认地址

`mobile/app.json` 中：

```json
"extra": {
  "apiBase": "http://192.168.50.84:3000/api"
}
```

也可以在 App 内随时修改，不需要重新打包。
