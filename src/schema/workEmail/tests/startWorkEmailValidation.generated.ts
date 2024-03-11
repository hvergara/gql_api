/* eslint-disable */
/* @ts-nocheck */
/* prettier-ignore */
/* This file is automatically generated using `npm run graphql:types` */
import type * as Types from '../../../generated/types';

import type { JsonObject } from "type-fest";
import gql from 'graphql-tag';
export type StartWorkEmailValidationMutationVariables = Types.Exact<{
  email: Types.Scalars['String']['input'];
}>;


export type StartWorkEmailValidationMutation = { __typename?: 'Mutation', startWorkEmailValidation: { __typename: 'WorkEmail', id: string, isValidated: boolean } };


export const StartWorkEmailValidation = gql`
    mutation StartWorkEmailValidation($email: String!) {
  startWorkEmailValidation(email: $email) {
    __typename
    id
    isValidated
  }
}
    `;