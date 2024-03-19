/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from "@faker-js/faker";
import { authZEnvelopPlugin } from "@graphql-authz/envelop-plugin";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { ExecutionRequest } from "@graphql-tools/utils";
import { initContextCache } from "@pothos/core";
import { eq } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { type ExecutionResult } from "graphql";
import { createYoga } from "graphql-yoga";
import { ZodType, z } from "zod";

import { Env } from "worker-configuration";
import * as rules from "~/authz";
import {
  allowedCurrencySchema,
  communitySchema,
  companiesSchema,
  confirmationTokenSchema,
  eventsSchema,
  eventsToCommunitiesSchema,
  eventsToTagsSchema,
  eventsToUsersSchema,
  insertAllowedCurrencySchema,
  insertCommunitySchema,
  insertCompaniesSchema,
  insertConfirmationTokenSchema,
  insertEventsSchema,
  insertEventsToCommunitiesSchema,
  insertEventsToTagsSchema,
  insertEventsToUsersSchema,
  insertSalariesSchema,
  insertTagsSchema,
  insertTicketSchema,
  insertUserTicketsSchema,
  insertUsersSchema,
  insertUsersToCommunitiesSchema,
  insertUsersToTagsSchema,
  insertWorkEmailSchema,
  insertWorkRoleSchema,
  insertWorkSenioritySchema,
  insertWorkSeniorityAndRoleSchema,
  salariesSchema,
  selectAllowedCurrencySchema,
  selectCommunitySchema,
  selectCompaniesSchema,
  selectConfirmationTokenSchema,
  selectEventsSchema,
  selectEventsToCommunitiesSchema,
  selectEventsToTagsSchema,
  selectEventsToUsersSchema,
  selectSalariesSchema,
  selectTagsSchema,
  selectTicketSchema,
  selectUserTicketsSchema,
  selectUsersSchema,
  selectUsersToCommunitiesSchema,
  selectUsersToTagsSchema,
  selectWorkEmailSchema,
  selectWorkSeniorityAndRoleSchema,
  selectWorkSenioritySchema,
  selectWorkRoleSchema,
  tagsSchema,
  ticketsSchema,
  userTicketsSchema,
  usersSchema,
  usersTagsSchema,
  usersToCommunitiesSchema,
  workEmailSchema,
  workRoleSchema,
  workSeniorityAndRoleSchema,
  workSenioritySchema,
  insertPriceSchema,
  selectPriceSchema,
  pricesSchema,
  validPaymentMethodsEnum,
} from "~/datasources/db/schema";
import { genderOptions } from "~/datasources/db/shared";
import {
  TicketApprovalStatus,
  TicketPaymentStatus,
  TicketRedemptionStatus,
  TicketStatus,
} from "~/generated/types";
import { schema } from "~/schema";
import { getTestDB } from "~/tests/fixtures/databaseHelper";

import {
  insertTicketPriceSchema,
  selectTicketPriceSchema,
  ticketsPricesSchema,
} from "../../datasources/db/ticketPrice";

const insertUserRequest = insertUsersSchema.deepPartial();

const CRUDDates = ({
  createdAt,
  updatedAt,
  deletedAt,
}:
  | {
      createdAt?: Date | null | undefined;
      updatedAt?: Date | null | undefined;
      deletedAt?: Date | null | undefined;
    }
  | undefined = {}) => ({
  createdAt: createdAt ?? new Date(),
  // updatedAt and deletedAt can be NULL. So only if they are "not passed", we
  // will use the faker date, if not, we default to whatever value was passed.
  updatedAt: typeof updatedAt !== "undefined" ? updatedAt : faker.date.recent(),
  deletedAt: typeof deletedAt !== "undefined" ? deletedAt : faker.date.recent(),
});

