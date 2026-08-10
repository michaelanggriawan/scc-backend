import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
// Marks a route as reachable without a JWT (landing pages, tokenized payment links, auth endpoints).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
