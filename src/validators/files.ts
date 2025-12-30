import { z } from 'zod';

export const uploadFileSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1).optional(),
});

