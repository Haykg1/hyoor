import { BadRequestException } from '@nestjs/common';
import { BULK_IMPORT_FILE_MAX_BYTES, BULK_IMPORT_MAX_ROWS } from '@repo/shared';
import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export type RawRow = Record<string, string>;

export function parseSpreadsheet(buffer: Buffer, mimeType: string, originalName: string): RawRow[] {
  if (buffer.length > BULK_IMPORT_FILE_MAX_BYTES) {
    throw new BadRequestException('File exceeds 2 MB limit');
  }
  const ext = originalName.toLowerCase().split('.').pop();
  const isXlsx =
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ext === 'xlsx' ||
    ext === 'xls';
  const isCsv = mimeType === 'text/csv' || mimeType === 'text/plain' || ext === 'csv';
  if (!isXlsx && !isCsv) {
    throw new BadRequestException('Only .csv and .xlsx files are accepted');
  }
  const rows: RawRow[] = isXlsx ? parseXlsx(buffer) : parseCsvBuffer(buffer);
  if (rows.length === 0) {
    throw new BadRequestException('File contains no data rows');
  }
  if (rows.length > BULK_IMPORT_MAX_ROWS) {
    throw new BadRequestException(`File exceeds ${BULK_IMPORT_MAX_ROWS} row limit`);
  }
  return rows;
}

function parseXlsx(buffer: Buffer): RawRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '', raw: false });
  return raw.map(normalizeRowKeys);
}

function parseCsvBuffer(buffer: Buffer): RawRow[] {
  const raw = parseCsv(buffer.toString('utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawRow[];
  return raw.map(normalizeRowKeys);
}

function normalizeRowKeys(row: RawRow): RawRow {
  const result: RawRow = {};
  for (const [k, v] of Object.entries(row)) {
    result[k.trim().toLowerCase().replace(/\s+/g, '_')] = String(v ?? '').trim();
  }
  return result;
}
