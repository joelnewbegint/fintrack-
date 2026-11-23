import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { buildWorkbook, emailBackup, getISTDateString, getFullBackupData } from '../services/backupService.js';

const router = express.Router();

/**
 * GET /api/backup/excel
 * Manual download of the full database Excel workbook.
 * Protected: JWT auth required, role must be 'owner'.
 */
router.get('/excel', protect, restrictTo('owner'), async (req, res) => {
  try {
    const istDate = getISTDateString();
    const filename = `VK-Backup-${istDate}.xlsx`;

    console.log(`[BackupRoute] Owner (${req.user?.name || req.user?._id}) requested manual Excel backup download...`);
    const workbook = await buildWorkbook();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ [BackupRoute] Error generating manual Excel backup:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate Excel backup',
        error: err.message,
      });
    }
  }
});

/**
 * GET /api/backup/data
 * Returns complete database collections as structured JSON for the formal Master PDF report.
 * Protected: JWT auth required, role must be 'owner'.
 */
router.get('/data', protect, restrictTo('owner'), async (req, res) => {
  try {
    console.log(`[BackupRoute] Owner (${req.user?.name || req.user?._id}) requested full backup data extract...`);
    const data = await getFullBackupData();
    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ [BackupRoute] Error extracting full backup data:', err);
    res.status(500).json({ success: false, message: 'Failed to extract backup data', error: err.message });
  }
});

/**
 * POST /api/backup/email-now
 * Manual on-demand email trigger for Owners from the Web UI or API.
 * Protected: JWT auth required, role must be 'owner'.
 */
router.post('/email-now', protect, restrictTo('owner'), async (req, res) => {
  try {
    console.log(`[BackupRoute] Owner (${req.user?.name || req.user?._id}) triggered instant email backup...`);
    const result = await emailBackup();
    return res.status(200).json({
      success: true,
      message: 'Full database backup generated and sent to email successfully!',
      result,
    });
  } catch (err) {
    console.error('❌ [BackupRoute] Error sending instant email backup:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate or email database backup: ' + err.message,
      error: err.message,
    });
  }
});

/**
 * POST /api/backup/run
 * Automated backup endpoint invoked by external cron (e.g. cron-job.org).
 * Protected: Header 'x-cron-key' must match process.env.CRON_KEY.
 */
router.post('/run', async (req, res) => {
  try {
    const cronKey = req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_KEY;

    if (!expectedKey || !cronKey || cronKey.trim() !== expectedKey.trim()) {
      return res.status(401).json({
        ok: false,
        message: 'Unauthorized: Invalid or missing x-cron-key header',
      });
    }

    console.log('[BackupRoute] Authorized cron job trigger received. Executing email backup...');
    const result = await emailBackup();

    return res.status(200).json({
      ok: true,
      message: 'Full database backup generated and sent to email successfully',
      result,
    });
  } catch (err) {
    console.error('❌ [BackupRoute] Error running cron email backup:', err);
    return res.status(500).json({
      ok: false,
      message: 'Failed to generate or email database backup',
      error: err.message,
    });
  }
});

export default router;

