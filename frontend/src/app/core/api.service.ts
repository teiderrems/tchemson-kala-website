import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ContactMessage, MediaAsset, PageSection } from './models';

export interface AdminToken {
  access_token: string;
  token_type: 'bearer';
  expires_at: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getSections(): Observable<PageSection[]> {
    return this.http.get<PageSection[]>(`${this.baseUrl}/sections`);
  }

  loginAdmin(username: string, password: string): Observable<AdminToken> {
    return this.http.post<AdminToken>(`${this.baseUrl}/admin/login`, { username, password });
  }

  getAdminSections(token: string): Observable<PageSection[]> {
    return this.http.get<PageSection[]>(`${this.baseUrl}/admin/sections`, {
      headers: this.adminHeaders(token),
    });
  }

  getAdminMedia(token: string): Observable<MediaAsset[]> {
    return this.http.get<MediaAsset[]>(`${this.baseUrl}/admin/media`, {
      headers: this.adminHeaders(token),
    });
  }

  getAdminMessages(token: string): Observable<ContactMessage[]> {
    return this.http.get<ContactMessage[]>(`${this.baseUrl}/admin/messages`, {
      headers: this.adminHeaders(token),
    });
  }

  deleteMessage(token: string, messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/messages/${messageId}`, {
      headers: this.adminHeaders(token),
    });
  }

  createSection(token: string, section: PageSection): Observable<PageSection> {
    const payload = {
      key: section.key,
      title_fr: section.title_fr,
      title_en: section.title_en,
      subtitle_fr: section.subtitle_fr,
      subtitle_en: section.subtitle_en,
      kind: section.kind,
      content: section.content,
      sort_order: section.sort_order,
      published: section.published,
      media_id: section.media?.id ?? null,
    };
    return this.http.post<PageSection>(`${this.baseUrl}/admin/sections`, payload, {
      headers: this.adminHeaders(token),
    });
  }

  updateSection(token: string, section: PageSection): Observable<PageSection> {
    const payload = {
      title_fr: section.title_fr,
      title_en: section.title_en,
      subtitle_fr: section.subtitle_fr,
      subtitle_en: section.subtitle_en,
      kind: section.kind,
      content: section.content,
      sort_order: section.sort_order,
      published: section.published,
      media_id: section.media?.id ?? null,
    };
    return this.http.put<PageSection>(`${this.baseUrl}/admin/sections/${section.id}`, payload, {
      headers: this.adminHeaders(token),
    });
  }

  deleteSection(token: string, sectionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/sections/${sectionId}`, {
      headers: this.adminHeaders(token),
    });
  }

  uploadMedia(token: string, file: File, altText: string): Observable<MediaAsset> {
    const form = new FormData();
    form.append('file', file);
    form.append('alt_text', altText);
    return this.http.post<MediaAsset>(`${this.baseUrl}/admin/media`, form, {
      headers: this.adminHeaders(token),
    });
  }

  updateMedia(token: string, media: MediaAsset): Observable<MediaAsset> {
    return this.http.patch<MediaAsset>(
      `${this.baseUrl}/admin/media/${media.id}`,
      { filename: media.filename, alt_text: media.alt_text },
      { headers: this.adminHeaders(token) },
    );
  }

  deleteMedia(token: string, mediaId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/media/${mediaId}`, {
      headers: this.adminHeaders(token),
    });
  }

  sendMessage(message: ContactMessage): Observable<ContactMessage> {
    return this.http.post<ContactMessage>(`${this.baseUrl}/messages`, message);
  }

  private adminHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
