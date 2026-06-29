import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { MediaAsset, PageSection } from '../../core/models';
import { TranslatePipe } from '../../core/translate.pipe';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

type EditableSection = PageSection & { contentText: string; status?: string; error?: string };

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, ScrollRevealDirective, TranslatePipe],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  readonly defaultImageUrl = '/assets/logo.jpeg';

  username = localStorage.getItem('adminUsername') ?? 'admin';
  password = '';
  authToken = localStorage.getItem('adminToken') ?? '';
  tokenExpiresAt = Number(localStorage.getItem('adminTokenExpiresAt') ?? '0');
  sections: EditableSection[] = [];
  mediaAssets: MediaAsset[] = [];
  selected: EditableSection | null = null;
  pendingFile: File | null = null;
  altText = '';
  selectedMediaId: number | null = null;
  globalStatus = '';
  globalError = '';
  notification = {
    message: '',
    type: 'success' as 'success' | 'error',
  };
  isLoggingIn = false;
  isLoading = false;
  isSaving = false;
  isUploading = false;
  uploadingTeamMember: any | null = null;
  uploadingEvent: any | null = null;
  confirmDialog = {
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmer',
    action: null as 'delete-section' | 'delete-media' | null,
    media: null as MediaAsset | null,
  };
  private readonly memberPhotoFiles = new WeakMap<object, File>();
  private readonly eventImageFiles = new WeakMap<object, File[]>();
  private notificationTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.clearNotificationTimer();
  }

  isAuthenticated(): boolean {
    return Boolean(this.authToken) && this.tokenExpiresAt * 1000 > Date.now();
  }

  login(): void {
    this.isLoggingIn = true;
    this.globalError = '';
    this.globalStatus = '';
    this.api.loginAdmin(this.username, this.password).subscribe({
      next: (token) => {
        this.authToken = token.access_token;
        this.tokenExpiresAt = token.expires_at;
        localStorage.setItem('adminUsername', this.username);
        localStorage.setItem('adminToken', this.authToken);
        localStorage.setItem('adminTokenExpiresAt', String(this.tokenExpiresAt));
        this.password = '';
        this.isLoggingIn = false;
        this.setGlobalStatus(this.i18n.language() === 'fr' ? 'Connexion reussie.' : 'Signed in successfully.');
        this.load();
      },
      error: (error) => {
        this.isLoggingIn = false;
        this.setGlobalError(
          this.errorMessage(
            error,
            this.i18n.language() === 'fr' ? 'Connexion impossible. Verifiez vos identifiants.' : 'Unable to sign in. Check your credentials.',
          ),
        );
      },
    });
  }

  logout(): void {
    this.authToken = '';
    this.tokenExpiresAt = 0;
    this.sections = [];
    this.mediaAssets = [];
    this.selected = null;
    this.pendingFile = null;
    this.selectedMediaId = null;
    this.altText = '';
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenExpiresAt');
    this.setGlobalStatus(this.i18n.language() === 'fr' ? 'Session admin fermee.' : 'Admin session closed.');
  }

  load(): void {
    if (!this.isAuthenticated()) {
      this.logout();
      this.setGlobalError(this.i18n.language() === 'fr' ? 'Connectez-vous pour administrer le site.' : 'Sign in to administer the website.');
      return;
    }

    this.isLoading = true;
    this.globalStatus = '';
    this.globalError = '';
    this.api.getAdminSections(this.authToken).subscribe({
      next: (sections) => {
        this.sections = sections.map((section) => ({
          ...section,
          contentText: JSON.stringify(section.content, null, 2),
        }));
        this.selected = this.sections[0] ?? null;
        this.selectedMediaId = this.selected?.media?.id ?? null;
        this.altText = this.selected?.media?.alt_text ?? '';
        this.setGlobalStatus(
          this.i18n.language() === 'fr' ? `${sections.length} section(s) chargee(s).` : `${sections.length} section(s) loaded.`,
        );
        this.isLoading = false;
      },
      error: (error) => {
        this.sections = [];
        this.selected = null;
        this.setGlobalError(
          this.errorMessage(
            error,
            this.i18n.language() === 'fr' ? 'Chargement impossible. Reconnectez-vous ou verifiez l API.' : 'Unable to load. Sign in again or check the API.',
          ),
        );
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.logout();
        }
        this.isLoading = false;
      },
    });
    this.loadMedia();
  }

  loadMedia(): void {
    if (!this.isAuthenticated()) {
      return;
    }

    this.api.getAdminMedia(this.authToken).subscribe({
      next: (mediaAssets) => {
        this.mediaAssets = mediaAssets;
      },
      error: () => {
        this.mediaAssets = [];
      },
    });
  }

  select(section: EditableSection): void {
    this.selected = section;
    this.pendingFile = null;
    this.altText = section.media?.alt_text ?? '';
    this.selectedMediaId = section.media?.id ?? null;
    this.closeConfirmDialog();
  }

  createSection(): void {
    const nextOrder = Math.max(0, ...this.sections.map((section) => Number(section.sort_order) || 0)) + 10;
    const section: EditableSection = {
      id: 0,
      key: `nouvelle-section-${Date.now()}`,
      title_fr: 'Nouvelle section',
      title_en: 'New section',
      subtitle_fr: '',
      subtitle_en: '',
      kind: 'content',
      content: { blocks: [] },
      contentText: JSON.stringify({ blocks: [] }, null, 2),
      sort_order: nextOrder,
      published: false,
      media: null,
      updated_at: new Date().toISOString(),
      status:
        this.i18n.language() === 'fr'
          ? 'Renseignez la section puis cliquez sur Enregistrer.'
          : 'Fill in the section, then click Save.',
    };

    this.sections = [section, ...this.sections];
    this.select(section);
    this.setSelectedStatus(section.status || '');
  }

  save(): void {
    if (!this.selected) {
      return;
    }

    if (!/^[a-z0-9-]+$/.test(this.selected.key)) {
      this.selected.error =
        this.i18n.language() === 'fr'
          ? 'Cle technique invalide: utilisez uniquement minuscules, chiffres et tirets.'
          : 'Invalid technical key: use only lowercase letters, numbers and dashes.';
      return;
    }

    try {
      this.selected.content = JSON.parse(this.selected.contentText) as Record<string, unknown>;
      this.selected.error = '';
    } catch {
      this.selected.error =
        this.i18n.language() === 'fr'
          ? 'JSON invalide: corrigez le contenu avant enregistrement.'
          : 'Invalid JSON: fix the content before saving.';
      return;
    }

    this.isSaving = true;
    const request = this.selected.id
      ? this.api.updateSection(this.authToken, this.selected)
      : this.api.createSection(this.authToken, this.selected);

    request.subscribe({
      next: (updated) => {
        Object.assign(this.selected!, updated, {
          contentText: JSON.stringify(updated.content, null, 2),
          error: '',
        });
        this.setSelectedStatus(this.i18n.language() === 'fr' ? 'Section enregistree.' : 'Section saved.');
        this.sections = this.sections.map((section) => (section === this.selected || section.id === updated.id ? this.selected! : section));
        this.isSaving = false;
      },
      error: (error) => {
        if (this.selected) {
          this.setSelectedError(
            this.errorMessage(
              error,
              this.i18n.language() === 'fr' ? 'Enregistrement impossible. Reconnectez-vous ou verifiez l API.' : 'Unable to save. Sign in again or check the API.',
            ),
          );
        }
        this.isSaving = false;
      },
    });
  }

  deleteSelectedSection(): void {
    if (!this.selected) {
      return;
    }

    this.confirmDialog = {
      open: true,
      title: this.i18n.language() === 'fr' ? 'Supprimer la section' : 'Delete section',
      message:
        this.i18n.language() === 'fr'
          ? `La section "${this.selected.key}" sera supprimee definitivement. Cette action ne supprimera pas les images associees.`
          : `The section "${this.selected.key}" will be permanently deleted. Associated images will not be deleted.`,
      confirmText: this.i18n.language() === 'fr' ? 'Supprimer' : 'Delete',
      action: 'delete-section',
      media: null,
    };
  }

  confirmAction(): void {
    if (this.confirmDialog.action === 'delete-section') {
      this.deleteSectionNow();
      return;
    }

    if (this.confirmDialog.action === 'delete-media') {
      this.deleteMediaNow();
    }
  }

  closeConfirmDialog(): void {
    this.confirmDialog.open = false;
    this.confirmDialog.action = null;
    this.confirmDialog.media = null;
  }

  private deleteSectionNow(): void {
    if (!this.selected) {
      this.closeConfirmDialog();
      return;
    }

    const section = this.selected;

    if (!section.id) {
      this.sections = this.sections.filter((item) => item !== section);
      this.selected = this.sections[0] ?? null;
      this.closeConfirmDialog();
      return;
    }

    this.api.deleteSection(this.authToken, section.id).subscribe({
      next: () => {
        this.sections = this.sections.filter((item) => item.id !== section.id);
        this.selected = this.sections[0] ?? null;
        this.setGlobalStatus(this.i18n.language() === 'fr' ? 'Section supprimee.' : 'Section deleted.');
        this.closeConfirmDialog();
      },
      error: (error) => {
        section.error = this.errorMessage(error, this.i18n.language() === 'fr' ? 'Suppression de la section impossible.' : 'Unable to delete section.');
        this.closeConfirmDialog();
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pendingFile = input.files?.[0] ?? null;
    if (this.selected && this.pendingFile) {
      this.setSelectedStatus(this.i18n.language() === 'fr' ? `Fichier selectionne: ${this.pendingFile.name}` : `Selected file: ${this.pendingFile.name}`);
    }
  }

  uploadSelectedImage(): void {
    if (!this.selected || !this.pendingFile) {
      if (this.selected) {
        this.selected.error =
          this.i18n.language() === 'fr' ? 'Selectionnez un fichier image avant de lancer l upload.' : 'Select an image file before uploading.';
      }
      return;
    }

    this.isUploading = true;
    this.api.uploadMedia(this.authToken, this.pendingFile, this.altText).subscribe({
      next: (media) => {
        if (!this.selected) {
          return;
        }
        this.selected.media = media;
        this.selectedMediaId = media.id;
        this.mediaAssets = [media, ...this.mediaAssets.filter((item) => item.id !== media.id)];
        this.setSelectedStatus(
          this.i18n.language() === 'fr'
            ? 'Image uploadee. Cliquez sur Enregistrer pour confirmer l association.'
            : 'Image uploaded. Click Save to confirm the association.',
        );
        this.pendingFile = null;
        const fileInput = document.querySelector<HTMLInputElement>('#section-image-upload');
        if (fileInput) {
          fileInput.value = '';
        }
        this.isUploading = false;
      },
      error: (error) => {
        if (this.selected) {
          this.setSelectedError(this.errorMessage(error, this.i18n.language() === 'fr' ? 'Upload impossible. Reconnectez-vous ou verifiez le fichier.' : 'Upload failed. Sign in again or check the file.'));
        }
        this.isUploading = false;
      },
    });
  }

  attachExistingMedia(): void {
    if (!this.selected || !this.selectedMediaId) {
      if (this.selected) {
        this.selected.error =
          this.i18n.language() === 'fr' ? 'Selectionnez une image existante avant de l associer.' : 'Select an existing image before attaching it.';
      }
      return;
    }

    const media = this.mediaAssets.find((item) => item.id === Number(this.selectedMediaId));
    if (!media) {
      return;
    }

    this.selected.media = media;
    this.altText = media.alt_text;
    this.setSelectedStatus(this.i18n.language() === 'fr' ? 'Image associee. Cliquez sur Enregistrer pour confirmer.' : 'Image attached. Click Save to confirm.');
  }

  setBackgroundFromSelectedMedia(): void {
    if (!this.selected?.media) {
      if (this.selected) {
        this.selected.error =
          this.i18n.language() === 'fr'
            ? 'Associez ou uploadez une image avant de la definir comme arriere-plan.'
            : 'Attach or upload an image before setting it as the background.';
      }
      return;
    }

    const content = this.selectedContent();
    content['backgroundImageUrl'] = this.selected.media.url;
    content['backgroundImageAlt'] = this.selected.media.alt_text || this.selected.media.filename;
    content['backgroundPosition'] = content['backgroundPosition'] || 'center';
    this.syncStructuredContent(
      this.i18n.language() === 'fr'
        ? 'Image definie comme arriere-plan. Cliquez sur Enregistrer pour confirmer.'
        : 'Image set as background. Click Save to confirm.',
    );
  }

  clearBackgroundImage(): void {
    const content = this.selectedContent();
    delete content['backgroundImageUrl'];
    delete content['backgroundImageAlt'];
    delete content['backgroundPosition'];
    this.syncStructuredContent(this.i18n.language() === 'fr' ? 'Image d arriere-plan retiree.' : 'Background image removed.');
  }

  setAppBackgroundFromSelectedMedia(): void {
    if (!this.selected?.media) {
      if (this.selected) {
        this.selected.error =
          this.i18n.language() === 'fr'
            ? "Associez ou uploadez une image avant de la definir comme arriere-plan global."
            : 'Attach or upload an image before setting it as the global background.';
      }
      return;
    }

    const content = this.selectedContent();
    content['appBackgroundImageUrl'] = this.selected.media.url;
    content['appBackgroundImageAlt'] = this.selected.media.alt_text || this.selected.media.filename;
    content['appBackgroundPosition'] = content['appBackgroundPosition'] || 'center';
    content['appBackgroundOverlay'] = content['appBackgroundOverlay'] || 'rgba(249, 249, 252, 0.84)';
    this.syncStructuredContent(
      this.i18n.language() === 'fr'
        ? 'Image definie comme arriere-plan global. Cliquez sur Enregistrer pour confirmer.'
        : 'Image set as global background. Click Save to confirm.',
    );
  }

  clearAppBackgroundImage(): void {
    const content = this.selectedContent();
    delete content['appBackgroundImageUrl'];
    delete content['appBackgroundImageAlt'];
    this.syncStructuredContent(this.i18n.language() === 'fr' ? 'Arriere-plan global retire.' : 'Global background removed.');
  }

  backgroundImageUrl(): string {
    const value = this.selectedContent()['backgroundImageUrl'];
    return typeof value === 'string' ? value : '';
  }

  previewImageUrl(url: unknown): string {
    return typeof url === 'string' && url ? url : this.defaultImageUrl;
  }

  selectedMediaUrl(): string {
    return this.selected?.media?.url || this.defaultImageUrl;
  }

  selectedMediaAlt(): string {
    return this.selected?.media?.alt_text || this.selected?.title_fr || 'Tchemson-Kala';
  }

  isDefaultPreview(url: unknown): boolean {
    return !(typeof url === 'string' && url) || url === this.defaultImageUrl;
  }

  detachMedia(): void {
    if (!this.selected) {
      return;
    }

    this.selected.media = null;
    this.selectedMediaId = null;
    this.altText = '';
    this.setSelectedStatus('Image detachee. Cliquez sur Enregistrer pour confirmer.');
  }

  saveMediaMetadata(): void {
    if (!this.selected?.media) {
      return;
    }

    const media = { ...this.selected.media, alt_text: this.altText };
    this.api.updateMedia(this.authToken, media).subscribe({
      next: (updated) => {
        if (!this.selected) {
          return;
        }
        this.selected.media = updated;
        this.mediaAssets = this.mediaAssets.map((item) => (item.id === updated.id ? updated : item));
        this.setSelectedStatus('Texte alternatif de l image enregistre.');
      },
      error: (error) => {
        if (this.selected) {
          this.setSelectedError(this.errorMessage(error, 'Mise a jour du media impossible.'));
        }
      },
    });
  }

  deleteSelectedMedia(): void {
    if (!this.selected?.media) {
      if (this.selected) {
        this.selected.error = 'Aucune image associee a supprimer.';
      }
      return;
    }

    this.confirmDeleteMedia(this.selected.media);
  }

  confirmDeleteMedia(media: MediaAsset): void {
    this.confirmDialog = {
      open: true,
      title: this.i18n.language() === 'fr' ? 'Supprimer l image' : 'Delete image',
      message:
        this.i18n.language() === 'fr'
          ? `L image "${media.filename}" sera supprimee definitivement. Elle sera automatiquement detachee des sections, evenements, membres et arriere-plans qui l utilisent.`
          : `The image "${media.filename}" will be permanently deleted. It will be automatically detached from sections, events, team members and backgrounds using it.`,
      confirmText: this.i18n.language() === 'fr' ? 'Supprimer' : 'Delete',
      action: 'delete-media',
      media,
    };
  }

  private deleteMediaNow(): void {
    const media = this.confirmDialog.media ?? this.selected?.media;
    if (!media) {
      this.closeConfirmDialog();
      return;
    }

    this.api.deleteMedia(this.authToken, media.id).subscribe({
      next: () => {
        this.mediaAssets = this.mediaAssets.filter((item) => item.id !== media.id);
        if (this.selected?.media?.id === media.id) {
          this.selected.media = null;
          this.selectedMediaId = null;
          this.altText = '';
        }
        this.sections = this.sections.map((section) => this.sectionWithoutMedia(section, media));
        if (this.selected) {
          const synced = this.sections.find((section) => section.id === this.selected?.id || section.key === this.selected?.key);
          this.selected = synced ?? this.selected;
        }
        this.setSelectedStatus(
          this.i18n.language() === 'fr'
            ? 'Image supprimee et retiree des contenus qui l utilisaient.'
            : 'Image deleted and removed from content that used it.',
        );
        this.closeConfirmDialog();
      },
      error: (error) => {
        this.setSelectedError(
          this.errorMessage(
            error,
            this.i18n.language() === 'fr'
              ? 'Suppression impossible.'
              : 'Unable to delete.',
          ),
        );
        this.closeConfirmDialog();
      },
    });
  }

  private sectionWithoutMedia(section: EditableSection, media: MediaAsset): EditableSection {
    const content = this.removeMediaReferences(section.content, media);
    const updated: EditableSection = {
      ...section,
      media: section.media?.id === media.id ? null : section.media,
      content,
      contentText: JSON.stringify(content, null, 2),
    };
    return updated;
  }

  private removeMediaReferences(value: any, media: MediaAsset): any {
    const mediaUrl = media.url;

    if (Array.isArray(value)) {
      return value
        .filter((item) => !(item && typeof item === 'object' && (item.mediaId === media.id || item.url === mediaUrl)))
        .map((item) => this.removeMediaReferences(item, media));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const cleaned: Record<string, any> = { ...value };
    if (cleaned['photoMediaId'] === media.id || cleaned['photoUrl'] === mediaUrl) {
      cleaned['photoMediaId'] = null;
      cleaned['photoUrl'] = '';
      cleaned['photoAlt'] = '';
    }

    for (const prefix of ['backgroundImage', 'appBackgroundImage']) {
      const urlKey = `${prefix}Url`;
      if (cleaned[urlKey] === mediaUrl) {
        delete cleaned[urlKey];
        delete cleaned[`${prefix}Alt`];
      }
    }

    for (const [key, item] of Object.entries(cleaned)) {
      cleaned[key] = this.removeMediaReferences(item, media);
    }
    return cleaned;
  }

  formatContentJson(): void {
    if (!this.selected) {
      return;
    }

    try {
      this.selected.contentText = JSON.stringify(JSON.parse(this.selected.contentText), null, 2);
      this.selected.error = '';
    } catch {
      this.selected.error = 'JSON invalide: impossible de formater.';
    }
  }

  applyContentTemplate(): void {
    if (!this.selected) {
      return;
    }

    this.selected.content = this.templateForKind(this.selected.kind);
    this.selected.contentText = JSON.stringify(this.selected.content, null, 2);
    this.setSelectedStatus(`Modele ${this.selected.kind} applique.`);
  }

  contentField(key: string): string {
    const value = this.selectedContent()[key];
    return typeof value === 'string' ? value : '';
  }

  setContentField(key: string, value: string): void {
    this.selectedContent()[key] = value;
    this.syncStructuredContent();
  }

  arrayField(key: string): any[] {
    const content = this.selectedContent();
    if (!Array.isArray(content[key])) {
      content[key] = [];
      this.syncStructuredContent();
    }
    return content[key];
  }

  addArrayItem(key: string, item: Record<string, unknown> | string): void {
    this.arrayField(key).push(item);
    this.syncStructuredContent('Element ajoute.');
  }

  removeArrayItem(key: string, index: number): void {
    this.arrayField(key).splice(index, 1);
    this.syncStructuredContent('Element retire.');
  }

  linesField(key: string): string {
    return this.arrayField(key).join('\n');
  }

  updateLinesField(key: string, value: string): void {
    this.selectedContent()[key] = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    this.syncStructuredContent();
  }

  communityField(key: string): string {
    const community = this.communityObject();
    const value = community[key];
    return typeof value === 'string' ? value : '';
  }

  setCommunityField(key: string, value: string): void {
    this.communityObject()[key] = value;
    this.syncStructuredContent();
  }

  communityPointsText(): string {
    const points = this.communityObject()['points'];
    return Array.isArray(points) ? points.join('\n') : '';
  }

  updateCommunityPoints(value: string): void {
    this.communityObject()['points'] = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    this.syncStructuredContent();
  }

  teamMembers(): any[] {
    const content = this.selectedContent();
    if (!Array.isArray(content['team'])) {
      content['team'] = [];
      this.syncStructuredContent();
    }
    return content['team'];
  }

  private communityObject(): Record<string, any> {
    const content = this.selectedContent();
    if (!content['community'] || typeof content['community'] !== 'object' || Array.isArray(content['community'])) {
      content['community'] = { title: '', text: '', points: [] };
    }
    return content['community'];
  }

  addTeamMember(): void {
    this.teamMembers().push({
      icon: 'person',
      name: 'Nouveau membre / New member',
      role: 'Role / Function',
      bio: 'Presentation du membre. / Member presentation.',
      skills: [],
      photoUrl: '',
      photoAlt: '',
      photoMediaId: null,
    });
    this.syncStructuredContent('Membre ajoute a l equipe.');
  }

  removeTeamMember(index: number): void {
    this.teamMembers().splice(index, 1);
    this.syncStructuredContent('Membre retire de l equipe.');
  }

  memberSkillsText(member: any): string {
    return Array.isArray(member.skills) ? member.skills.join(', ') : '';
  }

  updateMemberSkills(member: any, value: string): void {
    member.skills = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    this.syncStructuredContent();
  }

  eventImages(event: any): any[] {
    if (!Array.isArray(event.images)) {
      event.images = [];
      this.syncStructuredContent();
    }
    return event.images;
  }

  addEventImage(event: any, mediaId: number | string | null): void {
    const media = this.mediaAssets.find((item) => item.id === Number(mediaId));
    if (!media) {
      if (this.selected) {
        this.selected.error =
          this.i18n.language() === 'fr' ? 'Selectionnez une image existante avant de l ajouter.' : 'Select an existing image before adding it.';
      }
      return;
    }

    const images = this.eventImages(event);
    if (images.some((image) => Number(image.mediaId) === media.id)) {
      return;
    }

    images.push({ mediaId: media.id, url: media.url, altText: media.alt_text || media.filename });
    this.syncStructuredContent(this.i18n.language() === 'fr' ? 'Image ajoutee a l evenement.' : 'Image added to the event.');
  }

  removeEventImage(event: any, index: number): void {
    this.eventImages(event).splice(index, 1);
    this.syncStructuredContent(this.i18n.language() === 'fr' ? 'Image retiree de l evenement.' : 'Image removed from the event.');
  }

  onEventImagesSelected(eventItem: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) {
      this.eventImageFiles.delete(eventItem);
      return;
    }

    this.eventImageFiles.set(eventItem, files);
    if (this.selected) {
      this.setSelectedStatus(
        this.i18n.language() === 'fr'
          ? `${files.length} image(s) selectionnee(s) pour cet evenement.`
          : `${files.length} image(s) selected for this event.`,
      );
    }
  }

  eventImageFileNames(event: any): string {
    return (this.eventImageFiles.get(event) ?? []).map((file) => file.name).join(', ');
  }

  uploadEventImages(event: any): void {
    if (!this.selected) {
      return;
    }

    const files = this.eventImageFiles.get(event) ?? [];
    if (!files.length) {
      this.selected.error =
        this.i18n.language() === 'fr'
          ? 'Selectionnez une ou plusieurs images pour cet evenement avant de lancer l upload.'
          : 'Select one or more images for this event before uploading.';
      return;
    }

    this.uploadingEvent = event;
    const title = event.title || (this.i18n.language() === 'fr' ? 'evenement scolaire' : 'school event');
    forkJoin(files.map((file) => this.api.uploadMedia(this.authToken, file, `${title} - ${file.name}`))).subscribe({
      next: (mediaList) => {
        this.mediaAssets = [...mediaList, ...this.mediaAssets.filter((item) => !mediaList.some((media) => media.id === item.id))];
        const images = this.eventImages(event);
        for (const media of mediaList) {
          images.push({ mediaId: media.id, url: media.url, altText: media.alt_text || media.filename });
        }
        this.eventImageFiles.delete(event);
        this.uploadingEvent = null;
        this.syncStructuredContent(
          this.i18n.language() === 'fr' ? 'Images uploadees et associees a l evenement.' : 'Images uploaded and attached to the event.',
        );
      },
      error: (error) => {
        if (this.selected) {
          this.setSelectedError(
            this.errorMessage(
              error,
              this.i18n.language() === 'fr' ? 'Upload des images de l evenement impossible.' : 'Unable to upload event images.',
            ),
          );
        }
        this.uploadingEvent = null;
      },
    });
  }

  setMemberPhoto(member: any, mediaId: number | null): void {
    const media = this.mediaAssets.find((item) => item.id === Number(mediaId));
    if (!media) {
      member.photoUrl = '';
      member.photoAlt = '';
      member.photoMediaId = null;
      this.syncStructuredContent();
      return;
    }

    member.photoUrl = media.url;
    member.photoAlt = media.alt_text || media.filename;
    member.photoMediaId = media.id;
    this.syncStructuredContent('Photo du membre mise a jour.');
  }

  onTeamMemberPhotoSelected(member: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.memberPhotoFiles.delete(member);
      return;
    }

    this.memberPhotoFiles.set(member, file);
    this.setSelectedStatus(`Photo selectionnee pour ${member.name || 'ce membre'}: ${file.name}`);
  }

  teamMemberPhotoFileName(member: any): string {
    return this.memberPhotoFiles.get(member)?.name ?? '';
  }

  uploadTeamMemberPhoto(member: any): void {
    if (!this.selected) {
      return;
    }

    const file = this.memberPhotoFiles.get(member);
    if (!file) {
      this.selected.error = 'Selectionnez une photo pour ce membre avant de lancer l upload.';
      return;
    }

    this.uploadingTeamMember = member;
    const altText = member.photoAlt || `Portrait de ${member.name || 'membre de l equipe'}`;
    this.api.uploadMedia(this.authToken, file, altText).subscribe({
      next: (media) => {
        this.mediaAssets = [media, ...this.mediaAssets.filter((item) => item.id !== media.id)];
        member.photoUrl = media.url;
        member.photoAlt = media.alt_text || altText;
        member.photoMediaId = media.id;
        this.memberPhotoFiles.delete(member);
        this.uploadingTeamMember = null;
        this.syncStructuredContent(`Photo de ${member.name || 'ce membre'} uploadee et associee.`);
      },
      error: (error) => {
        if (this.selected) {
          this.setSelectedError(this.errorMessage(error, 'Upload de la photo du membre impossible.'));
        }
        this.uploadingTeamMember = null;
      },
    });
  }

  syncStructuredContent(status = ''): void {
    if (!this.selected) {
      return;
    }

    this.selected.contentText = JSON.stringify(this.selected.content, null, 2);
    this.selected.error = '';
    if (status) {
      this.setSelectedStatus(status);
    }
  }

  private selectedContent(): Record<string, any> {
    if (!this.selected) {
      return {};
    }

    if (!this.selected.content || typeof this.selected.content !== 'object' || Array.isArray(this.selected.content)) {
      this.selected.content = {};
    }

    return this.selected.content as Record<string, any>;
  }

  private templateForKind(kind: string): Record<string, unknown> {
    const templates: Record<string, Record<string, unknown>> = {
      settings: {
        appBackgroundImageUrl: '',
        appBackgroundPosition: 'center',
        appBackgroundOverlay: 'rgba(249, 249, 252, 0.84)',
      },
      hero: {
        academicYearStartMonth: 9,
        primaryAction: "S'inscrire / Enroll Now",
        secondaryAction: 'Telecharger le prospectus / Download Prospectus',
        stats: [
          { value: '500+', label: 'Futurs leaders accompagnes' },
          { value: 'FR/EN', label: 'Immersion bilingue' },
          { value: '100%', label: 'Environnement securise' },
        ],
      },
      cards: {
        items: [{ icon: 'translate', title: 'Bilingue / Bilingual', text: "Maitrise progressive du francais et de l'anglais. / Progressive mastery of French and English." }],
      },
      admissions: {
        registrationFee: '5,000 FCFA',
        requirements: ['Formulaire dument rempli / Completed registration form'],
        payments: [{ label: '1er versement', amount: '30,000 FCFA', deadline: '01 Octobre 2025' }],
      },
      services: {
        badge: 'Excellence Bilingue / Bilingual Excellence',
        highlights: [{ icon: 'verified', title: '100% certifie / 100% certified', text: 'Equipe qualifiee et approche bilingue. / Qualified team and bilingual approach.' }],
        team: [{ icon: 'school', name: 'Nom / Name', role: 'Role / Role', bio: 'Presentation / Presentation', skills: ['Competence / Skill'], photoUrl: '', photoAlt: '', photoMediaId: null }],
        services: [{ icon: 'restaurant', title: 'Service / Service', text: 'Description / Description', points: ['Point cle / Key point'] }],
        faqs: [{ question: 'Question ? / Question?', answer: 'Reponse. / Answer.' }],
      },
      life: {
        mentorship: [{ icon: 'psychology', title: 'Mentorat / Mentorship', text: 'Description. / Description.' }],
        activities: [{ icon: 'sports_soccer', title: 'Activite / Activity', text: 'Description. / Description.', featured: true }],
        community: { title: 'Association des Parents / Parent-Teacher Association', text: 'Description. / Description.', points: ['Point cle / Key point'] },
        testimonials: [{ name: 'Nom / Name', role: 'Role / Role', quote: 'Temoignage. / Testimonial.', featured: false }],
      },
      events: {
        current: [
          {
            title: 'Nouvel evenement / New event',
            date: 'En cours / Ongoing',
            location: 'Campus Tchemson-Kala',
            description: 'Description de l evenement. / Event description.',
            tag: 'Actuel / Current',
            images: [],
          },
        ],
        scheduled: [
          {
            title: 'Evenement programme / Scheduled event',
            date: 'Date a definir / Date to be confirmed',
            location: 'Campus Tchemson-Kala',
            description: 'Description de l evenement programme. / Scheduled event description.',
            tag: 'Programme / Scheduled',
            images: [],
          },
        ],
      },
      contact: {
        phones: ['+237 000 000 000'],
        email: 'contact@example.com',
        hours: 'Lun - Ven: 07:30 - 15:30',
        address: 'Adresse',
      },
      content: { blocks: [] },
    };

    return templates[kind] ?? templates['content'];
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = typeof error.error?.detail === 'string' ? error.error.detail : '';
      return detail ? `${fallback} (${detail})` : fallback;
    }
    return fallback;
  }

  private setGlobalStatus(message: string, duration = 3500): void {
    this.globalStatus = message;
    this.globalError = '';
    this.showNotification(message, 'success', duration, () => {
      if (this.globalStatus === message) {
        this.globalStatus = '';
      }
    });
  }

  private setGlobalError(message: string, duration = 6000): void {
    this.globalError = message;
    this.globalStatus = '';
    this.showNotification(message, 'error', duration, () => {
      if (this.globalError === message) {
        this.globalError = '';
      }
    });
  }

  private setSelectedStatus(message: string, duration = 3500): void {
    if (this.selected) {
      this.selected.status = message;
      this.selected.error = '';
    }
    this.showNotification(message, 'success', duration, () => {
      if (this.selected?.status === message) {
        this.selected.status = '';
      }
    });
  }

  private setSelectedError(message: string, duration = 6000): void {
    if (this.selected) {
      this.selected.error = message;
    }
    this.showNotification(message, 'error', duration, () => {
      if (this.selected?.error === message) {
        this.selected.error = '';
      }
    });
  }

  private showNotification(message: string, type: 'success' | 'error', duration: number, afterHide?: () => void): void {
    this.clearNotificationTimer();
    this.notification = { message, type };
    this.notificationTimer = setTimeout(() => {
      this.notification = { message: '', type };
      this.notificationTimer = null;
      afterHide?.();
    }, duration);
  }

  private clearNotificationTimer(): void {
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
      this.notificationTimer = null;
    }
  }
}
