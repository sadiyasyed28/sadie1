import {
  CaseItem,
  UserItem,
  KnowledgeDocument,
  RubricCriterion,
  RubricVersion,
  CopilotConversation,
  CopilotMessage,
  SurgicalStage
} from '../types';

export interface ApiResponse<T> {
  data: T | null;
  error?: string | null;
  loading?: boolean;
  status: number;
  message?: string;
  timestamp?: string;
  count?: number;
}

export function wrapResponse<T>(data: T, message?: string, status: number = 200): ApiResponse<T> {
  return {
    data,
    error: null,
    loading: false,
    status,
    message,
    timestamp: new Date().toISOString()
  };
}
import {
  mockCases,
  mockUsers,
  mockKnowledgeDocuments,
  mockRubricCriteria,
  mockRubricVersions,
  mockCopilotConversations
} from '../data/mockData';

// Temporary in-memory prototype state; persists only for the life of this server/browser module.
let casesState: CaseItem[] = [];
let usersState: UserItem[] = [];
let knowledgeDocsState: KnowledgeDocument[] = [];
let conversationsState: CopilotConversation[] = [];

const delay = (ms: number = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  // Case APIs
  async getCases(filter?: {
    search?: string;
    tab?: 'all' | 'mine' | 'shared';
    status?: string;
    procedure?: string;
    currentUserId?: string;
  }): Promise<CaseItem[]> {
    await delay();
    let result = [...casesState];

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        c =>
          c.caseNumber.toLowerCase().includes(q) ||
          c.patientName.toLowerCase().includes(q) ||
          c.patientId.toLowerCase().includes(q) ||
          c.procedure.toLowerCase().includes(q)
      );
    }

    if (filter?.tab === 'mine' && filter.currentUserId) {
      result = result.filter(c => c.ownerId === filter.currentUserId);
    } else if (filter?.tab === 'shared') {
      result = result.filter(c => c.isShared);
    }

    if (filter?.status && filter.status !== 'all') {
      result = result.filter(c => c.status === filter.status);
    }

    if (filter?.procedure && filter.procedure !== 'all') {
      result = result.filter(c => c.procedure === filter.procedure);
    }

    return result;
  },

  async getCaseById(id: string): Promise<CaseItem | null> {
    await delay();
    const found = casesState.find(c => c.id === id);
    return found ? { ...found } : null;
  },

  async createCase(data: Partial<CaseItem>): Promise<CaseItem> {
    await delay();
    const newId = `case-${Date.now()}`;
    const newCaseNumber = `MX-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCase: CaseItem = {
      id: newId,
      caseNumber: newCaseNumber,
      patientName: data.patientName || 'Anonymous Patient',
      patientId: data.patientId || `MRN-${Math.floor(100000 + Math.random() * 899999)}`,
      age: data.age || 30,
      gender: data.gender || 'Female',
      procedure: data.procedure || 'Bimaxillary Osteotomy',
      stage: data.stage || 'Pre-Operative Planning',
      status: 'draft',
      lastUpdated: 'Just now',
      surgeryDate: data.surgeryDate || new Date().toISOString().split('T')[0],
      primarySurgeon: data.primarySurgeon || 'Primary Evaluator',
      evaluator: 'SADIE Evaluator v3.2',
      ownerId: 'usr-1',
      isShared: false,
      notes: data.notes || '',
      domainScores: [],
      measurements: [],
      evidence: [],
      files: [],
      ...data
    };
    casesState = [newCase, ...casesState];
    return newCase;
  },

  async updateCase(id: string, data: Partial<CaseItem>): Promise<CaseItem> {
    await delay();
    const index = casesState.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Case not found');
    casesState[index] = { ...casesState[index], ...data, lastUpdated: 'Just now' };
    return { ...casesState[index] };
  },

  async deleteCase(id: string): Promise<boolean> {
    await delay();
    casesState = casesState.filter(c => c.id !== id);
    return true;
  },

  async duplicateCase(id: string): Promise<CaseItem> {
    await delay();
    const original = casesState.find(c => c.id === id);
    if (!original) throw new Error('Case not found');
    const duplicated: CaseItem = {
      ...original,
      id: `case-${Date.now()}`,
      caseNumber: `${original.caseNumber}-COPY`,
      patientName: `${original.patientName} (Copy)`,
      status: 'draft',
      lastUpdated: 'Just now',
    };
    casesState = [duplicated, ...casesState];
    return duplicated;
  },

  async runAnalysis(_id: string): Promise<CaseItem> {
    throw new Error(
      'Clinical evaluation is disabled. The surgeon-approved rubric, imaging measurements and evaluator have not been connected.'
    );
  },

  // Users APIs
  async getUsers(): Promise<UserItem[]> {
    await delay();
    return [...usersState];
  },

  async inviteUser(userData: Partial<UserItem>): Promise<UserItem> {
    await delay();
    const newUser: UserItem = {
      id: `usr-${Date.now()}`,
      name: userData.name || 'New Surgeon',
      email: userData.email || 'user@sadie-omfs.org',
      role: userData.role || 'Resident',
      status: 'Active',
      department: userData.department || 'Oral & Maxillofacial Surgery',
      casesCount: 0,
      lastActive: 'Just invited',
      ...userData
    };
    usersState = [...usersState, newUser];
    return newUser;
  },

  async updateUser(id: string, data: Partial<UserItem>): Promise<UserItem> {
    await delay();
    const idx = usersState.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found');
    usersState[idx] = { ...usersState[idx], ...data };
    return { ...usersState[idx] };
  },

  async deactivateUser(id: string): Promise<UserItem> {
    await delay();
    const idx = usersState.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found');
    usersState[idx] = {
      ...usersState[idx],
      status: usersState[idx].status === 'Suspended' ? 'Active' : 'Suspended'
    };
    return { ...usersState[idx] };
  },

  // Knowledge Documents & Rubric APIs
  async getKnowledgeDocs(): Promise<KnowledgeDocument[]> {
    return [];
  },

  async getRubricCriteria(): Promise<RubricCriterion[]> {
    // Intentionally empty until the surgeon approves the rubric.
    return [];
  },

  async getRubricVersions(): Promise<RubricVersion[]> {
    // Intentionally empty until the surgeon approves the rubric.
    return [];
  },

  // Copilot APIs
  async getConversations(): Promise<CopilotConversation[]> {
    await delay();
    return [...conversationsState];
  },

  async createConversation(title: string, caseId?: string): Promise<CopilotConversation> {
    await delay();
    const targetCase = caseId ? casesState.find(c => c.id === caseId) : undefined;
    const newConvo: CopilotConversation = {
      id: `conv-${Date.now()}`,
      title,
      caseId,
      caseName: targetCase ? `${targetCase.patientName} (${targetCase.caseNumber})` : 'All Cases (Global)',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      updatedAt: 'Just now',
      messages: []
    };
    conversationsState = [newConvo, ...conversationsState];
    return newConvo;
  },

  async renameConversation(id: string, title: string): Promise<boolean> {
    await delay();
    const idx = conversationsState.findIndex(c => c.id === id);
    if (idx !== -1) {
      conversationsState[idx].title = title;
      return true;
    }
    return false;
  },

  async deleteConversation(id: string): Promise<boolean> {
    await delay();
    conversationsState = conversationsState.filter(c => c.id !== id);
    return true;
  },

  async sendMessage(convoId: string, text: string): Promise<CopilotMessage> {
    const convo = conversationsState.find(c => c.id === convoId);
    if (!convo) throw new Error('Conversation not found');

    const cleanText = text.trim();
    if (!cleanText) throw new Error('Message cannot be empty.');

    const history = convo.messages
      .slice(-10)
      .map(message => ({
        role: message.role,
        content: message.content
      }));

    let response: Response;
    try {
      response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: cleanText }]
        })
      });
    } catch {
      throw new Error('The assistant backend is not reachable. No AI response was generated.');
    }

    const payload = await response.json().catch(() => ({} as { error?: string; reply?: string; sources?: CopilotMessage['sources'] }));
    if (!response.ok) {
      throw new Error(payload.error || `Assistant request failed (HTTP ${response.status}).`);
    }
    if (!payload.reply || typeof payload.reply !== 'string') {
      throw new Error('The assistant returned an invalid response.');
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: CopilotMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: cleanText,
      timestamp
    };
    const assistantMessage: CopilotMessage = {
      id: `msg-${Date.now()}-a`,
      role: 'assistant',
      content: payload.reply,
      timestamp,
      sources: Array.isArray(payload.sources) ? payload.sources : undefined
    };

    convo.messages.push(userMessage, assistantMessage);
    convo.updatedAt = 'Just now';
    return assistantMessage;
  }
};

