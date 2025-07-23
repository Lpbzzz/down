# @lpb_name/down

一个强大的多线程下载管理器，支持命令行使用。

## 特性

- 🚀 多线程并发下载，显著提升下载速度
- 📊 实时进度条显示，支持速度和进度监控
- 🎯 智能分片下载，自动处理大文件
- 💻 简洁的命令行界面
- 🔧 灵活的配置选项

## 安装

### 全局安装（推荐）

```bash
npm install -g @lpb_name/down
```

### 本地安装

```bash
npm install @lpb_name/down
```

## 使用方法

### 基本用法

```bash
# 下载文件到当前目录
down https://example.com/file.zip

# 指定输出文件名
down https://example.com/file.zip -o myfile.zip

# 使用10个线程下载
down https://example.com/file.zip -t 10

# 下载到指定目录
down https://example.com/file.zip -d ./downloads

# 组合使用多个选项
down https://example.com/file.zip -o myfile.zip -t 8 -d ./downloads
```

### 命令行选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--output` | `-o` | 输出文件名 | 从URL自动提取 |
| `--threads` | `-t` | 下载线程数 (1-20) | 3 |
| `--directory` | `-d` | 下载目录 | 当前目录 |
| `--version` | `-V` | 显示版本信息 | - |
| `--help` | `-h` | 显示帮助信息 | - |

### 示例

```bash
# 下载大文件使用更多线程
down https://releases.ubuntu.com/22.04/ubuntu-22.04.3-desktop-amd64.iso -t 16

# 下载到特定目录并重命名
down https://example.com/software.dmg -o MyApp.dmg -d ~/Downloads

# 快速下载小文件
down https://example.com/document.pdf -t 1
```

## 进度显示

下载过程中会显示：
- 每个线程的下载进度和速度
- 文件合并进度
- 总耗时统计

```
Thread   1 |████████████████████████████████████████| 100% | 49.79/49.79MB | 已完成
Thread   2 |████████████████████████████████████████| 100% | 49.79/49.79MB | 已完成
...
Thread 合并 |████████████████████████████████████████| 100% | 已合并: 10/10个分片
```

## 开发

### 本地开发

```bash
# 克隆项目
git clone https://github.com/Lpbzzz/down.git
cd down

# 安装依赖
npm install

# 本地测试
node src/index.js -u https://example.com/file.zip -t 5
```

### 发布到npm

```bash
# 登录npm（如果还没有登录）
npm login

# 发布包
npm publish --access public
```

## 技术栈

- **Node.js** - 运行环境
- **axios** - HTTP客户端
- **commander** - 命令行参数解析
- **cli-progress** - 进度条显示

## 系统要求

- Node.js >= 14.0.0
- npm >= 6.0.0

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持多线程下载
- 命令行界面
- 实时进度显示