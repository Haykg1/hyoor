'use client';

import type { AdminPoi, PoiAttributes } from '@repo/shared';
import {
  POI_DESTINATION_CATEGORIES,
  POI_PLANNER_TAGS,
  POI_PRICE_BANDS,
  poiAttributeFieldVisible,
} from '@repo/shared';
import { ArrowLeft, Check, Loader2, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FormNativeSelect } from '@/components/dashboard/form-native-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import {
  createAdminPoi,
  deleteAdminPoi,
  deleteAdminPoiPhoto,
  importAdminPoiPhoto,
  listAdminPois,
  seedAdminPois,
  setAdminPoiPhotoStatus,
  suggestAdminPoiPhotos,
  updateAdminPoi,
  uploadAdminPoiPhoto,
  type AdminPoiWriteInput,
} from '@/lib/api/admin-pois';

interface AdminPoisClientProps {
  canForceSeed: boolean;
}

interface PoiFormState {
  id: string;
  city: string;
  region: string;
  latitude: string;
  longitude: string;
  category: string;
  tags: string[];
  nameEn: string;
  nameHy: string;
  nameRu: string;
  descEn: string;
  descHy: string;
  descRu: string;
  wikipediaTitle: string;
  wikipediaUrl: string;
  status: 'DRAFT' | 'PUBLISHED';
  usableInPlanner: boolean;
  sortOrder: string;
  averageMealAmd: string;
  priceBand: string;
  servesAlcohol: boolean;
  typicalDurationMin: string;
  openingHoursNote: string;
  website: string;
  websiteMenu: string;
  phone: string;
}

const EMPTY_FORM: PoiFormState = {
  id: '',
  city: 'Yerevan',
  region: 'Yerevan',
  latitude: '40.1776',
  longitude: '44.5126',
  category: 'landmark',
  tags: [],
  nameEn: '',
  nameHy: '',
  nameRu: '',
  descEn: '',
  descHy: '',
  descRu: '',
  wikipediaTitle: '',
  wikipediaUrl: '',
  status: 'DRAFT',
  usableInPlanner: false,
  sortOrder: '0',
  averageMealAmd: '',
  priceBand: '',
  servesAlcohol: false,
  typicalDurationMin: '',
  openingHoursNote: '',
  website: '',
  websiteMenu: '',
  phone: '',
};

function formFromPoi(poi: AdminPoi): PoiFormState {
  return {
    id: poi.id,
    city: poi.city,
    region: poi.region,
    latitude: String(poi.latitude),
    longitude: String(poi.longitude),
    category: poi.category,
    tags: poi.tags,
    nameEn: poi.nameLabels.en,
    nameHy: poi.nameLabels.hy,
    nameRu: poi.nameLabels.ru,
    descEn: poi.descriptionLabels.en,
    descHy: poi.descriptionLabels.hy,
    descRu: poi.descriptionLabels.ru,
    wikipediaTitle: poi.wikipediaTitle ?? '',
    wikipediaUrl: poi.wikipediaUrl ?? '',
    status: poi.status,
    usableInPlanner: poi.usableInPlanner,
    sortOrder: String(poi.sortOrder),
    averageMealAmd: poi.attributes.averageMealAmd ? String(poi.attributes.averageMealAmd) : '',
    priceBand: poi.attributes.priceBand ?? '',
    servesAlcohol: poi.attributes.servesAlcohol ?? false,
    typicalDurationMin: poi.attributes.typicalDurationMin
      ? String(poi.attributes.typicalDurationMin)
      : '',
    openingHoursNote: poi.attributes.openingHoursNote ?? '',
    website: poi.attributes.website ?? '',
    websiteMenu: poi.attributes.websiteMenu ?? '',
    phone: poi.attributes.phone ?? '',
  };
}

