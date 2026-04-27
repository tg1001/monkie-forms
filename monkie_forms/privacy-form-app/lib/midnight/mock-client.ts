// Mock Midnight client for development
// Replace with real Midnight SDK when available

export interface ContractInstance {
  submit_application: (data: any) => Promise<number>;
  verify_application: (id: number) => Promise<boolean>;
  accept_application: (id: number) => Promise<void>;
  reject_application: (id: number) => Promise<void>;
  reveal_private_field: (id: number, field: number) => Promise<Uint8Array>;
  get_application_status: (id: number) => Promise<number>;
}

class MockMidnightClient {
  private applicationCounter = 0;
  private applications = new Map();

  async initialize() {
    console.log('🌙 Mock Midnight client initialized');
  }

  async getContract(): Promise<ContractInstance> {
    return {
      submit_application: async (data: any) => {
        const id = this.applicationCounter++;
        this.applications.set(id, { ...data, status: 'submitted' });
        console.log('📨 Mock: Application submitted', id);
        return id;
      },
      
      verify_application: async (id: number) => {
        return this.applications.has(id);
      },
      
      accept_application: async (id: number) => {
        const app = this.applications.get(id);
        if (app) {
          app.status = 'accepted';
          console.log('✅ Mock: Application accepted', id);
        }
      },
      
      reject_application: async (id: number) => {
        const app = this.applications.get(id);
        if (app) {
          app.status = 'rejected';
          console.log('❌ Mock: Application rejected', id);
        }
      },
      
      reveal_private_field: async (id: number, field: number) => {
        console.log('🔓 Mock: Field revealed', { id, field });
        return new Uint8Array(32);
      },
      
      get_application_status: async (id: number) => {
        const app = this.applications.get(id);
        return app?.status === 'submitted' ? 0 : 
               app?.status === 'accepted' ? 2 : 
               app?.status === 'rejected' ? 3 : 0;
      },
    };
  }
}

let mockClient: MockMidnightClient | null = null;

export async function getMidnightClient() {
  if (!mockClient) {
    mockClient = new MockMidnightClient();
    await mockClient.initialize();
  }
  return mockClient;
}

export async function getContract() {
  const client = await getMidnightClient();
  return client.getContract();
}
