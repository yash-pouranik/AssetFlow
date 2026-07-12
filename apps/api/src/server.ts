import { env } from './config/env';
import { logger } from './shared/logger/winston';
import { prisma } from './shared/prisma/client';
import { notificationService } from './modules/notifications/notification.service';
import app from './app';
import { startCronJobs } from './shared/cron/cronJobs';

const PORT = parseInt(env.PORT);

async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Initialize EventBus listeners
    notificationService.init();
    logger.info('✅ Event listeners registered');

    // Start cron jobs
    startCronJobs();
    logger.info('✅ Cron jobs started');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 AssetFlow API running on http://localhost:${PORT}`);
      logger.info(`📚 Swagger docs: http://localhost:${PORT}/api/docs`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { err });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();
