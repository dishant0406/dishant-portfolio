import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

import { env } from '@/lib/env';

const HASHNODE_API_URL = 'https://gql.hashnode.com';

export function getClient(): ApolloClient {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: HASHNODE_API_URL,
      headers: {
        'Content-Type': 'application/json',
        ...(env.HASHNODE_PAT ? { Authorization: env.HASHNODE_PAT } : {}),
      },
      fetchOptions: {
        cache: 'no-store',
      },
    }),
    ssrMode: typeof window === 'undefined',
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      },
    },
  });
}
