/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  apiLogger: { info: vi.fn(), error: vi.fn() },
}));

// We test the query logic by checking what Prisma receives
// The page component calls prisma.item.findMany + prisma.item.count

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

const fakeItem = {
  id: 'item-1',
  title: 'Камера Sony',
  description: 'Профессиональная камера',
  category: 'electronics',
  pricePerDay: 3000,
  photos: ['photo.jpg'],
  address: 'Москва',
  status: 'approved',
  rating: 4.5,
  createdAt: new Date(),
  owner: { name: 'Тест', rating: 4.5 },
};

describe('Catalog pagination logic', () => {
  it('page=1 → skip=0, take=24', async () => {
    prismaMock.item.findMany.mockResolvedValue([fakeItem]);
    prismaMock.item.count.mockResolvedValue(100);

    // Import after mocks are set up
    const { default: CatalogPage } = await import('@/app/catalog/page');
    await CatalogPage({ searchParams: Promise.resolve({ page: '1' }) });

    const findCall = prismaMock.item.findMany.mock.calls[0][0];
    expect(findCall.skip).toBe(0);
    expect(findCall.take).toBe(24);
  });

  it('page=2 → skip=24', async () => {
    prismaMock.item.findMany.mockResolvedValue([fakeItem]);
    prismaMock.item.count.mockResolvedValue(100);

    const { default: CatalogPage } = await import('@/app/catalog/page');
    await CatalogPage({ searchParams: Promise.resolve({ page: '2' }) });

    const findCall = prismaMock.item.findMany.mock.calls[0][0];
    expect(findCall.skip).toBe(24);
    expect(findCall.take).toBe(24);
  });

  it('page=5 → skip=96', async () => {
    prismaMock.item.findMany.mockResolvedValue([]);
    prismaMock.item.count.mockResolvedValue(200);

    const { default: CatalogPage } = await import('@/app/catalog/page');
    await CatalogPage({ searchParams: Promise.resolve({ page: '5' }) });

    const findCall = prismaMock.item.findMany.mock.calls[0][0];
    expect(findCall.skip).toBe(96);
  });

  it('invalid page defaults to page 1 (skip=0)', async () => {
    prismaMock.item.findMany.mockResolvedValue([fakeItem]);
    prismaMock.item.count.mockResolvedValue(10);

    const { default: CatalogPage } = await import('@/app/catalog/page');
    await CatalogPage({ searchParams: Promise.resolve({ page: 'abc' }) });

    const findCall = prismaMock.item.findMany.mock.calls[0][0];
    expect(findCall.skip).toBe(0);
  });

  it('category filter is applied to query', async () => {
    prismaMock.item.findMany.mockResolvedValue([fakeItem]);
    prismaMock.item.count.mockResolvedValue(5);

    const { default: CatalogPage } = await import('@/app/catalog/page');
    await CatalogPage({ searchParams: Promise.resolve({ category: 'electronics', page: '1' }) });

    const findCall = prismaMock.item.findMany.mock.calls[0][0];
    expect(findCall.where.category).toBe('electronics');
    expect(findCall.where.status).toBe('approved');
  });

  it('count is called with same where as findMany', async () => {
    prismaMock.item.findMany.mockResolvedValue([]);
    prismaMock.item.count.mockResolvedValue(0);

    const { default: CatalogPage } = await import('@/app/catalog/page');
    await CatalogPage({ searchParams: Promise.resolve({ category: 'sports', q: 'вело' }) });

    const findWhere = prismaMock.item.findMany.mock.calls[0][0].where;
    const countWhere = prismaMock.item.count.mock.calls[0][0].where;
    expect(countWhere).toEqual(findWhere);
  });
});

describe('Catalog generateMetadata', () => {
  it('includes category and page in title', async () => {
    const { generateMetadata } = await import('@/app/catalog/page');
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ category: 'electronics', page: '2' }),
    });
    expect(meta.title).toContain('Электроника');
    expect(meta.title).toContain('страница 2');
  });

  it('page 1 has no page number in title', async () => {
    const { generateMetadata } = await import('@/app/catalog/page');
    const meta = await generateMetadata({
      searchParams: Promise.resolve({}),
    });
    expect(meta.title).not.toContain('страница');
  });

  it('noindex for pages > 10', async () => {
    const { generateMetadata } = await import('@/app/catalog/page');
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ page: '11' }),
    });
    expect((meta.robots as any).index).toBe(false);
  });

  it('index for pages <= 10', async () => {
    const { generateMetadata } = await import('@/app/catalog/page');
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ page: '3' }),
    });
    expect((meta.robots as any).index).toBe(true);
  });
});
