import { z } from 'zod';
import { insertSaleSchema, sales, forecasts } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  sales: {
    list: {
      method: 'GET' as const,
      path: '/api/sales',
      responses: {
        200: z.array(z.custom<typeof sales.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sales',
      input: insertSaleSchema,
      responses: {
        201: z.custom<typeof sales.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    bulkCreate: {
      method: 'POST' as const,
      path: '/api/sales/bulk',
      input: z.array(insertSaleSchema),
      responses: {
        201: z.object({ count: z.number() }),
        400: errorSchemas.validation,
      },
    },
    clear: {
      method: 'POST' as const,
      path: '/api/sales/clear',
      input: z.object({}),
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  forecasts: {
    generate: {
      method: 'POST' as const,
      path: '/api/forecasts/generate',
      input: z.object({ 
        months: z.number().min(1).max(24),
        method: z.enum(['regression', 'moving_average', 'seasonality']).default('regression')
      }),
      responses: {
        200: z.array(z.custom<typeof forecasts.$inferSelect>()),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/forecasts',
      responses: {
        200: z.array(z.custom<typeof forecasts.$inferSelect>()),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
