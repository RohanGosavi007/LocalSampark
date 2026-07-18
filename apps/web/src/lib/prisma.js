// Mock Prisma Client to bypass Next.js build errors since the frontend API routes are stubbed out and the real backend is on Express (localhost:5000)
export const prisma = {
  shop: { findMany: async () => [], findUnique: async () => null },
  product: { findMany: async () => [] },
  category: { findMany: async () => [] },
};
