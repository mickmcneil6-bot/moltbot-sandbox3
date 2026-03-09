// API client for video generation endpoints

const VIDEO_API_BASE = '/api/video';

async function videoRequest<T>(
  path: string,
  options: globalThis.RequestInit = {}
): Promise<T> {
  const response = await fetch(`${VIDEO_API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  } as globalThis.RequestInit);

  if (response.status === 401) {
    throw new Error('Unauthorized - please log in via Cloudflare Access');
  }

  const data = await response.json() as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }
  return data;
}

export interface VideoConfig {
  brand: {
    name: string;
    color: string;
    logoUrl: string;
  };
  voice: {
    voiceId: string;
    configured: boolean;
  };
  cdp: {
    configured: boolean;
  };
}

export interface VoiceoverResponse {
  success: boolean;
  outputFile: string;
  message: string;
  logs?: string;
  error?: string;
}

export interface GenerateResponse {
  success: boolean;
  outputFile: string;
  message: string;
  logs?: string;
  error?: string;
}

export async function getVideoConfig(): Promise<VideoConfig> {
  return videoRequest<VideoConfig>('/config');
}

export async function generateVoiceover(text: string, voiceId?: string): Promise<VoiceoverResponse> {
  return videoRequest<VoiceoverResponse>('/voiceover', {
    method: 'POST',
    body: JSON.stringify({ text, voiceId }),
  });
}

export async function generateVideo(
  script: string,
  scenes: string[],
  title?: string
): Promise<GenerateResponse> {
  return videoRequest<GenerateResponse>('/generate', {
    method: 'POST',
    body: JSON.stringify({ script, scenes, title }),
  });
}

export function getOutputUrl(outputFile: string): string {
  // outputFile is like /tmp/video-12345.mp4, extract the filename
  const filename = outputFile.split('/').pop();
  return `${VIDEO_API_BASE}/output/${filename}`;
}
