import { it, describe, assert, afterEach } from "vitest";
import { executeGraphqlOperation, insertCommunity } from "~/tests/__fixtures";
import { clearDatabase } from "~/tests/__fixtures/databaseHelper";
import {
  GetCommunities,
  GetCommunitiesQuery,
  GetCommunitiesQueryVariables,
} from "~/tests/community/getCommunities.generated";
import {
  GetCommunity,
  GetCommunityQuery,
  GetCommunityQueryVariables,
} from "~/tests/community/getCommunity.generated";
import { CommnunityStatus } from "~/generated/types";

afterEach(() => {
  clearDatabase();
});

describe("Communities", () => {
  it("Should return an unfiltered list", async () => {
    const community1 = await insertCommunity();
    const community2 = await insertCommunity();
    const community3 = await insertCommunity();
    const response = await executeGraphqlOperation<
      GetCommunitiesQuery,
      GetCommunitiesQueryVariables
    >({
      document: GetCommunities,
    });
    response;

    assert.equal(response.errors, undefined);
    assert.equal(response.data?.communities.length, 3);
    assert.equal(response.data?.communities[0].id, community1.id);
    assert.equal(response.data?.communities[1].id, community2.id);
    assert.equal(response.data?.communities[2].id, community3.id);
  });
  it("Should return a filtered list by id", async () => {
    const community1 = await insertCommunity();
    await insertCommunity();
    const response = await executeGraphqlOperation<
      GetCommunitiesQuery,
      GetCommunitiesQueryVariables
    >({
      document: GetCommunities,
      variables: {
        communityName: null,
        communityStatus: null,
        communityID: community1.id,
      },
    });

    assert.equal(response.errors, undefined);
    assert.equal(response.data?.communities.length, 1);
    assert.equal(response.data?.communities[0].id, community1.id);
  });
  it("Should return a filtered list by name", async () => {
    const community1 = await insertCommunity({
      name: "Community 1",
    });
    const community2 = await insertCommunity({
      name: "Community 2",
    });
    await insertCommunity({
      name: "COMPLETELY_NON_RELATED_NAME",
    });
    const response = await executeGraphqlOperation<
      GetCommunitiesQuery,
      GetCommunitiesQueryVariables
    >({
      document: GetCommunities,
      variables: {
        communityID: null,
        communityStatus: null,
        communityName: "COMMUNITY",
      },
    });

    assert.equal(response.errors, undefined);
    assert.equal(response.data?.communities.length, 2);
    assert.equal(response.data?.communities[0].id, community1.id);
    assert.equal(response.data?.communities[1].id, community2.id);
  });
  it("Should return a filtered list by status", async () => {
    const community1 = await insertCommunity();
    const community2 = await insertCommunity();
    const community3 = await insertCommunity({
      status: "inactive",
    });
    const response = await executeGraphqlOperation<
      GetCommunitiesQuery,
      GetCommunitiesQueryVariables
    >({
      document: GetCommunities,
      variables: {
        communityID: null,
        communityName: null,
        communityStatus: CommnunityStatus.Inactive,
      },
    });
    assert.equal(response.errors, undefined);
    assert.equal(response.data?.communities.length, 1);
    assert.equal(response.data?.communities[0].id, community3.id);
    const response2 = await executeGraphqlOperation<
      GetCommunitiesQuery,
      GetCommunitiesQueryVariables
    >({
      document: GetCommunities,
      variables: {
        communityID: null,
        communityName: null,
        communityStatus: CommnunityStatus.Active,
      },
    });

    assert.equal(response2.errors, undefined);
    assert.equal(response2.data?.communities.length, 2);
    assert.equal(response2.data?.communities[0].id, community1.id);
    assert.equal(response2.data?.communities[1].id, community2.id);
  });
  it("Should do multiple filters", async () => {
    await insertCommunity({
      name: "Community 1",
      status: "active",
    });
    await insertCommunity({
      name: "Community 2",
      status: "inactive",
    });
    const community3 = await insertCommunity({
      name: "RANDOM_NAME",
      status: "inactive",
    });
    const response = await executeGraphqlOperation<
      GetCommunitiesQuery,
      GetCommunitiesQueryVariables
    >({
      document: GetCommunities,
      variables: {
        communityID: null,
        communityStatus: CommnunityStatus.Inactive,
        communityName: "RANDOM",
      },
    });
    assert.equal(response.errors, undefined);
    assert.equal(response.data?.communities.length, 1);
    assert.equal(response.data?.communities[0].id, community3.id);
  });
});

describe("Community search", () => {
  it("Should error if called without arguments", async () => {
    await insertCommunity();
    await insertCommunity();
    const response = await executeGraphqlOperation<
      GetCommunityQuery,
      GetCommunityQueryVariables
    >({
      document: GetCommunity,
    });

    assert.exists(response.errors);
    assert.equal(response.errors?.length, 1);
  });
  it("Should filter by a community ID", async () => {
    const community1 = await insertCommunity();
    await insertCommunity();
    const response = await executeGraphqlOperation<
      GetCommunityQuery,
      GetCommunityQueryVariables
    >({
      document: GetCommunity,
      variables: {
        communityID: community1.id,
      },
    });
    assert.equal(response.errors, undefined);
    assert.deepEqual(response.data?.community, {
      description: community1.description,
      id: community1.id,
      name: community1.name,
      status: community1.status,
    });
  });
  it("Should return null on a non-existing id", async () => {
    await insertCommunity();
    await insertCommunity();
    const response = await executeGraphqlOperation<
      GetCommunityQuery,
      GetCommunityQueryVariables
    >({
      document: GetCommunity,
      variables: {
        communityID: "some-non-existing-id",
      },
    });

    assert.equal(response.errors, undefined);
    assert.equal(response.data?.community, null);
  });
});