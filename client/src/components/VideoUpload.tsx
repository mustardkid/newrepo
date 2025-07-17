import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Video, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface VideoUploadProps {
  onUploadComplete?: (videoId: number) => void;
}

export default function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('utv');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedVideoId, setUploadedVideoId] = useState<number | null>(null);
  const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createUploadUrlMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await apiRequest('POST', '/api/videos/upload-url', {
        fileName: file.name,
        maxDurationSeconds: 3600,
        title: title || file.name,
        description: description || '',
        category: category || 'utv'
      });
      return response.json();
    },
    onError: (error) => {
      console.error('Error creating upload URL:', error);
      setUploadStatus('error');
      setErrorMessage('Failed to create upload URL. Please try again.');
      toast({
        title: 'Upload Failed',
        description: 'Could not initialize upload. Please check your connection and try again.',
        variant: 'destructive'
      });
    }
  });

  const uploadToCloudflare = async (file: File, uploadUrl: string, retryCount: number = 0) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          let errorMessage = `Upload failed with status ${xhr.status}`;
          if (xhr.status === 413) {
            errorMessage = `File is too large (${Math.round(file.size / (1024 * 1024))}MB). Please reduce file size to under 500MB and try again.`;
          } else if (xhr.status === 408) {
            errorMessage = 'Upload timeout. Please try again with a smaller file or better connection.';
          } else if (xhr.status === 429) {
            errorMessage = 'Too many upload attempts. Please wait a moment and try again.';
          } else if (xhr.status >= 500 && retryCount < 2) {
            // Retry on server errors
            setTimeout(() => {
              uploadToCloudflare(file, uploadUrl, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, 1000 * (retryCount + 1)); // Exponential backoff
            return;
          }
          reject(new Error(errorMessage));
        }
      };
      
      xhr.onerror = () => {
        if (retryCount < 2) {
          // Retry on network errors
          setTimeout(() => {
            uploadToCloudflare(file, uploadUrl, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1)); // Exponential backoff
        } else {
          reject(new Error('Upload failed after multiple attempts. Please check your connection and try again.'));
        }
      };
      
      // Set timeout for large files
      xhr.timeout = 10 * 60 * 1000; // 10 minutes timeout
      
      xhr.ontimeout = () => {
        reject(new Error('Upload timeout. Please try again with a smaller file or better connection.'));
      };
      
      xhr.open('POST', uploadUrl);
      
      const formData = new FormData();
      formData.append('file', file);
      
      xhr.send(formData);
    });
  };

  const updateVideoMutation = useMutation({
    mutationFn: async ({ videoId, updates }: { videoId: number; updates: any }) => {
      const response = await apiRequest('PATCH', `/api/videos/${videoId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos/my'] });
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a video file.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 500MB for better upload reliability)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: `Please upload a video file smaller than 500MB. Current file size: ${Math.round(file.size / (1024 * 1024))}MB`,
        variant: 'destructive'
      });
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      // Step 1: Create upload URL and video record
      const uploadData = await createUploadUrlMutation.mutateAsync(file);
      const { video, uploadUrl } = uploadData;
      
      setUploadedVideoId(video.id);

      // Step 2: Upload file to Cloudflare Stream
      await uploadToCloudflare(file, uploadUrl);

      // Step 3: Update video record with file size and processing status
      await updateVideoMutation.mutateAsync({
        videoId: video.id,
        updates: {
          status: 'processing',
          cfProcessingStatus: 'inprogress',
          fileSize: file.size
        }
      });

      setUploadStatus('processing');
      setUploadProgress(100);

      // Step 4: Start polling for processing status
      startStatusPolling(video.id);

      toast({
        title: 'Upload Complete',
        description: 'Your video is now being processed. You\'ll receive an email notification when it\'s ready.',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('utv');

      onUploadComplete?.(video.id);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      
      let errorMessage = 'Upload failed. Please try again.';
      let errorDescription = 'There was an error uploading your video. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.message.includes('413')) {
          errorDescription = `File too large. Maximum size is 500MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`;
        } else if (error.message.includes('408') || error.message.includes('timeout')) {
          errorDescription = 'Upload timeout. Please check your internet connection and try again.';
        } else if (error.message.includes('429')) {
          errorDescription = 'Too many upload attempts. Please wait a moment and try again.';
        } else if (error.message.includes('network')) {
          errorDescription = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('CORS')) {
          errorDescription = 'Upload service temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('multiple attempts')) {
          errorDescription = 'Upload failed after multiple attempts. Please try again with a smaller file or better connection.';
        }
      }
      
      setErrorMessage(errorMessage);
      toast({
        title: 'Upload Failed',
        description: errorDescription,
        variant: 'destructive'
      });
    }
  }, [title, description, category, createUploadUrlMutation, updateVideoMutation, toast, onUploadComplete]);

  // Status polling function
  const startStatusPolling = (videoId: number) => {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const response = await apiRequest('GET', `/api/videos/${videoId}/status`);
        const statusData = await response.json();
        
        if (statusData.cfProcessingStatus === 'ready' && statusData.cfReadyToStream) {
          setUploadStatus('complete');
          setUploadProgress(100);
          clearInterval(interval);
          
          toast({
            title: 'Processing Complete',
            description: 'Your video is now ready for viewing!',
          });
          
          // Invalidate queries to refresh the video list
          queryClient.invalidateQueries({ queryKey: ['/api/videos/my'] });
          queryClient.invalidateQueries({ queryKey: ['/api/videos/my-detailed'] });
          
        } else if (statusData.cfProcessingStatus === 'inprogress') {
          // Show processing progress
          setUploadProgress(Math.min(90, uploadProgress + 5)); // Gradually increase up to 90%
          
        } else if (statusData.cfProcessingStatus === 'error') {
          setUploadStatus('error');
          setErrorMessage('Video processing failed. Please try again.');
          clearInterval(interval);
          
          toast({
            title: 'Processing Failed',
            description: 'There was an error processing your video. Please try uploading again.',
            variant: 'destructive'
          });
        }
        // Continue polling if still processing
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    setStatusPollingInterval(interval);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
      }
    };
  }, [statusPollingInterval]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm']
    },
    maxFiles: 1,
    disabled: uploadStatus === 'uploading' || uploadStatus === 'processing'
  });

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Upload className="animate-spin text-blue-500" size={24} />;
      case 'processing':
        return <Video className="animate-pulse text-yellow-500" size={24} />;
      case 'complete':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'error':
        return <XCircle className="text-red-500" size={24} />;
      default:
        return <Upload className="text-gray-500" size={24} />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return `Uploading... ${uploadProgress}%`;
      case 'processing':
        return 'Processing video...';
      case 'complete':
        return 'Upload complete!';
      case 'error':
        return 'Upload failed';
      default:
        return 'Ready to upload';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="glass-card bg-card-gradient border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Upload Your UTV Video</CardTitle>
          <p className="text-white/70">Share your adventure and let AI make it viral</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Details Form */}
          <div className="space-y-4">
            <div>
              <Label className="text-white text-sm font-medium">Video Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title..."
                className="glass-input mt-1"
                disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
              />
            </div>

            <div>
              <Label className="text-white text-sm font-medium">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your ride..."
                className="glass-input mt-1"
                rows={3}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
              />
            </div>

            <div>
              <Label className="text-white text-sm font-medium">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-input mt-1 w-full"
                disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
              >
                <option value="utv">UTV</option>
                <option value="atv">ATV</option>
                <option value="side-by-side">Side by Side</option>
                <option value="dirt-bike">Dirt Bike</option>
                <option value="rock-crawling">Rock Crawling</option>
                <option value="mud-bogging">Mud Bogging</option>
                <option value="trail-riding">Trail Riding</option>
                <option value="racing">Racing</option>
              </select>
            </div>
          </div>

          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-accent-pink bg-accent-pink/10'
                : 'border-white/20 hover:border-white/40'
            } ${
              uploadStatus === 'uploading' || uploadStatus === 'processing'
                ? 'cursor-not-allowed opacity-50'
                : ''
            }`}
          >
            <input {...getInputProps()} />
            
            <div className="space-y-4">
              {getStatusIcon()}
              
              <div>
                <h3 className="text-white text-lg font-medium">{getStatusText()}</h3>
                {uploadStatus === 'idle' && (
                  <p className="text-white/70 text-sm mt-1">
                    {isDragActive
                      ? 'Drop your video here'
                      : 'Drag and drop your video here, or click to browse'}
                  </p>
                )}
              </div>

              {uploadStatus === 'uploading' && (
                <div className="w-full max-w-md mx-auto">
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {uploadStatus === 'error' && errorMessage && (
                <div className="flex items-center justify-center space-x-2 text-red-400">
                  <AlertCircle size={16} />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              {uploadStatus === 'idle' && (
                <p className="text-white/50 text-xs">
                  Supported formats: MP4, MOV, AVI, MKV, WMV, FLV, WebM (max 5GB)
                </p>
              )}
            </div>
          </div>

          {/* Upload Button */}
          {uploadStatus === 'idle' && (
            <Button
              onClick={() => document.querySelector('input[type="file"]')?.click()}
              className="w-full bg-light-gradient text-gray-900 hover:bg-light-gradient/90 font-semibold py-3"
              disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
            >
              <Upload className="mr-2" size={20} />
              Choose Video File
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}