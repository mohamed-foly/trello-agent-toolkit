export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  shortUrl: string;
  closed: boolean;
  idOrganization: string | null;
  prefs: TrelloBoardPrefs;
}

export interface TrelloBoardPrefs {
  permissionLevel: string;
  background: string;
  backgroundColor: string;
}

export interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
  pos: number;
  closed: boolean;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idBoard: string;
  pos: number;
  due: string | null;
  dueComplete: boolean;
  closed: boolean;
  url: string;
  shortUrl: string;
  labels: TrelloLabel[];
  idMembers: string[];
  dateLastActivity: string;
  idChecklists: string[];
  badges: TrelloCardBadges;
}

export interface TrelloCardBadges {
  attachments: number;
  checkItems: number;
  checkItemsChecked: number;
  comments: number;
  description: boolean;
  due: string | null;
  dueComplete: boolean;
}

export interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string;
}

export interface TrelloAttachment {
  id: string;
  name: string;
  url: string;
  bytes: number | null;
  mimeType: string;
  isUpload: boolean;
  date: string;
  edgeColor: string | null;
  fileName: string;
}

export interface TrelloAction {
  id: string;
  idMemberCreator: string;
  type: string;
  date: string;
  data: TrelloActionData;
  memberCreator?: TrelloMember;
}

export interface TrelloActionData {
  text?: string;
  card?: { id: string; name: string; shortLink: string };
  board?: { id: string; name: string; shortLink: string };
  list?: { id: string; name: string };
  listBefore?: { id: string; name: string };
  listAfter?: { id: string; name: string };
}

export interface TrelloMember {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  initials: string;
}

export interface TrelloChecklist {
  id: string;
  idCard: string;
  idBoard: string;
  name: string;
  pos: number;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
  pos: number;
  due: string | null;
  idMember: string | null;
  idChecklist: string;
}

export interface TrelloComment {
  id: string;
  text: string;
  date: string;
  memberCreator: TrelloMember;
}

export interface TaskContext {
  card: TrelloCard;
  list: TrelloList;
  workflowStage: string | null;
  comments: TrelloComment[];
  attachments: TrelloAttachment[];
  checklists: TrelloChecklist[];
}

export interface RateLimitHeaders {
  limitToken: number;
  remainingToken: number;
  limitKey: number;
  remainingKey: number;
}

export interface RateLimitState {
  lastRequestTime: number;
  tokenRemaining: number;
  tokenResetTime: number;
  keyRemaining: number;
  keyResetTime: number;
}
