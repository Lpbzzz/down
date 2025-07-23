#!/usr/bin/env node

import { program } from 'commander';
import { createDownloadManager } from '../src/downloader.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取package.json获取版本信息
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

program
  .name('down')
  .description('A powerful multi-threaded download manager')
  .version(packageJson.version);

program
  .argument('<url>', 'URL to download')
  .option('-o, --output <filename>', 'Output filename')
  .option('-t, --threads <number>', 'Number of download threads', '3')
  .option('-d, --directory <path>', 'Download directory', process.cwd())
  .action(async (url, options) => {
    try {
      // 验证URL格式
      new URL(url);
      
      const threads = parseInt(options.threads);
      if (isNaN(threads) || threads < 1 || threads > 20) {
        console.error('错误: 线程数必须在1-20之间');
        process.exit(1);
      }

      // 确定输出文件名
      let output = options.output;
      if (!output) {
        try {
          output = path.basename(new URL(url).pathname);
          if (!output || output === '/') {
            output = 'download';
          }
        } catch {
          output = 'download';
        }
      }

      // 确定完整的输出路径
      const outputPath = path.isAbsolute(output) ? output : path.join(options.directory, output);
      
      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`开始下载: ${url}`);
      console.log(`输出文件: ${outputPath}`);
      console.log(`线程数: ${threads}`);
      console.log('---');

      const downloader = createDownloadManager({
        url,
        output: outputPath,
        threads
      });

      await downloader.start();
      console.log('\n下载完成！');
      
    } catch (error) {
      if (error.message.includes('Invalid URL')) {
        console.error('错误: 无效的URL格式');
      } else {
        console.error('下载失败:', error.message);
      }
      process.exit(1);
    }
  });

// 显示帮助信息
program.on('--help', () => {
  console.log('');
  console.log('示例:');
  console.log('  $ down https://example.com/file.zip');
  console.log('  $ down https://example.com/file.zip -o myfile.zip');
  console.log('  $ down https://example.com/file.zip -t 10 -d ./downloads');
  console.log('');
});

program.parse();