function toWriteInput(form: PoiFormState, includeId: boolean): AdminPoiWriteInput {
  const attributes: PoiAttributes = {};
  const show = (field: Parameters<typeof poiAttributeFieldVisible>[0]): boolean =>
    poiAttributeFieldVisible(field, form.category);
  if (show('averageMealAmd') && form.averageMealAmd.trim()) {
    attributes.averageMealAmd = Number(form.averageMealAmd);
  }
  if (
    show('priceBand') &&
    (form.priceBand === 'budget' || form.priceBand === 'mid' || form.priceBand === 'upscale')
  ) {
    attributes.priceBand = form.priceBand;
  }
  if (show('servesAlcohol')) attributes.servesAlcohol = form.servesAlcohol;
  if (show('typicalDurationMin') && form.typicalDurationMin.trim()) {
    attributes.typicalDurationMin = Number(form.typicalDurationMin);
  }
  if (show('openingHoursNote') && form.openingHoursNote.trim()) {
    attributes.openingHoursNote = form.openingHoursNote.trim();
  }
  if (show('website') && form.website.trim()) attributes.website = form.website.trim();
  if (show('websiteMenu') && form.websiteMenu.trim()) {
    attributes.websiteMenu = form.websiteMenu.trim();
  }
  if (show('phone') && form.phone.trim()) attributes.phone = form.phone.trim();
  return {
    ...(includeId && form.id.trim() ? { id: form.id.trim() } : {}),
    city: form.city.trim(),
    region: form.region.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    category: form.category,
    tags: form.tags,
    nameLabels: { en: form.nameEn.trim(), hy: form.nameHy.trim(), ru: form.nameRu.trim() },
    descriptionLabels: { en: form.descEn.trim(), hy: form.descHy.trim(), ru: form.descRu.trim() },
    wikipediaTitle: form.wikipediaTitle.trim() || undefined,
    wikipediaUrl: form.wikipediaUrl.trim() || undefined,
    attributes,
    status: form.status,
    usableInPlanner: form.usableInPlanner,
    sortOrder: Number(form.sortOrder) || 0,
  };
}