const createExecutor = (user?: Awaited<ReturnType<typeof insertUser>>) =>
  buildHTTPExecutor({
    fetch: createYoga<Env>({
      schema,
      context: async () => {
        const DB = await getTestDB();
        return {
          ...initContextCache(),
          DB,
          USER: user ? user : undefined,
        };
      },
      plugins: [authZEnvelopPlugin({ rules })],
    }).fetch,
  });

export const executeGraphqlOperation = <
  TResult,
  TVariables extends Record<string, any> = Record<string, any>,
>(
  params: ExecutionRequest<TVariables, unknown, unknown, undefined, unknown>,
): Promise<ExecutionResult<TResult>> => {
  const executor = createExecutor();
  // @ts-expect-error This is ok. Executor returns a promise with they types passed
  return executor(params);
};

export const executeGraphqlOperationAsUser = <
  TResult,
  TVariables extends Record<string, any> = Record<string, any>,
>(
  params: ExecutionRequest<TVariables, unknown, unknown, undefined, unknown>,
  user: Awaited<ReturnType<typeof insertUser>>,
): Promise<ExecutionResult<TResult>> => {
  const executor = createExecutor(user);
  // @ts-expect-error This error is ok. Executor returns a promise with they types passed
  return executor(params);
};

export const executeGraphqlOperationAsSuperAdmin = async <
  TResult,
  TVariables extends Record<string, any> = Record<string, any>,
>(
  params: ExecutionRequest<TVariables, unknown, unknown, undefined, unknown>,
): Promise<ExecutionResult<TResult>> => {
  const user = await insertUser({ isSuperAdmin: true });
  const executor = createExecutor(user);
  // @ts-expect-error This error is ok. Executor returns a promise with they types passed
  return executor(params);
};

async function insertOne<
  I extends ZodType<any, any, any>,
  S extends ZodType<any, any, any>,
  D extends PgTable<any>,
>(
  insertZod: I,
  selectZod: S,
  dbSchema: D,
  possibleInput: z.infer<I>,
): Promise<S["_type"]> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const newInput = insertZod.parse(possibleInput);
  const testDB = await getTestDB();
  const data = (
    await testDB
      .insert(dbSchema)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .values(newInput)
      .returning()
  )?.[0];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return selectZod.parse(data);
}

async function findById<D extends PgTable<any>>(
  dbSchema: D,
  id: string | undefined,
) {
  const testDB = await getTestDB();
  if (!id) {
    throw new Error(`FindById cannot be called without an id`);
  }
  const data = await testDB
    .select()
    .from(dbSchema)
    .where((t) => eq(t.id, id));

  return createSelectSchema(dbSchema).parse(data[0]);
}

export const insertUser = async (
  partialInput?: Partial<z.infer<typeof insertUserRequest>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    username: partialInput?.username ?? faker.internet.userName(),
    bio: partialInput?.bio,
    email: partialInput?.email,
    name: partialInput?.name,
    isSuperAdmin: partialInput?.isSuperAdmin,
    emailVerified: partialInput?.emailVerified,
    lastName: partialInput?.lastName,
    publicMetadata: partialInput?.publicMetadata,
    twoFactorEnabled: partialInput?.twoFactorEnabled,
    unsafeMetadata: partialInput?.unsafeMetadata,
    imageUrl: partialInput?.imageUrl,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertUsersSchema>;
  return insertOne(
    insertUsersSchema,
    selectUsersSchema,
    usersSchema,
    possibleInput,
  );
};

