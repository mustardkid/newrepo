import { Video } from "@shared/schema";

if (!process.env.CF_ACCOUNT_ID || !process.env.CF_STREAM_TOKEN) {
  throw new Error("CF_ACCOUNT_ID and CF_STREAM_TOKEN environment variables are required");
}

export interface CloudflareStreamUploadResponse {
  result: {
    uid: string;
    uploadURL: string;
    preview: string;
    thumbnail: string;
    readyToStream: boolean;
    status: {
      state: string;
      pctComplete: string;
      errorReasonCode?: string;
      errorReasonText?: string;
    };
  };
  success: boolean;
  errors: Array<{
    code: number;
    message: string;
  }>;
}

export interface CloudflareStreamVideoDetails {
  result: {
    uid: string;
    thumbnail: string;
    thumbnailTimestampPct: number;
    readyToStream: boolean;
    status: {
      state: string;
      pctComplete: string;
      errorReasonCode?: string;
      errorReasonText?: string;
    };
    meta: {
      downloaded_on?: string;
      name: string;
    };
    created: string;
    modified: string;
    size: number;
    preview: string;
    duration: number;
    input: {
      width: number;
      height: number;
    };
    playback: {
      hls: string;
      dash: string;
    };
  };
  success: boolean;
  errors: Array<{
    code: number;
    message: string;
  }>;
}

export class CloudflareStreamService {
  private baseUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/stream`;
  private headers = {
    'Authorization': `Bearer ${process.env.CF_STREAM_TOKEN}`,
    'Content-Type': 'application/json'
  };

  async createUploadUrl(fileName: string, maxDurationSeconds: number = 3600): Promise<CloudflareStreamUploadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/direct_upload`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          maxDurationSeconds,
          meta: {
            name: fileName
          },
          requireSignedURLs: false,
          allowedOrigins: ['*'],
          uploadExpiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours for large files
          maxSizeBytes: 500 * 1024 * 1024, // 500MB max file size for better reliability
          uploadTimeoutSeconds: 1800 // 30 minutes timeout
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare Stream API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating Cloudflare Stream upload URL:', error);
      throw error;
    }
  }

  async getVideoDetails(streamId: string): Promise<CloudflareStreamVideoDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/${streamId}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare Stream API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching video details from Cloudflare Stream:', error);
      throw error;
    }
  }

  async deleteVideo(streamId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${streamId}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        console.error(`Failed to delete video ${streamId}: ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting video from Cloudflare Stream:', error);
      return false;
    }
  }

  async listVideos(limit: number = 50): Promise<{
    result: Array<{
      uid: string;
      thumbnail: string;
      readyToStream: boolean;
      status: {
        state: string;
        pctComplete: string;
      };
      meta: {
        name: string;
      };
      created: string;
      duration: number;
    }>;
    success: boolean;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}?limit=${limit}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare Stream API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error listing videos from Cloudflare Stream:', error);
      throw error;
    }
  }

  getStreamUrl(streamId: string): string {
    return `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${streamId}/manifest/video.m3u8`;
  }

  getThumbnailUrl(streamId: string): string {
    return `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${streamId}/thumbnails/thumbnail.jpg`;
  }

  getIframeUrl(streamId: string): string {
    return `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${streamId}/iframe`;
  }

  getWatchUrl(streamId: string): string {
    return `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${streamId}/watch`;
  }

  async processWebhook(payload: any): Promise<void> {
    try {
      console.log('Processing Cloudflare Stream webhook:', payload);
      
      // Handle different webhook events
      switch (payload.status?.state) {
        case 'ready':
          console.log(`Video ${payload.uid} is ready to stream`);
          break;
        case 'inprogress':
          console.log(`Video ${payload.uid} processing: ${payload.status.pctComplete}%`);
          break;
        case 'error':
          console.error(`Video ${payload.uid} processing error:`, payload.status.errorReasonText);
          break;
        default:
          console.log(`Video ${payload.uid} status:`, payload.status);
      }
    } catch (error) {
      console.error('Error processing Cloudflare Stream webhook:', error);
    }
  }
}

export const cloudflareStreamService = new CloudflareStreamService();