'use client';

import type { AdminHost } from '@repo/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AdminHostsTableProps {
  hosts: AdminHost[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  savingId: string | null;
  canEditFee: boolean;
  onPageChange: (page: number) => void;
  onSaveFee: (hostId: string, platformFeePercent: number | null) => Promise<void>;
}

function FeeEditor({
  host,
  canEdit,
  saving,
  onSave,
}: {
  host: AdminHost;
  canEdit: boolean;
  saving: boolean;
  onSave: (platformFeePercent: number | null) => Promise<void>;
}): React.JSX.Element {
  const t = useTranslations('admin.hosts');
  const [draft, setDraft] = useState(
    host.platformFeePercent === null ? '' : String(host.platformFeePercent),
  );
  const [dirty, setDirty] = useState(false);
  async function handleSave(): Promise<void> {
    const trimmed = draft.trim();
    try {
      if (trimmed === '') {
        await onSave(null);
        setDirty(false);
        toast.success(t('fee_cleared'));
        return;
      }
      const value = Number(trimmed);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        toast.error(t('fee_invalid'));
        return;
      }
      await onSave(value);
      setDirty(false);
      toast.success(t('fee_saved'));
    } catch {
      toast.error(t('fee_save_error'));
    }
  }
  async function handleClear(): Promise<void> {
    try {
      setDraft('');
      await onSave(null);
      setDirty(false);
      toast.success(t('fee_cleared'));
    } catch {
      toast.error(t('fee_save_error'));
    }
  }
  if (!canEdit) {
    return (
      <div className="text-sm">
        <span className="font-medium tabular-nums">{host.effectivePlatformFeePercent}%</span>
        {host.platformFeePercent === null ? (
          <span className="ml-1 text-xs text-muted-foreground">{t('using_default')}</span>
        ) : (
          <span className="ml-1 text-xs text-muted-foreground">{t('custom')}</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={draft}
          disabled={saving}
          onChange={(e) => {
            setDraft(e.target.value);
            setDirty(true);
          }}
          className="h-8 w-24"
          aria-label={t('table.platform_fee')}
          placeholder={String(host.defaultPlatformFeePercent)}
        />
        <span className="text-sm text-muted-foreground">%</span>
        <Button
          size="sm"
          variant="outline"
          disabled={saving || !dirty}
          onClick={() => void handleSave()}
        >
          {saving ? t('saving') : t('save')}
        </Button>
        {host.platformFeePercent !== null && (
          <Button size="sm" variant="ghost" disabled={saving} onClick={() => void handleClear()}>
            {t('clear')}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('effective', {
          percent: (() => {
            if (!dirty) return host.effectivePlatformFeePercent;
            if (draft.trim() === '') return host.defaultPlatformFeePercent;
            const n = Number(draft);
            return Number.isFinite(n) ? n : host.defaultPlatformFeePercent;
          })(),
        })}
        {host.platformFeePercent === null && !dirty
          ? ` · ${t('using_default_value', { percent: host.defaultPlatformFeePercent })}`
          : null}
      </p>
    </div>
  );
}

export function AdminHostsTable({
  hosts,
  isLoading,
  page,
  totalPages,
  total,
  savingId,
  canEditFee,
  onPageChange,
  onSaveFee,
}: AdminHostsTableProps): React.JSX.Element {
  const t = useTranslations('admin.hosts');
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  if (hosts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty_state')}</p>;
  }
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('table.host')}</TableHead>
            <TableHead>{t('table.email')}</TableHead>
            <TableHead>{t('table.type')}</TableHead>
            <TableHead>{t('table.properties')}</TableHead>
            <TableHead>{t('table.verified')}</TableHead>
            <TableHead>{t('table.platform_fee')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hosts.map((host) => (
            <TableRow key={host.id}>
              <TableCell className="font-medium">{host.displayName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{host.email}</TableCell>
              <TableCell className="text-sm">
                {host.hostType === 'COMPANY' ? t('type_company') : t('type_individual')}
              </TableCell>
              <TableCell className="tabular-nums">{host.propertyCount}</TableCell>
              <TableCell>
                <Badge variant={host.isVerified ? 'default' : 'secondary'}>
                  {host.isVerified ? t('verified_yes') : t('verified_no')}
                </Badge>
              </TableCell>
              <TableCell>
                <FeeEditor
                  key={`${host.id}-${host.platformFeePercent ?? 'default'}`}
                  host={host}
                  canEdit={canEditFee}
                  saving={savingId === host.id}
                  onSave={(value) => onSaveFee(host.id, value)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t('pagination.page_of', { page, totalPages, total })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
