export type ClassT = any;
export type MemberNameT = string;
export type ClassMemberT = [ClassT, MemberNameT];
export type AdapterT = {
  [member: string]: ClassMemberT;
};
