const cron = require('node-cron');
const expiryService = require('../services/expiryService');
const JobExecution = require('../models/JobExecution');

let cronTask = null;

const runExpiryProcessing = async () => {
  const startTime = Date.now();
  try {
    const result = await expiryService.processExpiryForAllStores();
    const duration = Date.now() - startTime;
    const records = result ? (result.totalBatchesProcessed || 0) : 0;

    await JobExecution.findOneAndUpdate(
      { jobName: 'EXPIRY_MONITORING' },
      {
        $set: {
          lastStartedAt: new Date(startTime),
          lastCompletedAt: new Date(),
          lastStatus: 'HEALTHY',
          lastDurationMs: duration,
          recordsProcessed: records,
          lastError: null
        }
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[SmartShelf] Expiry Job execution error:', err.message);

    try {
      await JobExecution.findOneAndUpdate(
        { jobName: 'EXPIRY_MONITORING' },
        {
          $set: {
            lastStartedAt: new Date(startTime),
            lastCompletedAt: new Date(),
            lastStatus: 'ERROR',
            lastDurationMs: duration,
            lastError: err.message
          }
        },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      console.error('[SmartShelf] Failed to record JobExecution error:', dbErr.message);
    }
  }
};

const startExpiryJob = () => {
  if (cronTask) {
    console.log('[SmartShelf] Expiry scheduler already running.');
    return cronTask;
  }

  // Schedule to run every hour at minute 0 ("0 * * * *")
  cronTask = cron.schedule('0 * * * *', async () => {
    await runExpiryProcessing();
  });

  // Initial execution record on startup
  runExpiryProcessing().catch(() => {});

  console.log('[SmartShelf] Expiry monitoring scheduler started.');
  return cronTask;
};

module.exports = {
  startExpiryJob,
  runExpiryProcessing
};
