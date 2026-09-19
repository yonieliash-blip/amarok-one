export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  CurrentTask: undefined;
  Visit: { serviceCallId: string; title: string };
  WorkReport: { serviceCallId: string; visitId: string; title: string };
};
