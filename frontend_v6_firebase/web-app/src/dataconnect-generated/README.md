# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetMyProfile*](#getmyprofile)
  - [*ListPublicGameLists*](#listpublicgamelists)
- [**Mutations**](#mutations)
  - [*AddNewUser*](#addnewuser)
  - [*CreateNewGameList*](#createnewgamelist)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetMyProfile
You can execute the `GetMyProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyProfile(): QueryPromise<GetMyProfileData, undefined>;

interface GetMyProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyProfileData, undefined>;
}
export const getMyProfileRef: GetMyProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyProfile(dc: DataConnect): QueryPromise<GetMyProfileData, undefined>;

interface GetMyProfileRef {
  ...
  (dc: DataConnect): QueryRef<GetMyProfileData, undefined>;
}
export const getMyProfileRef: GetMyProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyProfileRef:
```typescript
const name = getMyProfileRef.operationName;
console.log(name);
```

### Variables
The `GetMyProfile` query has no variables.
### Return Type
Recall that executing the `GetMyProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyProfileData {
  user?: {
    id: UUIDString;
    email: string;
    username: string;
    displayName?: string | null;
    bio?: string | null;
    profilePictureUrl?: string | null;
    createdAt: TimestampString;
  } & User_Key;
}
```
### Using `GetMyProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyProfile } from '@dataconnect/generated';


// Call the `getMyProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyProfile();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyProfile(dataConnect);

console.log(data.user);

// Or, you can use the `Promise` API.
getMyProfile().then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetMyProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyProfileRef } from '@dataconnect/generated';


// Call the `getMyProfileRef()` function to get a reference to the query.
const ref = getMyProfileRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyProfileRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## ListPublicGameLists
You can execute the `ListPublicGameLists` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listPublicGameLists(): QueryPromise<ListPublicGameListsData, undefined>;

interface ListPublicGameListsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPublicGameListsData, undefined>;
}
export const listPublicGameListsRef: ListPublicGameListsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPublicGameLists(dc: DataConnect): QueryPromise<ListPublicGameListsData, undefined>;

interface ListPublicGameListsRef {
  ...
  (dc: DataConnect): QueryRef<ListPublicGameListsData, undefined>;
}
export const listPublicGameListsRef: ListPublicGameListsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPublicGameListsRef:
```typescript
const name = listPublicGameListsRef.operationName;
console.log(name);
```

### Variables
The `ListPublicGameLists` query has no variables.
### Return Type
Recall that executing the `ListPublicGameLists` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPublicGameListsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPublicGameListsData {
  gameLists: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    createdAt: TimestampString;
    userId?: UUIDString | null;
  } & GameList_Key)[];
}
```
### Using `ListPublicGameLists`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPublicGameLists } from '@dataconnect/generated';


// Call the `listPublicGameLists()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPublicGameLists();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPublicGameLists(dataConnect);

console.log(data.gameLists);

// Or, you can use the `Promise` API.
listPublicGameLists().then((response) => {
  const data = response.data;
  console.log(data.gameLists);
});
```

### Using `ListPublicGameLists`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPublicGameListsRef } from '@dataconnect/generated';


// Call the `listPublicGameListsRef()` function to get a reference to the query.
const ref = listPublicGameListsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPublicGameListsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.gameLists);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.gameLists);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## AddNewUser
You can execute the `AddNewUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addNewUser(vars: AddNewUserVariables): MutationPromise<AddNewUserData, AddNewUserVariables>;

interface AddNewUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddNewUserVariables): MutationRef<AddNewUserData, AddNewUserVariables>;
}
export const addNewUserRef: AddNewUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addNewUser(dc: DataConnect, vars: AddNewUserVariables): MutationPromise<AddNewUserData, AddNewUserVariables>;

interface AddNewUserRef {
  ...
  (dc: DataConnect, vars: AddNewUserVariables): MutationRef<AddNewUserData, AddNewUserVariables>;
}
export const addNewUserRef: AddNewUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addNewUserRef:
```typescript
const name = addNewUserRef.operationName;
console.log(name);
```

