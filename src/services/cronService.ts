import cron from 'node-cron';
import { logger } from '../config/logger';
import { refreshAqaraToken } from './aqaraDataService';
import prisma from '../config/prisma';

// Store all scheduled jobs
const jobs: Map<string, cron.ScheduledTask> = new Map();

/**
 * Set up the daily Aqara token refresh job
 * Runs at 00:01 every day
 */
function setupAqaraTokenRefreshJob(): void {
  // Schedule to run at 00:01 every day
  const job = cron.schedule('1 0 * * *', async () => {
    try {
      logger.info('Running Aqara token refresh cron job');
     const result = await refreshAqaraToken();
     await prisma.user.update({
    where: {
      id: "cmffdevpf0001ijp5xxxe85pf",
    },
    data: {
      refreshToken: result.refreshToken,
    },
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
 * Initialize all cron jobs
 */
export function initializeJobs(): void {
  setupAqaraTokenRefreshJob();
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