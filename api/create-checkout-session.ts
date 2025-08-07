import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, userId } = req.body;
    
    if (!plan || !userId) {
      return res.status(400).json({ error: 'Missing required fields: plan, userId' });
    }

    const secretKey = process.env.VITE_PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'PayMongo secret key not configured' });
    }

    const planDetails = {
      premium: {
        name: 'Gold Signal Premium Plan',
        amount: 145000, // ₱1,450 in centavos
        description: 'Premium trading signals for XAUUSD with 24/7 support'
      },
      vip: {
        name: 'Gold Signal VIP Plan', 
        amount: 495000, // ₱4,950 in centavos
        description: 'VIP trading signals with priority support and advanced analytics'
      }
    };

    const selectedPlan = planDetails[plan as 'premium' | 'vip'];
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan. Must be "premium" or "vip"' });
    }

    const payload = {
      data: {
        attributes: {
          line_items: [{
            name: selectedPlan.name,
            amount: selectedPlan.amount,
            currency: 'PHP',
            quantity: 1,
            description: selectedPlan.description
          }],
          payment_method_types: [
            'card',
            'gcash',
            'grab_pay',
            'paymaya'
          ],
          success_url: `${process.env.VITE_APP_URL || 'https://goldsignal.vercel.app'}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
          cancel_url: `${process.env.VITE_APP_URL || 'https://goldsignal.vercel.app'}/pricing`,
          description: `${selectedPlan.name} subscription`,
          metadata: {
            plan,
            user_id: userId,
            service: 'gold_signal_service'
          }
        }
      }
    };

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayMongo API error:', errorText);
      
      let errorDetail;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.errors?.[0]?.detail || errorJson.message || 'Unknown error';
      } catch {
        errorDetail = `HTTP ${response.status}: ${errorText}`;
      }
      
      return res.status(response.status).json({ error: `PayMongo API error: ${errorDetail}` });
    }

    const session = await response.json();
    
    res.status(200).json({ 
      checkout_url: session.data.attributes.checkout_url,
      session_id: session.data.id
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
