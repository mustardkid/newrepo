
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface ExtractedFrame {
  timestamp: number;
  filePath: string;
  base64Data: string;
}

export class VideoFrameExtractor {
  private tempDir = path.join(process.cwd(), 'temp', 'frames');

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async extractKeyFrames(videoUrl: string, videoId: number, frameCount: number = 8): Promise<ExtractedFrame[]> {
    const sessionId = crypto.randomUUID();
    const frameDir = path.join(this.tempDir, `video_${videoId}_${sessionId}`);
    
    try {
      await fs.mkdir(frameDir, { recursive: true });
      
      // Extract frames at even intervals
      const frames = await this.extractFramesWithFFmpeg(videoUrl, frameDir, frameCount);
      
      // Convert frames to base64 for OpenAI API
      const extractedFrames: ExtractedFrame[] = [];
      for (const frame of frames) {
        try {
          const fileBuffer = await fs.readFile(frame.filePath);
          const base64Data = fileBuffer.toString('base64');
          extractedFrames.push({
            timestamp: frame.timestamp,
            filePath: frame.filePath,
            base64Data
          });
        } catch (error) {
          console.error(`Failed to read frame ${frame.filePath}:`, error);
        }
      }

      return extractedFrames;
    } catch (error) {
      console.error('Frame extraction failed:', error);
      throw new Error(`Failed to extract frames: ${error}`);
    }
  }

  private async extractFramesWithFFmpeg(videoUrl: string, outputDir: string, frameCount: number): Promise<Array<{ timestamp: number; filePath: string }>> {
    return new Promise((resolve, reject) => {
      const frames: Array<{ timestamp: number; filePath: string }> = [];
      
      // First, get video duration
      ffmpeg.ffprobe(videoUrl, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration || 60; // Default to 60 seconds if unknown
        const interval = Math.max(duration / frameCount, 1); // Extract frames at intervals

        let frameIndex = 0;
        const processNextFrame = () => {
          if (frameIndex >= frameCount) {
            resolve(frames);
            return;
          }

          const timestamp = frameIndex * interval;
          const outputPath = path.join(outputDir, `frame_${frameIndex.toString().padStart(3, '0')}.jpg`);
          
          ffmpeg(videoUrl)
            .seekInput(timestamp)
            .frames(1)
            .output(outputPath)
            .on('end', () => {
              frames.push({ timestamp, filePath: outputPath });
              frameIndex++;
              processNextFrame();
            })
            .on('error', (error) => {
              console.error(`Failed to extract frame at ${timestamp}s:`, error);
              frameIndex++;
              processNextFrame(); // Continue with next frame
            })
            .run();
        };

        processNextFrame();
      });
    });
  }

  async extractMotionFrames(videoUrl: string, videoId: number, motionThreshold: number = 0.3): Promise<ExtractedFrame[]> {
    const sessionId = crypto.randomUUID();
    const frameDir = path.join(this.tempDir, `motion_${videoId}_${sessionId}`);
    
    try {
      await fs.mkdir(frameDir, { recursive: true });
      
      // Extract frames with motion detection
      const frames = await this.extractFramesWithMotionDetection(videoUrl, frameDir, motionThreshold);
      
      // Convert frames to base64 for OpenAI API
      const extractedFrames: ExtractedFrame[] = [];
      for (const frame of frames) {
        try {
          const fileBuffer = await fs.readFile(frame.filePath);
          const base64Data = fileBuffer.toString('base64');
          extractedFrames.push({
            timestamp: frame.timestamp,
            filePath: frame.filePath,
            base64Data
          });
        } catch (error) {
          console.error(`Failed to read motion frame ${frame.filePath}:`, error);
        }
      }

      return extractedFrames;
    } catch (error) {
      console.error('Motion frame extraction failed:', error);
      throw new Error(`Failed to extract motion frames: ${error}`);
    }
  }

  private async extractFramesWithMotionDetection(videoUrl: string, outputDir: string, threshold: number): Promise<Array<{ timestamp: number; filePath: string }>> {
    return new Promise((resolve, reject) => {
      const frames: Array<{ timestamp: number; filePath: string }> = [];
      
      // Use select filter to detect scene changes (motion)
      const outputPath = path.join(outputDir, 'frame_%03d.jpg');
      
      ffmpeg(videoUrl)
        .videoFilter(`select='gt(scene,${threshold})'`)
        .output(outputPath)
        .on('end', async () => {
          try {
            const files = await fs.readdir(outputDir);
            const frameFiles = files.filter(f => f.startsWith('frame_') && f.endsWith('.jpg'));
            
            for (const file of frameFiles) {
              const frameNumber = parseInt(file.replace('frame_', '').replace('.jpg', ''));
              const timestamp = frameNumber * 0.5; // Approximate timestamp
              frames.push({
                timestamp,
                filePath: path.join(outputDir, file)
              });
            }
            
            resolve(frames.slice(0, 12)); // Limit to 12 motion frames
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject)
        .run();
    });
  }

  async cleanupFrames(videoId: number): Promise<void> {
    try {
      const frameDir = path.join(this.tempDir, `video_${videoId}_*`);
      const motionDir = path.join(this.tempDir, `motion_${videoId}_*`);
      
      // Clean up regular frames
      const entries = await fs.readdir(this.tempDir);
      for (const entry of entries) {
        if (entry.startsWith(`video_${videoId}_`) || entry.startsWith(`motion_${videoId}_`)) {
          await fs.rm(path.join(this.tempDir, entry), { recursive: true, force: true });
        }
      }
    } catch (error) {
      console.error('Failed to cleanup frames:', error);
    }
  }
}

export const videoFrameExtractor = new VideoFrameExtractor();
