import cron from 'node-cron';
import config from '../config';

/**
 * Job scheduler using node-cron
 * Coordinates polling jobs for launches, TLEs, and weather data
 * TODO: Add job result logging
 * TODO: Add job failure handling and retry logic
 * TODO: Implement health checks for jobs
 */

interface ScheduledJob {
  name: string;
  task: () => Promise<void>;
  schedule: string; // cron expression
  cronJob?: cron.ScheduledTask;
}

const jobs: ScheduledJob[] = [];

/**
 * Register a new job
 */
export function registerJob(name: string, task: () => Promise<void>, intervalSeconds: number): void {
  // Convert interval in seconds to cron expression
  // For intervals < 60s, use setInterval instead
  if (intervalSeconds < 60) {
    // TODO: Use setInterval for sub-minute intervals
    console.log(`[Scheduler] Job "${name}" interval ${intervalSeconds}s is less than 1 minute, using setInterval`);
    setInterval(async () => {
      try {
        console.log(`[Scheduler] Running job: ${name}`);
        await task();
      } catch (error) {
        console.error(`[Scheduler] Job "${name}" failed:`, error);
      }
    }, intervalSeconds * 1000);
    return;
  }

  // Build cron expression for regular intervals
  const minutes = Math.floor(intervalSeconds / 60);
  const cronExpression = `*/${minutes} * * * *`; // Every N minutes

  const job: ScheduledJob = {
    name,
    task,
    schedule: cronExpression,
  };

  jobs.push(job);
  console.log(`[Scheduler] Registered job "${name}" with schedule: ${cronExpression}`);
}

/**
 * Start all scheduled jobs
 */
export function startScheduler(): void {
  console.log('[Scheduler] Starting job scheduler...');

  for (const job of jobs) {
    try {
      job.cronJob = cron.schedule(job.schedule, async () => {
        try {
          console.log(`[Scheduler] Running job: ${job.name}`);
          const startTime = Date.now();
          await job.task();
          const duration = Date.now() - startTime;
          console.log(`[Scheduler] Job "${job.name}" completed in ${duration}ms`);
        } catch (error) {
          console.error(`[Scheduler] Job "${job.name}" failed:`, error);
          // TODO: Implement retry logic
          // TODO: Log to monitoring service
        }
      });

      console.log(`[Scheduler] Started job: ${job.name}`);
    } catch (error) {
      console.error(`[Scheduler] Failed to start job "${job.name}":`, error);
    }
  }

  console.log(`[Scheduler] Started ${jobs.length} jobs`);
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler(): void {
  console.log('[Scheduler] Stopping job scheduler...');

  for (const job of jobs) {
    if (job.cronJob) {
      job.cronJob.stop();
      console.log(`[Scheduler] Stopped job: ${job.name}`);
    }
  }

  console.log('[Scheduler] All jobs stopped');
}

/**
 * Get status of all jobs
 */
export function getJobStatus(): Array<{ name: string; schedule: string; running: boolean }> {
  return jobs.map((job) => ({
    name: job.name,
    schedule: job.schedule,
    running: job.cronJob ? (job.cronJob as unknown as Record<string, unknown>)._task !== null : false,
  }));
}

export default {
  registerJob,
  startScheduler,
  stopScheduler,
  getJobStatus,
};
