import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'frontendv6pptnotopen-filestrtc',
  location: 'us-east4'
};

export const addNewUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddNewUser', inputVars);
}
addNewUserRef.operationName = 'AddNewUser';

export function addNewUser(dcOrVars, vars) {
  return executeMutation(addNewUserRef(dcOrVars, vars));
}

export const getMyProfileRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyProfile');
}
getMyProfileRef.operationName = 'GetMyProfile';

export function getMyProfile(dc) {
  return executeQuery(getMyProfileRef(dc));
}

export const createNewGameListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewGameList', inputVars);
}
createNewGameListRef.operationName = 'CreateNewGameList';

export function createNewGameList(dcOrVars, vars) {
  return executeMutation(createNewGameListRef(dcOrVars, vars));
}

export const listPublicGameListsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPublicGameLists');
}
listPublicGameListsRef.operationName = 'ListPublicGameLists';

export function listPublicGameLists(dc) {
  return executeQuery(listPublicGameListsRef(dc));
}

