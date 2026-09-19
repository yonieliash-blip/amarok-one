export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  CurrentTask: undefined;
  Visit: { serviceCallId: string; title: string };
  WorkReport: { serviceCallId: string; visitId: string; title: string };
  ManagerHome: undefined;
  ManagerServiceCalls: undefined;
  ManagerNewServiceCall: undefined;
  ManagerServiceCall: { serviceCallId: string; title: string };
  ManagerCustomers: undefined;
  ManagerEquipment: undefined;
  ManagerLocations: undefined;
};
