const cron = require('node-cron');
const orderService = require('../services/orderService');
const JobExecution = require('../models/JobExecution');

let cronTask = null;

const runReservationCleanup = async () => {
  const startTime = Date.now();
  try {
    const result = await orderService.expireReservations();
    const duration = Date.now() - startTime;
    const records = result ? (result.expiredCount || 0) : 0;

    await JobExecution.findOneAndUpdate(
      { jobName: 'RESERVATION_CLEANUP' },
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
    console.error('[SmartShelf Reservation Job] Cron execution error:', err.message);

    try {
      await JobExecution.findOneAndUpdate(
        { jobName: 'RESERVATION_CLEANUP' },
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

const startReservationJob = () => {
  if (cronTask) {
    console.log('[SmartShelf] Reservation expiry scheduler already running.');
    return cronTask;
  }

  // Schedule to run every 5 minutes ("*/5 * * * *")
  cronTask = cron.schedule('*/5 * * * *', async () => {
    await runReservationCleanup();
  });

  // Initial execution record on startup
  runReservationCleanup().catch(() => {});

  console.log('[SmartShelf] Reservation expiry scheduler started (Every 5 mins).');
  return cronTask;
};

module.exports = {
  startReservationJob,
  runReservationCleanup
};