export const insertUserTag = async (
  partialInput: z.infer<typeof insertUsersToTagsSchema>,
) => {
  const possibleInput = {
    tagId: partialInput?.tagId ?? faker.string.uuid(),
    userId: partialInput?.userId ?? faker.string.uuid(),
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertUsersToTagsSchema>;
  return insertOne(
    insertUsersToTagsSchema,
    selectUsersToTagsSchema,
    usersTagsSchema,
    possibleInput,
  );
};

export const insertCommunity = async (
  partialInput?: Partial<z.infer<typeof insertCommunitySchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    name: partialInput?.name ?? faker.company.name(),
    status: partialInput?.status,
    description: partialInput?.description,
    slug: partialInput?.slug,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertCommunitySchema>;
  return insertOne(
    insertCommunitySchema,
    selectCommunitySchema,
    communitySchema,
    possibleInput,
  );
};

export const insertUserToCommunity = async (
  partialInput: z.infer<typeof insertUsersToCommunitiesSchema>,
) => {
  const possibleInput = {
    userId: partialInput?.userId,
    communityId: partialInput?.communityId,
    role: partialInput?.role,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertUsersToCommunitiesSchema>;
  return insertOne(
    insertUsersToCommunitiesSchema,
    selectUsersToCommunitiesSchema,
    usersToCommunitiesSchema,
    possibleInput,
  );
};

export const insertUserToEvent = async (
  partialInput: z.infer<typeof insertEventsToUsersSchema>,
) => {
  const possibleInput = {
    userId: partialInput?.userId,
    eventId: partialInput?.eventId,
    role: partialInput?.role,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertEventsToUsersSchema>;
  return insertOne(
    insertEventsToUsersSchema,
    selectEventsToUsersSchema,
    eventsToUsersSchema,
    possibleInput,
  );
};

export const insertEventToCommunity = async (
  possibleInput: z.infer<typeof insertEventsToCommunitiesSchema>,
) => {
  return insertOne(
    insertEventsToCommunitiesSchema,
    selectEventsToCommunitiesSchema,
    eventsToCommunitiesSchema,
    possibleInput,
  );
};

export const insertTag = async (
  partialInput?: Partial<z.infer<typeof insertTagsSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    name: partialInput?.name ?? faker.company.name(),
    description: partialInput?.description,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertTagsSchema>;
  return insertOne(
    insertTagsSchema,
    selectTagsSchema,
    tagsSchema,
    possibleInput,
  );
};

export const insertPrice = async (
  partialInput?: Partial<z.infer<typeof insertPriceSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    currencyId: partialInput?.currencyId ?? faker.string.uuid(),
    price: partialInput?.price ?? faker.number.int(),
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertPriceSchema>;
  return insertOne(
    insertPriceSchema,
    selectPriceSchema,
    pricesSchema,
    possibleInput,
  );
};

export const insertTicketPrice = async (
  partialInput?: Partial<z.infer<typeof insertTicketPriceSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    priceId: partialInput?.priceId ?? (await insertPrice()).id,
    ticketId: partialInput?.ticketId ?? (await insertTicket()).id,
    // currencyId: partialInput?.currencyId ?? faker.string.uuid(),
    // price: partialInput?.price ?? faker.number.int(),
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertTicketPriceSchema>;
  return insertOne(
    insertTicketPriceSchema,
    selectTicketPriceSchema,
    ticketsPricesSchema,
    possibleInput,
  );
};

export const insertTicketTemplate = async (
  partialInput?: Partial<z.infer<typeof insertTicketSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    eventId: partialInput?.eventId ?? faker.string.uuid(),
    name: partialInput?.name ?? faker.company.name(),
    startDateTime: partialInput?.startDateTime ?? faker.date.future(),
    endDateTime: partialInput?.endDateTime ?? faker.date.future(),
    requiresApproval: partialInput?.requiresApproval ?? false,
    description: partialInput?.description,
    quantity: partialInput?.quantity ?? 100,
    status: partialInput?.status,
    visibility: partialInput?.visibility,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertTicketSchema>;

  return insertOne(
    insertTicketSchema,
    selectTicketSchema,
    ticketsSchema,
    possibleInput,
  );
};

export const insertTicket = async (
  partialInput?: Omit<z.infer<typeof insertUserTicketsSchema>, "id"> & {
    id?: string;
  },
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    userId: partialInput?.userId,
    ticketTemplateId:
      partialInput?.ticketTemplateId ?? (await insertTicketTemplate()).id,
    approvalStatus:
      partialInput?.approvalStatus ?? TicketApprovalStatus.Pending,
    paymentStatus: partialInput?.paymentStatus ?? TicketPaymentStatus.Unpaid,
    redemptionStatus:
      partialInput?.redemptionStatus ?? TicketRedemptionStatus.Pending,
    status: partialInput?.status ?? TicketStatus.Inactive,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertUserTicketsSchema>;

  return insertOne(
    insertUserTicketsSchema,
    selectUserTicketsSchema,
    userTicketsSchema,
    possibleInput,
  );
};

export const insertEvent = async (
  partialInput?: Partial<z.infer<typeof insertEventsSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    name: partialInput?.name ?? faker.company.name(),
    description: partialInput?.description ?? faker.lorem.paragraph(),
    visibility: partialInput?.visibility ?? "public",
    status: partialInput?.status ?? "active",
    startDateTime: partialInput?.startDateTime ?? faker.date.future(),
    endDateTime: partialInput?.endDateTime ?? faker.date.future(),
    geoAddressJSON: partialInput?.geoAddressJSON,
    geoLatitude: partialInput?.geoLatitude,
    geoLongitude: partialInput?.geoLongitude,
    meetingURL: partialInput?.meetingURL,
    maxAttendees: partialInput?.maxAttendees,
    timeZone: partialInput?.timeZone,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertEventsSchema>;
  return insertOne(
    insertEventsSchema,
    selectEventsSchema,
    eventsSchema,
    possibleInput,
  );
};
export const findEventById = async (id?: string) => findById(eventsSchema, id);

export const insertEventTag = async (
  partialInput: z.infer<typeof insertEventsToTagsSchema>,
) => {
  const possibleInput = {
    eventId: partialInput?.eventId,
    tagId: partialInput?.tagId,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertEventsToTagsSchema>;
  return insertOne(
    insertEventsToTagsSchema,
    selectEventsToTagsSchema,
    eventsToTagsSchema,
    possibleInput,
  );
};

export const insertCompany = async (
  partialInput?: Partial<z.infer<typeof insertCompaniesSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    domain: partialInput?.domain ?? faker.internet.domainName(),
    name: partialInput?.name,
    description: partialInput?.description,
    logo: partialInput?.logo,
    website: partialInput?.website,
    status: partialInput?.status,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertCompaniesSchema>;
  return insertOne(
    insertCompaniesSchema,
    selectCompaniesSchema,
    companiesSchema,
    possibleInput,
  );
};

export const insertWorkEmail = async (
  partialInput?: Partial<z.infer<typeof insertWorkEmailSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    userId: partialInput?.userId ?? faker.string.uuid(),
    workEmail: partialInput?.workEmail ?? faker.internet.email(),
    confirmationTokenId: partialInput?.confirmationTokenId,
    confirmationDate: partialInput?.confirmationDate,
    status: partialInput?.status,
    companyId: partialInput?.companyId,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertWorkEmailSchema>;
  return insertOne(
    insertWorkEmailSchema,
    selectWorkEmailSchema,
    workEmailSchema,
    possibleInput,
  );
};

export const insertConfirmationToken = async (
  partialInput: Partial<z.infer<typeof insertConfirmationTokenSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    userId: partialInput?.userId ?? faker.string.uuid(),
    token: partialInput?.token ?? faker.string.uuid(),
    status: partialInput?.status,
    source: partialInput?.source ?? "onboarding",
    validUntil: partialInput?.validUntil ?? faker.date.future(),
    sourceId: partialInput?.sourceId ?? faker.string.uuid(),
    confirmationDate: partialInput?.confirmationDate,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertConfirmationTokenSchema>;
  return insertOne(
    insertConfirmationTokenSchema,
    selectConfirmationTokenSchema,
    confirmationTokenSchema,
    possibleInput,
  );
};

export const insertWorkRole = async (
  partialInput?: Partial<z.infer<typeof insertWorkRoleSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    name: partialInput?.name ?? faker.person.jobTitle(),
    description: partialInput?.description ?? faker.person.jobDescriptor(),
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertWorkRoleSchema>;
  return insertOne(
    insertWorkRoleSchema,
    selectWorkRoleSchema,
    workRoleSchema,
    possibleInput,
  );
};

export const insertWorkSeniority = async (
  partialInput?: Partial<z.infer<typeof insertWorkSenioritySchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    name: partialInput?.name ?? faker.person.jobTitle(),
    description: partialInput?.description ?? faker.person.jobDescriptor(),
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertWorkSenioritySchema>;
  return insertOne(
    insertWorkSenioritySchema,
    selectWorkSenioritySchema,
    workSenioritySchema,
    possibleInput,
  );
};

export const insertWorkSeniorityAndRole = async (
  partialInput?: Partial<z.infer<typeof insertWorkSeniorityAndRoleSchema>>,
) => {
  const workRoleId = partialInput?.workRoleId ?? (await insertWorkRole()).id;
  const workSeniorityId =
    partialInput?.workSeniorityId ?? (await insertWorkSeniority()).id;
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    description: partialInput?.description ?? faker.person.jobDescriptor(),
    workRoleId,
    workSeniorityId,
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertWorkSeniorityAndRoleSchema>;
  return insertOne(
    insertWorkSeniorityAndRoleSchema,
    selectWorkSeniorityAndRoleSchema,
    workSeniorityAndRoleSchema,
    possibleInput,
  );
};

export const insertAllowedCurrency = async (
  partialInput?: Partial<z.infer<typeof insertAllowedCurrencySchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    currency: partialInput?.currency ?? faker.finance.currencyCode(),
    validPaymentMethods:
      partialInput?.validPaymentMethods ??
      faker.helpers.arrayElement(validPaymentMethodsEnum),
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertAllowedCurrencySchema>;
  return insertOne(
    insertAllowedCurrencySchema,
    selectAllowedCurrencySchema,
    allowedCurrencySchema,
    possibleInput,
  );
};

export const insertSalary = async (
  partialInput?: Partial<z.infer<typeof insertSalariesSchema>>,
) => {
  const possibleInput = {
    id: partialInput?.id ?? faker.string.uuid(),
    userId: partialInput?.userId ?? faker.string.uuid(),
    amount: partialInput?.amount ?? faker.number.int(),
    countryCode: partialInput?.countryCode ?? faker.address.countryCode(),
    typeOfEmployment:
      partialInput?.typeOfEmployment ??
      faker.helpers.arrayElement([
        "fullTime",
        "partTime",
        "freelance",
      ] as const),
    workMetodology:
      partialInput?.workMetodology ??
      faker.helpers.arrayElement(["remote", "office", "hybrid"] as const),
    yearsOfExperience: partialInput?.yearsOfExperience ?? faker.number.int(),
    gender: partialInput?.gender ?? faker.helpers.arrayElement(genderOptions),
    genderOtherText: partialInput?.genderOtherText,
    companyId: partialInput?.companyId,
    workEmailId: partialInput?.workEmailId,
    workSeniorityAndRoleId: partialInput?.workSeniorityAndRoleId,
    currencyCode: partialInput?.currencyCode ?? faker.finance.currencyCode(),
    ...CRUDDates(partialInput),
  } satisfies z.infer<typeof insertSalariesSchema>;
  return insertOne(
    insertSalariesSchema,
    selectSalariesSchema,
    salariesSchema,
    possibleInput,
  );
};

export const toISODateWithoutMilliseconds = <T extends Date | null>(
  date: T,
): T extends Date ? string : null => {
  if (!date) {
    return null as T extends Date ? string : null;
  }
  const dateWithoutMilliseconds = new Date(date);
  dateWithoutMilliseconds.setMilliseconds(0);
  return dateWithoutMilliseconds.toISOString() as T extends Date
    ? string
    : null;
};
