# iPhone 使用 Expo Go 运行 StampApp 指南

这份说明适合只使用 iPhone 的测试用户，用来通过 **Expo Go** 打开并体验 StampApp。

> 注意：Expo Go 是开发预览工具，不是正式安装包。使用时需要开发者的电脑正在运行项目服务，并且 iPhone 和开发者电脑通常需要在同一个 Wi-Fi 网络下。

---

## 一、iPhone 端准备

### 1. 下载 Expo Go

在 iPhone 上打开 App Store，搜索并下载：

**Expo Go**

也可以在 App Store 搜索关键词：

```text
Expo Go
```

下载完成后，先不用登录也可以扫码运行项目。

---

## 二、开发者电脑端启动 StampApp

这一步需要由项目开发者在电脑上操作。

### 1. 打开终端并进入项目目录

```bash
cd "/Users/wickeyy/Documents/00 香港大学/StampApp/StampApp"
```

### 2. 安装依赖，如果之前已经安装过可以跳过

```bash
npm install
```

### 3. 启动 Expo 开发服务器

```bash
npm run start -- --clear
```

启动成功后，终端或浏览器页面里会显示一个二维码。

---

## 三、iPhone 上打开 StampApp

### 方法 1：用 iPhone 相机扫码

1. 确保 iPhone 和开发者电脑连接同一个 Wi-Fi。
2. 打开 iPhone 自带的 **相机** App。
3. 对准电脑终端或 Expo 页面里的二维码。
4. 点击屏幕上弹出的 Expo Go 链接。
5. iPhone 会自动跳转到 Expo Go，并开始加载 StampApp。

### 方法 2：用 Expo Go 内置扫码

1. 打开 iPhone 上的 **Expo Go**。
2. 点击扫码入口。
3. 扫描电脑上显示的二维码。
4. 等待 App 加载完成。

---

## 四、首次运行可能会遇到的提示

### 1. 网络权限

如果 iPhone 提示允许访问本地网络，请选择：

**Allow / 允许**

否则 Expo Go 可能无法连接电脑上的开发服务器。

### 2. 相机权限

StampApp 包含扫码/相机相关功能。如果系统提示相机权限，请选择：

**Allow / 允许**

### 3. 加载时间较长

第一次打开时，Expo Go 可能需要下载 JavaScript bundle，等待几十秒属于正常情况。

---

## 五、常见问题

### 1. 扫码后打不开

请检查：

- iPhone 和电脑是否在同一个 Wi-Fi
- 电脑上的 Expo 服务是否还在运行
- iPhone 是否允许 Expo Go 访问本地网络
- 电脑是否开启了防火墙限制

可以尝试重新启动项目：

```bash
npm run start -- --clear
```

---

### 2. 一直显示 loading

可以尝试：

1. 关闭 Expo Go 后重新打开。
2. 在电脑终端里按 `Ctrl + C` 停止服务。
3. 重新运行：

```bash
npm run start -- --clear
```

4. 再次扫码。

---

### 3. 提示无法连接 development server

如果同一个 Wi-Fi 下仍然无法连接，可以在 Expo 启动页面切换连接模式。

优先尝试：

```text
Tunnel
```

如果当前是 LAN 模式无法连接，Tunnel 模式通常更稳定，但加载速度可能稍慢。

---

### 4. 某些相机或扫码功能不可用

Expo Go 支持很多 Expo 官方模块，但不一定完整支持所有 native 模块。

本项目包含以下相机/扫码相关依赖：

- `expo-camera`
- `expo-barcode-scanner`
- `react-native-vision-camera`
- `react-native-worklets-core`

如果 UI 可以打开，但某些相机功能在 Expo Go 中异常，可能需要使用正式构建版本，例如 Android APK、iOS Development Build 或 TestFlight 版本。

---

## 六、测试结束后

测试结束后，开发者可以在电脑终端按：

```text
Ctrl + C
```

停止 Expo 开发服务器。

停止后，iPhone 上的 Expo Go 将无法继续加载这个项目，直到开发者再次启动服务。
