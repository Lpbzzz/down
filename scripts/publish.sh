#!/bin/bash

# 发布脚本
set -e

echo "🚀 准备发布 @lpb_name/down 包..."

# 检查是否已登录npm
echo "📋 检查npm登录状态..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ 请先登录npm: npm login"
    exit 1
fi

# 检查当前用户
NPM_USER=$(npm whoami)
echo "✅ 当前npm用户: $NPM_USER"

# 检查包名是否可用
echo "🔍 检查包名可用性..."
if npm view @lpb_name/down > /dev/null 2>&1; then
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
npm publish --access public

if [ $? -eq 0 ]; then
    echo "🎉 发布成功！"
    echo "📥 安装命令: npm install -g @lpb_name/down"
    echo "🔧 使用命令: down <url>"
else
    echo "❌ 发布失败"
    exit 1
fi