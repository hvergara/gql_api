import { it, describe, assert, afterEach } from "vitest";
import {
  executeGraphqlOperation,
  insertEvent,
  insertTag,
  insertEventTag,
  insertCommunity,
  insertEventToCommunity,
} from "~/tests/__fixtures";
import { clearDatabase } from "~/tests/__fixtures/databaseHelper";
import { Event, EventQuery, EventQueryVariables } from "./event.generated";
import { Events, EventsQuery, EventsQueryVariables } from "./events.generated";
import { EventStatus, EventVisibility } from "generated/types";

afterEach(() => {
  clearDatabase();
});

describe("Event", () => {
  it("Should find an event by ID", async () => {
    const event1 = await insertEvent();
    const response = await executeGraphqlOperation<
      EventQuery,
      EventQueryVariables
    >({
      document: Event,
      variables: {
        eventId: event1.id,
      },
    });
    assert.equal(response.errors, undefined);
    assert.deepEqual(response.data?.event, {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
      community: null,
      tags: [],
      users: [],
    } as EventQuery["event"]);
  });
  it("Should get an event Tags", async () => {
    const event1 = await insertEvent();
    const tag1 = await insertTag({
      name: "TAG 1",
    });
    const tag2 = await insertTag({
      name: "ZTAG 2",
    });
    await insertEventTag({
      eventId: event1.id,
      tagId: tag1.id,
    });
    await insertEventTag({
      eventId: event1.id,
      tagId: tag2.id,
    });
    const response = await executeGraphqlOperation<
      EventQuery,
      EventQueryVariables
    >({
      document: Event,
      variables: {
        eventId: event1.id,
      },
    });
    assert.equal(response.errors, undefined);
    assert.equal(response.data?.event?.tags?.length, 2);
    assert.deepEqual(response.data?.event, {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
      community: null,
      users: [],
      tags: [
        {
          id: tag2.id,
        },
        {
          id: tag1.id,
        },
      ],
    } as EventQuery["event"]);
  });
  it("Should get an event community", async () => {
    const event1 = await insertEvent();
    const community1 = await insertCommunity();
    await insertEventToCommunity({
      communityId: community1.id,
      eventId: event1.id,
    });
    const response = await executeGraphqlOperation<
      EventQuery,
      EventQueryVariables
    >({
      document: Event,
      variables: {
        eventId: event1.id,
      },
    });
    assert.equal(response.errors, undefined);
    assert.notEqual(response.data?.event?.community, null);
    assert.deepEqual(response.data?.event, {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
      users: [],
      community: {
        id: community1.id,
      },
      tags: [],
    } as EventQuery["event"]);
  });

  it("Should get an event users", async () => {
    const event1 = await insertEvent();
    const response = await executeGraphqlOperation<
      EventQuery,
      EventQueryVariables
    >({
      document: Event,
      variables: {
        eventId: event1.id,
      },
    });
    assert.equal(response.errors, undefined);
    assert.deepEqual(response.data?.event, {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
      users: [],
      community: null,
      tags: [],
    } as EventQuery["event"]);
  });

  it("return null when no event  is found", async () => {
    const response = await executeGraphqlOperation<
      EventQuery,
      EventQueryVariables
    >({
      document: Event,
      variables: {
        eventId: "FAKE_ID_NUMBER_7",
      },
    });
    assert.equal(response.errors, undefined);
    assert.equal(response.data?.event, null);
  });
});

