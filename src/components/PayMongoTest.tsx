import React, { useState } from 'react';
import { payMongoService } from '../services/PayMongoService';

const PayMongoTest: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testPayMongo = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      console.log('Starting PayMongo test');
      const checkoutUrl = await payMongoService.createCheckoutSession('premium', 'test-user-123');
      console.log('Test successful, checkout URL:', checkoutUrl);
      setResult(`Success! Checkout URL: ${checkoutUrl}`);
    } catch (error) {
      console.error('PayMongo test failed:', error);
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>PayMongo Test Component</h3>
      <button onClick={testPayMongo} disabled={loading}>
        {loading ? 'Testing...' : 'Test PayMongo API'}
      </button>
      <div style={{ marginTop: '10px', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
        {result}
      </div>
    </div>
  );
};

export default PayMongoTest;
