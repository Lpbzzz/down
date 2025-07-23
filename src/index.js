import { program } from 'commander';
import { createDownloadManager } from './downloader.js';

// 配置命令行参数
program
  .version('1.0.0')
  .description('Node.js Download Manager')
  .option('-u, --url <url>', '要下载的文件URL')
  .option('-o, --output <path>', '保存文件的路径')
  .option('-t, --threads <number>', '下载线程数', '3')
  .parse(process.argv);

const options = program.opts();

// 主函数
async function main() {
  if (!options.url) {
    console.error('请提供下载URL，使用 --help 查看帮助');
    process.exit(1);
  }

  try {
    const downloader = createDownloadManager({
      url: options.url,
      output: options.output,
      threads: parseInt(options.threads)
    });

    await downloader.start();
    console.log('下载完成！');
  } catch (error) {
    console.error('下载失败:', error.message);
    process.exit(1);
  }
}

main();