describe("Events", () => {
  it("Should get a list of events with a default query", async () => {
    const event1 = await insertEvent({
      name: "MY CONFERENCE 1",
    });
    const event2 = await insertEvent({
      name: "MY MEETUP 2",
    });
    const event3 = await insertEvent({
      name: "MY MEETTUP 3",
    });
    const response = await executeGraphqlOperation<
      EventsQuery,
      EventsQueryVariables
    >({
      document: Events,
    });

    assert.equal(response.errors, undefined);
    assert.deepEqual(response.data?.events?.length, 3);
    assert.deepEqual(response.data?.events?.at(0), {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
    } as EventsQuery["events"][0]);
    assert.deepEqual(response.data?.events?.at(1), {
      id: event2.id,
      name: event2.name,
      description: event2.description,
      status: event2.status,
      visibility: event2.visibility,
      startDateTime: event2.startDateTime.toISOString(),
      endDateTime: event2.endDateTime?.toISOString(),
    } as EventsQuery["events"][0]);
    assert.deepEqual(response.data?.events?.at(2), {
      id: event3.id,
      name: event3.name,
      description: event3.description,
      status: event3.status,
      visibility: event3.visibility,
      startDateTime: event3.startDateTime.toISOString(),
      endDateTime: event3.endDateTime?.toISOString(),
    } as EventsQuery["events"][0]);
  });
  it("Should Filter by ID", async () => {
    const event1 = await insertEvent({
      name: "MY CONFERENCE 1",
    });
    await insertEvent({
      name: "MY MEETUP 2",
    });
    await insertEvent({
      name: "MY MEETTUP 3",
    });
    const response = await executeGraphqlOperation<
      EventsQuery,
      EventsQueryVariables
    >({
      document: Events,
      variables: {
        input: {
          id: event1.id,
        },
      },
    });

    assert.equal(response.errors, undefined);
    assert.deepEqual(response.data?.events?.length, 1);
    assert.deepEqual(response.data?.events?.at(0), {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
    } as EventsQuery["events"][0]);
  });
  it("Should Filter by Visibility", async () => {
    const event1 = await insertEvent({
      visibility: "private",
    });
    await insertEvent({
      visibility: "unlisted",
    });
    await insertEvent({
      visibility: "public",
    });
    const response = await executeGraphqlOperation<
      EventsQuery,
      EventsQueryVariables
    >({
      document: Events,
      variables: {
        input: {
          visibility: EventVisibility.Private,
        },
      },
    });

    assert.equal(response.errors, undefined);
    assert.deepEqual(response.data?.events?.length, 1);
    assert.deepEqual(response.data?.events?.at(0), {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
    } as EventsQuery["events"][0]);
  });
  it("Should Filter by Status", async () => {
    const event1 = await insertEvent({
      status: EventStatus.Active,
    });
    await insertEvent({
      status: EventStatus.Inactive,
    });
    const response = await executeGraphqlOperation<
      EventsQuery,
      EventsQueryVariables
    >({
      document: Events,
      variables: {
        input: {
          status: EventStatus.Active,
        },
      },
    });

    assert.equal(response.errors, undefined);
    assert.deepEqual(response.data?.events?.length, 1);
    assert.deepEqual(response.data?.events?.at(0), {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
    } as EventsQuery["events"][0]);
  });
  it("Should Filter by Date", async () => {
    const event1 = await insertEvent({
      startDateTime: new Date("2021-02-02"),
      endDateTime: new Date("2021-02-03"),
    });
    await insertEvent({
      startDateTime: new Date("2021-02-04"),
      endDateTime: new Date("2021-02-05"),
    });
    const response = await executeGraphqlOperation<
      EventsQuery,
      EventsQueryVariables
    >({
      document: Events,
      variables: {
        input: {
          startDateTimeFrom: new Date("2021-02-02").toISOString(),
          startDateTimeTo: new Date("2021-02-03").toISOString(),
        },
      },
    });

    assert.equal(response.errors, undefined);
    assert.deepEqual(response.data?.events?.length, 1);
    assert.deepEqual(response.data?.events?.at(0), {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
    } as EventsQuery["events"][0]);
  });
  it("Should Filter by Name", async () => {
    const event1 = await insertEvent({
      name: "MY CONFERENCE 1",
    });
    await insertEvent({
      name: "SOME OTHER NAME",
    });
    const response = await executeGraphqlOperation<
      EventsQuery,
      EventsQueryVariables
    >({
      document: Events,
      variables: {
        input: {
          name: "CONFERENCE",
        },
      },
    });

    assert.equal(response.errors, undefined);
    assert.deepEqual(response.data?.events?.length, 1);
    assert.deepEqual(response.data?.events?.at(0), {
      id: event1.id,
      name: event1.name,
      description: event1.description,
      status: event1.status,
      visibility: event1.visibility,
      startDateTime: event1.startDateTime.toISOString(),
      endDateTime: event1.endDateTime?.toISOString(),
    } as EventsQuery["events"][0]);
  });
});
