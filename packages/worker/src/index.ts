import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const POLL_INTERVAL = 30_000; // 30 seconds

async function processScheduledEntries() {
  const now = new Date();

  const scheduledStates = await prisma.entryState.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: now },
    },
    include: {
      entry: true,
    },
  });

  for (const state of scheduledStates) {
    try {
      const draftVersion = await prisma.entryVersion.findUnique({
        where: { id: state.draftVersionId },
      });

      if (!draftVersion) {
        console.error(`Scheduled entry ${state.entryId}: draft version not found, skipping`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        // Create published version from draft data
        const publishedVersion = await tx.entryVersion.create({
          data: {
            entryId: state.entryId,
            kind: 'published',
            data: draftVersion.data as object,
            etag: `sched_${Date.now()}`,
            createdById: draftVersion.createdById,
          },
        });

        // Update state to published
        await tx.entryState.update({
          where: { entryId: state.entryId },
          data: {
            status: 'published',
            publishedVersionId: publishedVersion.id,
            scheduledAt: null,
          },
        });

        await tx.entry.update({ where: { id: state.entryId }, data: {} });
      });

      console.log(`Published scheduled entry: ${state.entryId} (slug: ${state.entry.slug})`);
    } catch (err) {
      console.error(`Failed to publish scheduled entry ${state.entryId}:`, err);
    }
  }

  if (scheduledStates.length > 0) {
    console.log(`Processed ${scheduledStates.length} scheduled entries`);
  }
}

async function processScheduledUnpublishes() {
  const now = new Date();

  const scheduledStates = await prisma.entryState.findMany({
    where: {
      status: 'published',
      scheduledUnpublishAt: { lte: now },
    },
    include: {
      entry: true,
    },
  });

  for (const state of scheduledStates) {
    try {
      await prisma.$transaction(async (tx) => {
        // Update state to draft and clear scheduled unpublish
        await tx.entryState.update({
          where: { entryId: state.entryId },
          data: {
            status: 'draft',
            publishedVersionId: null,
            scheduledUnpublishAt: null,
          },
        });

        await tx.entry.update({ where: { id: state.entryId }, data: {} });
      });

      // Remove from published_documents
      await prisma.publishedDocument.deleteMany({
        where: { entryId: state.entryId },
      });

      console.log(`Unpublished scheduled entry: ${state.entryId} (slug: ${state.entry.slug})`);
    } catch (err) {
      console.error(`Failed to unpublish scheduled entry ${state.entryId}:`, err);
    }
  }

  if (scheduledStates.length > 0) {
    console.log(`Processed ${scheduledStates.length} scheduled unpublishes`);
  }
}

async function start() {
  await prisma.$connect();
  console.log('HTMLess Worker started');
  console.log(`  Polling for scheduled entries every ${POLL_INTERVAL / 1000}s`);

  // Initial run
  await processScheduledEntries();
  await processScheduledUnpublishes();

  // Poll
  setInterval(processScheduledEntries, POLL_INTERVAL);
  setInterval(processScheduledUnpublishes, POLL_INTERVAL);
}

start().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
