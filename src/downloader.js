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
    forceRedraw: false,
    barsize: 30,
    stopOnComplete: true
  });

  let threadBars = [];
  let mergeBar = null;
  let isCompleted = false;

  const totalTimer = new Timer();
  const downloadTimer = new Timer();
  const mergeTimer = new Timer();

  async function getFileSize() {
    const response = await axios.head(url);
    return parseInt(response.headers['content-length']);
  }

  async function downloadChunk(start, end, index) {
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
    
    // 创建临时文件
    const tempFile = `${output}.part${index}`;
    const writeStream = fs.createWriteStream(tempFile);
    
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
        if (isCompleted) return;
        downloadedBytes += chunk.length;
        threadDownloaded += chunk.length;
        const threadSpeed = (threadDownloaded / (Date.now() - startTime) * 1000 / 1024 / 1024).toFixed(2);
        threadBar.update(threadDownloaded, {
          speed: `速度: ${threadSpeed}MB/s`,
          value_mb: (threadDownloaded / (1024 * 1024)).toFixed(2)
        });
      });

      response.data.pipe(writeStream);
      
      response.data.once('end', () => {
        writeStream.end();
      });
      
      writeStream.once('finish', () => {
        if (!isCompleted) {
          // 确保进度条显示100%
          threadBar.update(chunkSize, {
            speed: '已完成',
            value_mb: (chunkSize / (1024 * 1024)).toFixed(2)
          });
        }
        resolve(tempFile);
      });

      response.data.once('error', (error) => {
        reject(error);
      });
      
      writeStream.once('error', (error) => {
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

      // 创建下载任务
      const tasks = [];
      for (let i = 0; i < threads; i++) {
        const start = i * chunkSize;
        const end = i === threads - 1 ? totalSize - 1 : start + chunkSize - 1;
        tasks.push(downloadChunk(start, end, i));
      }

      // 等待所有下载完成
      const tempFiles = await Promise.all(tasks);
      downloadTimer.stop();
      
      // 标记为完成，停止所有进度条更新
      isCompleted = true;
      
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
      
      // 合并临时文件
      const finalWriteStream = fs.createWriteStream(output);
      
      for (let i = 0; i < tempFiles.length; i++) {
        const tempFile = tempFiles[i];
        const readStream = fs.createReadStream(tempFile);
        
        await new Promise((resolve, reject) => {
          readStream.pipe(finalWriteStream, { end: false });
          readStream.once('end', () => {
            mergeBar.update(i + 1, {
              value_mb: (i + 1).toString()
            });
            // 删除临时文件
            fs.unlinkSync(tempFile);
            resolve();
          });
          readStream.once('error', reject);
        });
      }
      
      // 结束最终文件写入
      finalWriteStream.end();
      await new Promise(resolve => finalWriteStream.once('close', resolve));
      
      mergeTimer.stop();
      totalTimer.stop();
      
      // 停止进度条显示
      multibar.stop();
      
      // 输出完成信息
      console.log(`\n下载完成，耗时: ${downloadTimer.getDuration()}秒`);
      console.log(`合并完成，耗时: ${mergeTimer.getDuration()}秒`);
      console.log(`总耗时: ${totalTimer.getDuration()}秒`);
      console.log(`\n下载完成！`);
    } catch (error) {
      multibar.stop();
      throw error;
    }
  }

  return {
    start
  };
}