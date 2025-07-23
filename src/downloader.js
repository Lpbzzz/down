import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cliProgress from 'cli-progress';

class Timer {
  constructor() {
    this.startTime = 0;
    this.endTime = 0;
  }

  start() {
    this.startTime = Date.now();
  }

  stop() {
    this.endTime = Date.now();
  }

  getDuration() {
    return ((this.endTime - this.startTime) / 1000).toFixed(2);
  }
}

export function createDownloadManager(config) {
  const {
    url,
    output = path.basename(new URL(url).pathname),
    threads = 3
  } = config;

  let totalSize = 0;
  let downloadedBytes = 0;
  
  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: '{threadId} |{bar}| {percentage}% | {value_mb}/{total_mb}MB | {speed}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    align: 'left',
    autopadding: true,
    forceRedraw: true,
    barsize: 30
  });

  let threadBars = [];
  let mergeBar = null;

  const totalTimer = new Timer();
  const downloadTimer = new Timer();
  const mergeTimer = new Timer();

  async function getFileSize() {
    const response = await axios.head(url);
    return parseInt(response.headers['content-length']);
  }

  async function downloadChunk(start, end, writeStream, index) {
    const chunkSize = end - start + 1;
    let threadDownloaded = 0;
    const threadBar = multibar.create(chunkSize, 0, {
      threadId: `Thread  ${String(index + 1).padStart(2, ' ')}`,
      speed: 0,
      value_mb: (0).toFixed(2),
      total_mb: (chunkSize / (1024 * 1024)).toFixed(2)
    });
    threadBars[index] = threadBar;
    const startTime = Date.now();
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        Range: `bytes=${start}-${end}`
      }
    });

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        threadDownloaded += chunk.length;
        const threadSpeed = (threadDownloaded / (Date.now() - startTime) * 1000 / 1024 / 1024).toFixed(2);
        threadBar.update(threadDownloaded, {
          speed: `速度: ${threadSpeed}MB/s`,
          value_mb: (threadDownloaded / (1024 * 1024)).toFixed(2)
        });
      });

      response.data.pipe(writeStream, { end: false });
      
      response.data.once('end', () => {
        // 确保进度条显示100%
        threadBar.update(chunkSize, {
          speed: '已完成',
          value_mb: (chunkSize / (1024 * 1024)).toFixed(2)
        });
        resolve();
      });

      response.data.once('error', (error) => {
        reject(error);
      });
    });
  }

  async function start() {
    try {
      totalTimer.start();
      // 获取文件大小
      totalSize = await getFileSize();
      const chunkSize = Math.ceil(totalSize / threads);

      downloadTimer.start();

      // 创建写入流
      const writeStream = fs.createWriteStream(output);

      // 创建下载任务
      const tasks = [];
      for (let i = 0; i < threads; i++) {
        const start = i * chunkSize;
        const end = i === threads - 1 ? totalSize - 1 : start + chunkSize - 1;
        tasks.push(downloadChunk(start, end, writeStream, i));
      }

      // 开始合并文件
      mergeTimer.start();
      mergeBar = multibar.create(threads, 0, {
        threadId: 'Thread 合并 ',
        value_mb: '0',
        total_mb: threads.toString(),
        speed: ''
      }, {
        format: '{threadId} |{bar}| {percentage}% | 已合并: {value_mb}/{total_mb}个分片'
      });
      
      let completedTasks = 0;
      const downloadPromises = tasks.map(task => 
        task.then(() => {
          completedTasks++;
          mergeBar.update(completedTasks, {
            value_mb: completedTasks.toString()
          });
        })
      );

      // 使用once代替on以避免内存泄漏
      writeStream.once('finish', async () => {
        // 添加更长的延时确保进度条更新完成
        await new Promise(resolve => setTimeout(resolve, 100));
        // 强制所有进度条显示100%
        threadBars.forEach((bar, index) => {
          const chunkSize = index === threads - 1 ? 
            totalSize - (Math.ceil(totalSize / threads) * index) : 
            Math.ceil(totalSize / threads);
          bar.update(chunkSize, {
            speed: '已完成',
            value_mb: (chunkSize / (1024 * 1024)).toFixed(2)
          });
        });
        mergeBar.update(threads, {
          value_mb: threads.toString()
        });
      });

      await Promise.all(downloadPromises);
      downloadTimer.stop();
      console.log(`\n下载完成，耗时: ${downloadTimer.getDuration()}秒`);
      
      // 强制重绘所有进度条
      multibar.update();
      
      // 确保所有下载线程进度条显示100%
      await new Promise(resolve => setTimeout(resolve, 50));
      threadBars.forEach((bar, index) => {
        const chunkSize = index === threads - 1 ? 
          totalSize - (Math.ceil(totalSize / threads) * index) : 
          Math.ceil(totalSize / threads);
        bar.update(chunkSize, {
          speed: '已完成',
          value_mb: (chunkSize / (1024 * 1024)).toFixed(2)
        });
      });
      
      writeStream.end();
      await new Promise(resolve => writeStream.once('close', resolve));
      
      mergeTimer.stop();
      console.log(`\n合并完成，耗时: ${mergeTimer.getDuration()}秒`);

      multibar.stop();
      totalTimer.stop();
      console.log(`\n总耗时: ${totalTimer.getDuration()}秒`);
    } catch (error) {
      multibar.stop();
      throw error;
    }
  }

  return {
    start
  };
}