### Variables
The `AddNewUser` mutation requires an argument of type `AddNewUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddNewUserVariables {
  email: string;
  username: string;
}
```
### Return Type
Recall that executing the `AddNewUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddNewUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddNewUserData {
  user_insert: User_Key;
}
```
### Using `AddNewUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addNewUser, AddNewUserVariables } from '@dataconnect/generated';

// The `AddNewUser` mutation requires an argument of type `AddNewUserVariables`:
const addNewUserVars: AddNewUserVariables = {
  email: ..., 
  username: ..., 
};

// Call the `addNewUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addNewUser(addNewUserVars);
// Variables can be defined inline as well.
const { data } = await addNewUser({ email: ..., username: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addNewUser(dataConnect, addNewUserVars);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
addNewUser(addNewUserVars).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `AddNewUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addNewUserRef, AddNewUserVariables } from '@dataconnect/generated';

// The `AddNewUser` mutation requires an argument of type `AddNewUserVariables`:
const addNewUserVars: AddNewUserVariables = {
  email: ..., 
  username: ..., 
};

// Call the `addNewUserRef()` function to get a reference to the mutation.
const ref = addNewUserRef(addNewUserVars);
// Variables can be defined inline as well.
const ref = addNewUserRef({ email: ..., username: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addNewUserRef(dataConnect, addNewUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

## CreateNewGameList
You can execute the `CreateNewGameList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createNewGameList(vars: CreateNewGameListVariables): MutationPromise<CreateNewGameListData, CreateNewGameListVariables>;

interface CreateNewGameListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewGameListVariables): MutationRef<CreateNewGameListData, CreateNewGameListVariables>;
}
export const createNewGameListRef: CreateNewGameListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createNewGameList(dc: DataConnect, vars: CreateNewGameListVariables): MutationPromise<CreateNewGameListData, CreateNewGameListVariables>;

interface CreateNewGameListRef {
  ...
  (dc: DataConnect, vars: CreateNewGameListVariables): MutationRef<CreateNewGameListData, CreateNewGameListVariables>;
}
export const createNewGameListRef: CreateNewGameListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createNewGameListRef:
```typescript
const name = createNewGameListRef.operationName;
console.log(name);
```

### Variables
The `CreateNewGameList` mutation requires an argument of type `CreateNewGameListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateNewGameListVariables {
  name: string;
  description?: string | null;
  isPublic: boolean;
}
```
### Return Type
Recall that executing the `CreateNewGameList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateNewGameListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateNewGameListData {
  gameList_insert: GameList_Key;
}
```
### Using `CreateNewGameList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createNewGameList, CreateNewGameListVariables } from '@dataconnect/generated';

// The `CreateNewGameList` mutation requires an argument of type `CreateNewGameListVariables`:
const createNewGameListVars: CreateNewGameListVariables = {
  name: ..., 
  description: ..., // optional
  isPublic: ..., 
};

// Call the `createNewGameList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createNewGameList(createNewGameListVars);
// Variables can be defined inline as well.
const { data } = await createNewGameList({ name: ..., description: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createNewGameList(dataConnect, createNewGameListVars);

console.log(data.gameList_insert);

// Or, you can use the `Promise` API.
createNewGameList(createNewGameListVars).then((response) => {
  const data = response.data;
  console.log(data.gameList_insert);
});
```

### Using `CreateNewGameList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createNewGameListRef, CreateNewGameListVariables } from '@dataconnect/generated';

// The `CreateNewGameList` mutation requires an argument of type `CreateNewGameListVariables`:
const createNewGameListVars: CreateNewGameListVariables = {
  name: ..., 
  description: ..., // optional
  isPublic: ..., 
};

// Call the `createNewGameListRef()` function to get a reference to the mutation.
const ref = createNewGameListRef(createNewGameListVars);
// Variables can be defined inline as well.
const ref = createNewGameListRef({ name: ..., description: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createNewGameListRef(dataConnect, createNewGameListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.gameList_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.gameList_insert);
});
```

