import { z } from 'zod';

export const fileDataSchema = z.object({
  username: z.string(),
  bodyAsBase64: z.string(),
})

export type FileData = z.infer<typeof fileDataSchema>;
