import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddNewUserData {
  user_insert: User_Key;
}

export interface AddNewUserVariables {
  email: string;
  username: string;
}

export interface CreateNewGameListData {
  gameList_insert: GameList_Key;
}

export interface CreateNewGameListVariables {
  name: string;
  description?: string | null;
  isPublic: boolean;
}

export interface GameListItem_Key {
  id: UUIDString;
  __typename?: 'GameListItem_Key';
}

export interface GameList_Key {
  id: UUIDString;
  __typename?: 'GameList_Key';
}

export interface GameSession_Key {
  id: UUIDString;
  __typename?: 'GameSession_Key';
}

export interface Game_Key {
  id: UUIDString;
  __typename?: 'Game_Key';
}

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

export interface ListPublicGameListsData {
  gameLists: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    createdAt: TimestampString;
    userId?: UUIDString | null;
  } & GameList_Key)[];
}

export interface Review_Key {
  id: UUIDString;
  __typename?: 'Review_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface AddNewUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddNewUserVariables): MutationRef<AddNewUserData, AddNewUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddNewUserVariables): MutationRef<AddNewUserData, AddNewUserVariables>;
  operationName: string;
}
export const addNewUserRef: AddNewUserRef;

export function addNewUser(vars: AddNewUserVariables): MutationPromise<AddNewUserData, AddNewUserVariables>;
export function addNewUser(dc: DataConnect, vars: AddNewUserVariables): MutationPromise<AddNewUserData, AddNewUserVariables>;

interface GetMyProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyProfileData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyProfileData, undefined>;
  operationName: string;
}
export const getMyProfileRef: GetMyProfileRef;

export function getMyProfile(): QueryPromise<GetMyProfileData, undefined>;
export function getMyProfile(dc: DataConnect): QueryPromise<GetMyProfileData, undefined>;

interface CreateNewGameListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewGameListVariables): MutationRef<CreateNewGameListData, CreateNewGameListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNewGameListVariables): MutationRef<CreateNewGameListData, CreateNewGameListVariables>;
  operationName: string;
}
export const createNewGameListRef: CreateNewGameListRef;

export function createNewGameList(vars: CreateNewGameListVariables): MutationPromise<CreateNewGameListData, CreateNewGameListVariables>;
export function createNewGameList(dc: DataConnect, vars: CreateNewGameListVariables): MutationPromise<CreateNewGameListData, CreateNewGameListVariables>;

interface ListPublicGameListsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPublicGameListsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPublicGameListsData, undefined>;
  operationName: string;
}
export const listPublicGameListsRef: ListPublicGameListsRef;

export function listPublicGameLists(): QueryPromise<ListPublicGameListsData, undefined>;
export function listPublicGameLists(dc: DataConnect): QueryPromise<ListPublicGameListsData, undefined>;

