import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create built-in roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      builtIn: true,
      permissions: {
        'space.manage': true,
        'schema.admin': true,
        'entry.create': true,
        'entry.read': true,
        'entry.update': true,
        'entry.delete': true,
        'entry.publish': true,
        'asset.upload': true,
        'asset.delete': true,
        'webhook.manage': true,
        'token.manage': true,
        'user.manage': true,
      },
    },
  });

  const editorRole = await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: {
      name: 'editor',
      builtIn: true,
      permissions: {
        'entry.create': true,
        'entry.read': true,
        'entry.update': true,
        'entry.publish': true,
        'asset.upload': true,
      },
    },
  });

  const authorRole = await prisma.role.upsert({
    where: { name: 'author' },
    update: {},
    create: {
      name: 'author',
      builtIn: true,
      permissions: {
        'entry.create': true,
        'entry.read': true,
        'entry.update': true,
        'asset.upload': true,
      },
    },
  });

  await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: {
      name: 'viewer',
      builtIn: true,
      permissions: {
        'entry.read': true,
      },
    },
  });

  // Create default admin user
  const passwordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@htmless.com' },
    update: {},
    create: {
      email: 'admin@htmless.com',
      name: 'Admin',
      passwordHash,
    },
  });

  // Create default space
  const space = await prisma.space.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Space',
      slug: 'default',
    },
  });

  // Bind admin to space
  await prisma.roleBinding.upsert({
    where: {
      userId_roleId_spaceId: {
        userId: admin.id,
        roleId: adminRole.id,
        spaceId: space.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
      spaceId: space.id,
    },
  });

  // Create sample content type
  const articleType = await prisma.contentType.upsert({
    where: { spaceId_key: { spaceId: space.id, key: 'article' } },
    update: {},
    create: {
      spaceId: space.id,
      key: 'article',
      name: 'Article',
      description: 'Blog articles and posts',
    },
  });

  // Create fields for article
  const fields = [
    { key: 'title', name: 'Title', type: 'text', required: true, sortOrder: 0 },
    { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
    { key: 'excerpt', name: 'Excerpt', type: 'text', required: false, sortOrder: 2 },
    { key: 'body', name: 'Body', type: 'richtext', required: true, sortOrder: 3 },
    { key: 'featuredImage', name: 'Featured Image', type: 'media', required: false, sortOrder: 4 },
  ];

  for (const field of fields) {
    await prisma.field.upsert({
      where: { contentTypeId_key: { contentTypeId: articleType.id, key: field.key } },
      update: {},
      create: {
        contentTypeId: articleType.id,
        ...field,
      },
    });
  }

  console.log('Seed complete:');
  console.log(`  Roles: admin, editor, author, viewer`);
  console.log(`  User: admin@htmless.com (password: admin123)`);
  console.log(`  Space: ${space.slug} (${space.id})`);
  console.log(`  Content Type: article with ${fields.length} fields`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
