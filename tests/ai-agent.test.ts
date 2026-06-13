import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiCommerceAgent, AiAgentProvider } from '@haa/commerce-core';

describe('AiCommerceAgent QA Tests', () => {
  const mockProvider: AiAgentProvider = {
    name: 'Test Provider',
    isAvailable: true,
    generate: vi.fn().mockResolvedValue({ text: 'Mocked AI Response', confidence: 1 }),
  };

  const storeId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enrich prompt with real data for daily summary', async () => {
    const agent = new AiCommerceAgent(mockProvider);
    
    await agent.getDailySummary(storeId);
    
    const call = vi.mocked(mockProvider.generate).mock.calls[0][0];
    expect(call.prompt).toContain('البيانات الحقيقية');
    expect(call.action).toBe('daily_summary');
  });

  it('should propose actions for coupon creation in chat', async () => {
    vi.mocked(mockProvider.generate).mockResolvedValueOnce({
      text: 'سأقوم بإنشاء الكوبون لك',
      actions: [{ label: 'تأكيد', action: 'create_coupon', params: { code: 'TEST10', value: 10 } }]
    });

    const agent = new AiCommerceAgent(mockProvider);
    const response = await agent.chat(storeId, 'أنشئ كوبون خصم 10%');
    
    expect(response.actions).toBeDefined();
    expect(response.actions![0].action).toBe('create_coupon');
  });

  it('should load system knowledge for RAG in chat', async () => {
    const agent = new AiCommerceAgent(mockProvider);
    await agent.chat(storeId, 'كيف أغير خطة الاشتراك');
    
    const call = vi.mocked(mockProvider.generate).mock.calls[0][0];
    expect(call.prompt).toContain('المعرفة:');
  });

  it('should handle action execution errors gracefully', async () => {
    const agent = new AiCommerceAgent(mockProvider);
    const result = await agent.executeAction(storeId, 'unknown_action', {});
    
    expect(result.text).toContain('غير مدعومة');
  });
});
