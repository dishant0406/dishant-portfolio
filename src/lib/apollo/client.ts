import { ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client';

import { env } from '@/lib/env';

export function getClient(): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: env.HASHNODE_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',   // 👈 tells Hashnode CDN to not serve cached
        'Pragma': 'no-cache',          // 👈 legacy HTTP/1.0 fallback
        ...(env.HASHNODE_PAT ? { Authorization: env.HASHNODE_PAT } : {}),
      },
      fetchOptions: {
        cache: 'no-store',
      },
    }),
    ssrMode: true, // always true — this is server-only code
    defaultOptions: {
      query: { fetchPolicy: 'no-cache', errorPolicy: 'all' },
    },
  });
}
