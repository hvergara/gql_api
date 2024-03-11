/* eslint-disable */
/* @ts-nocheck */
/* prettier-ignore */
/* This file is automatically generated using `npm run graphql:types` */
import type * as Types from '../../../../generated/types';

import type { JsonObject } from "type-fest";
import gql from 'graphql-tag';
export type CommunityQueryVariables = Types.Exact<{
  communityID: Types.Scalars['String']['input'];
}>;


export type CommunityQuery = { __typename?: 'Query', community: { __typename?: 'Community', description: string | null, id: string, name: string | null, status: Types.CommnunityStatus } | null };


export const Community = gql`
    query Community($communityID: String!) {
  community(id: $communityID) {
    description
    id
    name
    status
  }
}
    `;