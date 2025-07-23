#!/bin/bash

# 发布脚本
set -e

echo "🚀 准备发布 @lpb_name/down 包..."

# 版本类型参数 (major, minor, patch)
VERSION_TYPE=${1:-patch}

if [[ "$VERSION_TYPE" != "major" && "$VERSION_TYPE" != "minor" && "$VERSION_TYPE" != "patch" ]]; then
    echo "❌ 无效的版本类型: $VERSION_TYPE"
    echo "💡 使用方法: ./publish.sh [major|minor|patch]"
    echo "   - major: 主版本号 (1.0.0 -> 2.0.0) - 重大更新"
    echo "   - minor: 次版本号 (1.0.0 -> 1.1.0) - 新功能"
    echo "   - patch: 修订版本号 (1.0.0 -> 1.0.1) - bug修复"
    exit 1
fi

# 检查是否已登录npm
echo "📋 检查npm登录状态..."
if ! pnpm whoami > /dev/null 2>&1; then
    echo "❌ 请先登录npm: pnpm login"
    exit 1
fi

# 检查当前用户
NPM_USER=$(pnpm whoami)
echo "✅ 当前npm用户: $NPM_USER"

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📌 当前版本: $CURRENT_VERSION"

# 自动递增版本号
echo "🔢 递增版本号 ($VERSION_TYPE)..."
pnpm version $VERSION_TYPE --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ 新版本: $NEW_VERSION"

# 检查包名是否可用
echo "🔍 检查包名可用性..."
if pnpm view @lpb_name/down > /dev/null 2>&1; then
    echo "⚠️  包 @lpb_name/down 已存在，将发布新版本"
else
    echo "✅ 包名可用"
fi

# 运行测试
echo "🧪 运行测试..."
node bin/cli.js --help > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ CLI测试通过"
else
    echo "❌ CLI测试失败"
    exit 1
fi

# 构建检查
echo "🔨 检查文件结构..."
required_files=("package.json" "bin/cli.js" "src/downloader.js" "README.md")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ 缺少必要文件: $file"
        exit 1
    fi
done
echo "✅ 文件结构检查通过"

# 发布包
echo "📦 发布包到npm..."
pnpm publish --access public

if [ $? -eq 0 ]; then
    echo "🎉 发布成功！"
    echo "📥 安装命令: pnpm add -g @lpb_name/down 或 npm install -g @lpb_name/down"
    echo "🔧 使用命令: down <url>"
else
    echo "❌ 发布失败"
    exit 1
fi