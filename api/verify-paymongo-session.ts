import type { VercelRequest, VercelResponse } from '@vercel/node';
import { payMongoService } from '../src/services/PayMongoService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id, user_id } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({ error: 'Missing session_id or user_id' });
    }

    // Verify the session with PayMongo
    const session = await payMongoService.verifySession(session_id);

    if (session.status === 'paid') {
      // Extract plan from success URL or metadata
      const plan = session.success_url?.includes('plan=premium') ? 'premium' : 'vip';
      
      // Update user subscription
      const success = await payMongoService.updateUserSubscription(user_id, plan, session_id);
      
      if (success) {
        return res.status(200).json({
          success: true,
          message: `Successfully upgraded to ${plan} plan`,
          session_status: session.status,
          plan
        });
      } else {
        return res.status(500).json({ error: 'Failed to update user subscription' });
      }
    } else {
      return res.status(400).json({
        error: 'Payment not completed',
        session_status: session.status
      });
    }

  } catch (error) {
    console.error('PayMongo session verification error:', error);
    return res.status(500).json({ error: 'Session verification failed' });
  }
}
