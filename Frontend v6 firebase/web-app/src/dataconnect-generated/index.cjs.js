const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'frontendv6pptnotopen-filestrtc',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const addNewUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddNewUser', inputVars);
}
addNewUserRef.operationName = 'AddNewUser';
exports.addNewUserRef = addNewUserRef;

exports.addNewUser = function addNewUser(dcOrVars, vars) {
  return executeMutation(addNewUserRef(dcOrVars, vars));
};

const getMyProfileRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyProfile');
}
getMyProfileRef.operationName = 'GetMyProfile';
exports.getMyProfileRef = getMyProfileRef;

exports.getMyProfile = function getMyProfile(dc) {
  return executeQuery(getMyProfileRef(dc));
};

const createNewGameListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewGameList', inputVars);
}
createNewGameListRef.operationName = 'CreateNewGameList';
exports.createNewGameListRef = createNewGameListRef;

exports.createNewGameList = function createNewGameList(dcOrVars, vars) {
  return executeMutation(createNewGameListRef(dcOrVars, vars));
};

const listPublicGameListsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPublicGameLists');
}
listPublicGameListsRef.operationName = 'ListPublicGameLists';
exports.listPublicGameListsRef = listPublicGameListsRef;

exports.listPublicGameLists = function listPublicGameLists(dc) {
  return executeQuery(listPublicGameListsRef(dc));
};