export function AdminPoisClient({ canForceSeed }: AdminPoisClientProps): React.JSX.Element {
  const t = useTranslations('admin.pois');
  const [rows, setRows] = useState<AdminPoi[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [planner, setPlanner] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPoi | null>(null);
  const [form, setForm] = useState<PoiFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await listAdminPois({
        page,
        limit: 20,
        search: search.trim() || undefined,
        category: category === 'all' ? undefined : category,
        status: status === 'all' ? undefined : (status as 'DRAFT' | 'PUBLISHED'),
        usableInPlanner: planner === 'all' ? undefined : (planner as 'true' | 'false'),
      });
      setRows(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      toast.error(t('load_error'));
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status, planner, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  function openCreate(): void {
    setEditing(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  }

  function openEdit(poi: AdminPoi): void {
    setEditing(poi);
    setForm(formFromPoi(poi));
    setEditorOpen(true);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateAdminPoi(editing.id, toWriteInput(form, false));
        setEditing(updated);
        toast.success(t('saved'));
      } else {
        const created = await createAdminPoi(toWriteInput(form, true));
        setEditing(created);
        setForm(formFromPoi(created));
        toast.success(t('created'));
      }
      await load();
    } catch {
      toast.error(t('save_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm(t('delete_confirm'))) return;
    try {
      await deleteAdminPoi(id);
      toast.success(t('deleted'));
      if (editing?.id === id) setEditorOpen(false);
      await load();
    } catch {
      toast.error(t('delete_error'));
    }
  }

  async function handleSync(): Promise<void> {
    setSyncing(true);
    try {
      const result = await seedAdminPois();
      toast.success(t('synced', { count: result.seededEntries }));
    } catch {
      toast.error(t('sync_error'));
    } finally {
      setSyncing(false);
    }
  }

  async function handlePhoto(file: File | undefined): Promise<void> {
    if (!file || !editing) return;
    setUploading(true);
    try {
      const photo = await uploadAdminPoiPhoto(editing.id, file);
      setEditing({ ...editing, photos: [...editing.photos, photo] });
      toast.success(t('photo_added'));
      await load();
    } catch {
      toast.error(t('photo_error'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePhoto(photoId: string): Promise<void> {
    if (!editing) return;
    try {
      await deleteAdminPoiPhoto(editing.id, photoId);
      setEditing({ ...editing, photos: editing.photos.filter((photo) => photo.id !== photoId) });
      await load();
    } catch {
      toast.error(t('photo_error'));
    }
  }

  async function handlePhotoStatus(
    photoId: string,
    nextStatus: 'APPROVED' | 'REJECTED',
  ): Promise<void> {
    if (!editing) return;
    setPhotoBusyId(photoId);
    try {
      const updated = await setAdminPoiPhotoStatus(editing.id, photoId, nextStatus);
      setEditing({
        ...editing,
        photos: editing.photos.map((photo) => (photo.id === photoId ? updated : photo)),
      });
      await load();
    } catch {
      toast.error(t('photo_error'));
    } finally {
      setPhotoBusyId(null);
    }
  }

  async function handleSuggestPhotos(): Promise<void> {
    if (!editing) return;
    setSuggesting(true);
    setSuggestions([]);
    try {
      const result = await suggestAdminPoiPhotos(editing.id);
      if (!result.configured) {
        toast.error(t('photo_suggest_unconfigured'));
        return;
      }
      setSuggestions(result.urls);
      if (result.urls.length === 0) toast.message(t('photo_suggest_empty'));
    } catch {
      toast.error(t('photo_error'));
    } finally {
      setSuggesting(false);
    }
  }

  async function handleImportSuggestion(url: string): Promise<void> {
    if (!editing) return;
    setPhotoBusyId(url);
    try {
      const photo = await importAdminPoiPhoto(editing.id, { url, sourceUrl: url });
      setEditing({ ...editing, photos: [...editing.photos, photo] });
      setSuggestions((prev) => prev.filter((entry) => entry !== url));
      toast.success(t('photo_added'));
      await load();
    } catch {
      toast.error(t('photo_error'));
    } finally {
      setPhotoBusyId(null);
    }
  }

  function toggleTag(tag: string): void {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((item) => item !== tag)
        : [...prev.tags, tag],
    }));
  }

  const showField = (field: Parameters<typeof poiAttributeFieldVisible>[0]): boolean =>
    poiAttributeFieldVisible(field, form.category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back_to_dashboard')}
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canForceSeed ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSync()}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {t('sync_redis')}
            </Button>
          ) : null}
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('create')}
          </Button>
        </div>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Input
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder={t('search')}
        />
        <Select
          value={category}
          onValueChange={(value) => {
            setPage(1);
            setCategory(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {POI_DESTINATION_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="PUBLISHED">{t('published')}</SelectItem>
            <SelectItem value="DRAFT">{t('draft')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={planner}
          onValueChange={(value) => {
            setPage(1);
            setPlanner(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('planner')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="true">{t('planner_yes')}</SelectItem>
            <SelectItem value="false">{t('planner_no')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{t('count', { count: total })}</p>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">{t('name')}</th>
                <th className="px-3 py-2 font-medium">{t('city')}</th>
                <th className="px-3 py-2 font-medium">{t('category')}</th>
                <th className="px-3 py-2 font-medium">{t('status')}</th>
                <th className="px-3 py-2 font-medium">{t('planner')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t hover:bg-accent/40"
                  onClick={() => openEdit(row)}
                >
                  <td className="px-3 py-2 font-medium">{row.nameLabels.en}</td>
                  <td className="px-3 py-2">{row.city}</td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="px-3 py-2">
                    {row.status === 'PUBLISHED' ? t('published') : t('draft')}
                  </td>
                  <td className="px-3 py-2">
                    {row.usableInPlanner ? t('planner_yes') : t('planner_no')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 ? (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            {t('prev')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            {t('next')}
          </Button>
        </div>
      ) : null}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t('edit') : t('create')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('name_en')}</Label>
              <Input
                value={form.nameEn}
                onChange={(event) => setForm({ ...form, nameEn: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('name_hy')}</Label>
              <Input
                value={form.nameHy}
                onChange={(event) => setForm({ ...form, nameHy: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('name_ru')}</Label>
              <Input
                value={form.nameRu}
                onChange={(event) => setForm({ ...form, nameRu: event.target.value })}
              />
            </div>
            {!editing ? (
              <div className="space-y-1">
                <Label>{t('id')}</Label>
                <Input
                  value={form.id}
                  onChange={(event) => setForm({ ...form, id: event.target.value })}
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>{t('city')}</Label>
              <Input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('region')}</Label>
              <Input
                value={form.region}
                onChange={(event) => setForm({ ...form, region: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('latitude')}</Label>
              <Input
                value={form.latitude}
                onChange={(event) => setForm({ ...form, latitude: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('longitude')}</Label>
              <Input
                value={form.longitude}
                onChange={(event) => setForm({ ...form, longitude: event.target.value })}
              />
            </div>
            <FormNativeSelect
              id="poi-category"
              label={t('category')}
              value={form.category}
              onChange={(value) => setForm({ ...form, category: value })}
              options={POI_DESTINATION_CATEGORIES.map((item) => ({ value: item, label: item }))}
            />
            <FormNativeSelect
              id="poi-status"
              label={t('status')}
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value as 'DRAFT' | 'PUBLISHED' })}
              options={[
                { value: 'DRAFT', label: t('draft') },
                { value: 'PUBLISHED', label: t('published') },
              ]}
            />
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                checked={form.usableInPlanner}
                onCheckedChange={(value) => setForm({ ...form, usableInPlanner: value === true })}
              />
              <Label>{t('usable_in_planner')}</Label>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>{t('description_en')}</Label>
              <Textarea
                value={form.descEn}
                onChange={(event) => setForm({ ...form, descEn: event.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>{t('description_hy')}</Label>
              <Textarea
                value={form.descHy}
                onChange={(event) => setForm({ ...form, descHy: event.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>{t('description_ru')}</Label>
              <Textarea
                value={form.descRu}
                onChange={(event) => setForm({ ...form, descRu: event.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>{t('tags')}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {POI_PLANNER_TAGS.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant={form.tags.includes(tag) ? 'default' : 'outline'}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
            {showField('averageMealAmd') ? (
              <div className="space-y-1">
                <Label>{t('average_meal')}</Label>
                <Input
                  value={form.averageMealAmd}
                  onChange={(event) => setForm({ ...form, averageMealAmd: event.target.value })}
                />
              </div>
            ) : null}
            {showField('priceBand') ? (
              <FormNativeSelect
                id="poi-price-band"
                label={t('price_band')}
                value={form.priceBand || 'none'}
                onChange={(value) => setForm({ ...form, priceBand: value === 'none' ? '' : value })}
                options={[
                  { value: 'none', label: t('all') },
                  ...POI_PRICE_BANDS.map((band) => ({ value: band, label: band })),
                ]}
              />
            ) : null}
            {showField('typicalDurationMin') ? (
              <div className="space-y-1">
                <Label>{t('duration')}</Label>
                <Input
                  value={form.typicalDurationMin}
                  onChange={(event) => setForm({ ...form, typicalDurationMin: event.target.value })}
                />
              </div>
            ) : null}
            {showField('servesAlcohol') ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.servesAlcohol}
                  onCheckedChange={(value) => setForm({ ...form, servesAlcohol: value === true })}
                />
                <Label>{t('serves_alcohol')}</Label>
              </div>
            ) : null}
            {showField('openingHoursNote') ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>{t('hours')}</Label>
                <Input
                  value={form.openingHoursNote}
                  onChange={(event) => setForm({ ...form, openingHoursNote: event.target.value })}
                />
              </div>
            ) : null}
            {showField('website') ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>{t('website')}</Label>
                <Input
                  value={form.website}
                  onChange={(event) => setForm({ ...form, website: event.target.value })}
                />
              </div>
            ) : null}
            {showField('websiteMenu') ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>{t('website_menu')}</Label>
                <Input
                  value={form.websiteMenu}
                  onChange={(event) => setForm({ ...form, websiteMenu: event.target.value })}
                />
              </div>
            ) : null}
            {showField('phone') ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>{t('phone')}</Label>
                <Input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>
            ) : null}
          </div>
          {editing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('photos')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={suggesting}
                  onClick={() => void handleSuggestPhotos()}
                >
                  {suggesting ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                  )}
                  {t('photo_suggest')}
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {editing.photos.map((photo) => {
                  const border =
                    photo.status === 'APPROVED'
                      ? 'border-emerald-500'
                      : photo.status === 'REJECTED'
                        ? 'border-destructive opacity-50'
                        : 'border-amber-500';
                  return (
                    <div key={photo.id} className="w-24 space-y-1">
                      <div
                        className={`relative h-24 w-24 overflow-hidden rounded-md border-2 bg-muted ${border}`}
                      >
                        {photo.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                        <button
                          type="button"
                          className="absolute right-0 top-0 bg-black/60 p-0.5 text-white"
                          onClick={() => void handleDeletePhoto(photo.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p
                        className="truncate text-[10px] text-muted-foreground"
                        title={photo.attribution ?? ''}
                      >
                        {photo.attribution ?? t(`photo_status_${photo.status.toLowerCase()}`)}
                      </p>
                      {photo.status === 'PENDING_REVIEW' ? (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 flex-1 px-1"
                            disabled={photoBusyId === photo.id}
                            onClick={() => void handlePhotoStatus(photo.id, 'APPROVED')}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 flex-1 px-1"
                            disabled={photoBusyId === photo.id}
                            onClick={() => void handlePhotoStatus(photo.id, 'REJECTED')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {suggestions.length > 0 ? (
                <div className="space-y-1 rounded-md border border-border p-2">
                  <p className="text-xs text-muted-foreground">{t('photo_suggest_hint')}</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((url) => (
                      <button
                        key={url}
                        type="button"
                        className="relative h-16 w-16 overflow-hidden rounded border border-border disabled:opacity-50"
                        disabled={photoBusyId === url}
                        onClick={() => void handleImportSuggestion(url)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(event) => void handlePhoto(event.target.files?.[0])}
              />
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            {editing ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDelete(editing.id)}
              >
                {t('delete')}
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
