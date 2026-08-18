import type { Response } from 'express';

// Shared by every admin CSV-export endpoint (students/employers/internship-
// requests) so the response headers are set consistently in one place.
export function sendCsv(res: Response, csv: string, filename: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}
