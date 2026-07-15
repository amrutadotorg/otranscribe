// OTR file format types

/** Format v1 - backwards compatible with original oTranscribe */
export interface OtrFileV1 {
  text: string; // Raw HTML (innerHTML of #textbox)
  media: string; // Filename or YouTube title
  'media-source'?: string; // URL for YouTube, empty for local files
  'media-time'?: number; // Player position in seconds at export time
}

/** Internal parsed representation */
export interface OtrDocument {
  html: string;
  mediaDetails: MediaDetails;
  mediaTime: number;
}

export interface MediaDetails {
  name: string;
  source?: string; // URL for YouTube
  vimeoId?: string; // Vimeo video ID
}

