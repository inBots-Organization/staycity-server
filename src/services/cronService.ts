import cron from 'node-cron';
import { logger } from '../config/logger';
import { refreshAqaraToken } from './aqaraDataService';
import  AranetDataService  from './aranetDataService';
import prisma from '../config/prisma';
import { logAllPresence } from './presenceLogger';

const jobs: Map<string, cron.ScheduledTask> = new Map();

/**
 * Aqara token refresh (runs every 5 minutes)
 */
function setupAqaraTokenRefreshJob(): void {
  const job = cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running Aqara token refresh cron job');
      const result = await refreshAqaraToken();
      console.log("result",result)
      await prisma.user.updateMany({
        data: { refreshToken: result.refreshToken ,accessToken: result.accessToken},
      });
      logger.info('Aqara token refresh completed successfully');
    } catch (error) {
      logger.error('Error refreshing Aqara token:', error);
    }
  });

  jobs.set('aqaraTokenRefresh', job);
  logger.info('Aqara token refresh job scheduled');
}

/**
 * Aranet daily logs job (runs every day at 00:15)
 * Fetches and saves logs for the previous day
 */
function setupAranetDailyLogsJob(): void {
  // “15 0 * * *” → run at 00:15 every day
  const job = cron.schedule('15 0 * * *', async () => {
    try {
      logger.info('Running Aranet daily logs cron job');

      // Calculate time range: from yesterday 00:00 to yesterday 23:59
      const to = new Date();
      to.setHours(0, 0, 0, 0); // today at 00:00
      const from = new Date(to);
      from.setDate(from.getDate() - 1); // previous day start

      const service = new AranetDataService();
      const devices = await prisma.device.findMany({
        where: { provider: 'aranet' },
      });

      const allLogs: Record<string, any[]> = {};

      for (const device of devices) {
        const sensorId = device.externalId;
        if (!sensorId) continue;

        const metrics =
          device.deviceType === 'POWER'
            ? [process.env.POWER_METRES_ID]
            : ['1', '2', '3', '4'];

        allLogs[sensorId] = [];

        for (const metric of metrics) {
          try {
            const logs = await service.getHestory(
              sensorId,
              metric,
              from.toISOString(),
              to.toISOString()
            );
            allLogs[sensorId].push({
              metric,
              readings: logs.readings || [],
            });
          } catch (err) {
            logger.error(`Failed to fetch logs for ${sensorId} - metric ${metric}:`, err);
          }
        }
      }

      const allReadings = Object.values(allLogs)
        .flatMap(metrics => metrics.flatMap(m => m.readings));

      if (allReadings.length > 0) {
        await prisma.logs.createMany({ data: allReadings });
        logger.info(`Inserted ${allReadings.length} Aranet readings`);
      } else {
        logger.info('No Aranet readings found for the previous day');
      }

      logger.info('Aranet daily logs cron job completed successfully');
    } catch (error) {
      logger.error('Error in Aranet daily logs cron job:', error);
    }
  });

  jobs.set('aranetDailyLogs', job);
  logger.info('Aranet daily logs job scheduled');
}

/**
 * Initialize all cron jobs
 */
export function initializeJobs(): void {
  setupAqaraTokenRefreshJob();
  setupAranetDailyLogsJob();
  // setupPresenceLoggingJob();
  logger.info('All cron jobs initialized');
}

/**
 * Stop all running cron jobs
 */
export function stopAllJobs(): void {
  jobs.forEach((job, name) => {
    job.stop();
    logger.info(`Stopped cron job: ${name}`);
  });
}

/**
 * Presence logging job (runs every 2 minutes)
 * Fetches presence values for all motion sensors and stores them in PresenceLog
 */
// function setupPresenceLoggingJob(): void {
//   const job = cron.schedule('*/1 * * * *', async () => {
//     try {
//       logger.info('Running presence logging cron job');
//       const summary = await logAllPresence();
//       logger.info(
//         `Presence logging completed. Inserted: ${summary.inserted}, Failed: ${summary.failed}, Total: ${summary.total}`
//       );
//       if (summary.failed && summary.details?.length) {
//         summary.details.forEach((d: any) =>
//           logger.error(`Presence log failure for device ${d.deviceId || 'unknown'}: ${d.reason}`)
//         );
//       }
//     } catch (error) {
//       logger.error('Error in presence logging cron job:', error);
//     }
//   });

//   jobs.set('presenceLogging', job);
//   logger.info('Presence logging job scheduled');
// }
