export interface MediaAsset {
  id: number;
  filename: string;
  content_type: string;
  alt_text: string;
  url: string;
}

export interface PageSection {
  id: number;
  key: string;
  title_fr: string;
  title_en: string;
  subtitle_fr: string;
  subtitle_en: string;
  kind: string;
  content: Record<string, unknown>;
  sort_order: number;
  published: boolean;
  media: MediaAsset | null;
  updated_at: string;
}

export interface ContactMessage {
  full_name: string;
  email: string;
  subject: string;
  message: string;
}
