export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  CurrentTask: undefined;
  Visit: { serviceCallId: string; title: string };
  ManagerHome: undefined;
  ManagerServiceCalls: undefined;
  ManagerNewServiceCall: undefined;
  ManagerServiceCall: { serviceCallId: string; title: string };
  ManagerCustomers: undefined;
  ManagerEquipment: undefined;
  ManagerParts: undefined;
  ManagerInventory: { kind: "service_van" | "central_warehouse" };
  ManagerTechnicians: undefined;
};
