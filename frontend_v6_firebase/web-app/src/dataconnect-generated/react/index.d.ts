import { AddNewUserData, AddNewUserVariables, GetMyProfileData, CreateNewGameListData, CreateNewGameListVariables, ListPublicGameListsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useAddNewUser(options?: useDataConnectMutationOptions<AddNewUserData, FirebaseError, AddNewUserVariables>): UseDataConnectMutationResult<AddNewUserData, AddNewUserVariables>;
export function useAddNewUser(dc: DataConnect, options?: useDataConnectMutationOptions<AddNewUserData, FirebaseError, AddNewUserVariables>): UseDataConnectMutationResult<AddNewUserData, AddNewUserVariables>;

export function useGetMyProfile(options?: useDataConnectQueryOptions<GetMyProfileData>): UseDataConnectQueryResult<GetMyProfileData, undefined>;
export function useGetMyProfile(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyProfileData>): UseDataConnectQueryResult<GetMyProfileData, undefined>;

export function useCreateNewGameList(options?: useDataConnectMutationOptions<CreateNewGameListData, FirebaseError, CreateNewGameListVariables>): UseDataConnectMutationResult<CreateNewGameListData, CreateNewGameListVariables>;
export function useCreateNewGameList(dc: DataConnect, options?: useDataConnectMutationOptions<CreateNewGameListData, FirebaseError, CreateNewGameListVariables>): UseDataConnectMutationResult<CreateNewGameListData, CreateNewGameListVariables>;

export function useListPublicGameLists(options?: useDataConnectQueryOptions<ListPublicGameListsData>): UseDataConnectQueryResult<ListPublicGameListsData, undefined>;
export function useListPublicGameLists(dc: DataConnect, options?: useDataConnectQueryOptions<ListPublicGameListsData>): UseDataConnectQueryResult<ListPublicGameListsData, undefined>;
