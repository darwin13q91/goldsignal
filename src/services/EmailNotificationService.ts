interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

interface SignalAlert {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  description: string;
}

class EmailNotificationService {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.FROM_EMAIL || 'signals@goldsignals.com';
  }

  // Generate email template for new signal
  private generateSignalAlertTemplate(signal: SignalAlert): EmailTemplate {
    const subject = `🎯 New ${signal.symbol} ${signal.type.toUpperCase()} Signal - ${signal.confidence}% Confidence`;
    
    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🥇 Gold Signal Alert</h1>
          <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Professional Trading Signal</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <div style="background: ${signal.type === 'buy' ? '#dcfce7' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px 0; color: ${signal.type === 'buy' ? '#166534' : '#dc2626'}; font-size: 24px;">
              ${signal.type === 'buy' ? '📈 BUY' : '📉 SELL'} ${signal.symbol}
            </h2>
            <p style="margin: 0; color: ${signal.type === 'buy' ? '#166534' : '#dc2626'}; font-size: 18px; font-weight: bold;">
              Confidence: ${signal.confidence}%
            </p>
          </div>
          
          <div style="display: grid; gap: 15px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: #f9fafb; border-radius: 6px;">
              <span style="font-weight: bold; color: #374151;">Entry Price:</span>
              <span style="color: #1f2937; font-weight: bold;">$${signal.entry_price}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: #fef2f2; border-radius: 6px;">
              <span style="font-weight: bold; color: #374151;">Stop Loss:</span>
              <span style="color: #dc2626; font-weight: bold;">$${signal.stop_loss}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: #dcfce7; border-radius: 6px;">
              <span style="font-weight: bold; color: #374151;">Take Profit:</span>
              <span style="color: #166534; font-weight: bold;">$${signal.take_profit}</span>
            </div>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">📊 Analysis</h3>
            <p style="margin: 0; color: #6b7280; line-height: 1.6;">${signal.description}</p>
          </div>
          
          <div style="background: #fffbeb; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Risk Warning</h4>
            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
              Trading involves substantial risk. Never risk more than you can afford to lose. 
              Past performance does not guarantee future results.
            </p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Happy Trading! 🚀<br/>
              Gold Signal Service Team
            </p>
          </div>
        </div>
      </div>
    `;

    const textContent = `
🎯 New ${signal.symbol} ${signal.type.toUpperCase()} Signal - ${signal.confidence}% Confidence

${signal.type === 'buy' ? '📈 BUY' : '📉 SELL'} ${signal.symbol}
Confidence: ${signal.confidence}%

Entry Price: $${signal.entry_price}
Stop Loss: $${signal.stop_loss}
Take Profit: $${signal.take_profit}

Analysis: ${signal.description}

⚠️ Risk Warning: Trading involves substantial risk. Never risk more than you can afford to lose.

Happy Trading! 🚀
Gold Signal Service Team
    `;

    return { subject, htmlContent, textContent };
  }

  // Send signal alert to users
  async sendSignalAlert(signal: SignalAlert, recipients: string[]): Promise<boolean> {
    if (!this.apiKey) {
      console.log('📧 EMAIL SIMULATION - Signal Alert:', {
        to: recipients,
        signal: `${signal.type.toUpperCase()} ${signal.symbol} @ $${signal.entry_price}`,
        confidence: `${signal.confidence}%`
      });
      return true;
    }

    try {
      const template = this.generateSignalAlertTemplate(signal);
      
      // In production, integrate with SendGrid, Mailgun, or similar
      const emailData = {
        personalizations: recipients.map(email => ({ to: [{ email }] })),
        from: { email: this.fromEmail, name: 'Gold Signal Service' },
        subject: template.subject,
        content: [
          { type: 'text/plain', value: template.textContent },
          { type: 'text/html', value: template.htmlContent }
        ]
      };

      console.log('📧 Would send email:', emailData);
      
      // TODO: Implement actual email sending
      // const response = await sendGrid.send(emailData);
      
      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }

  // Send subscription welcome email
  async sendWelcomeEmail(userEmail: string, subscriptionTier: string): Promise<boolean> {
    console.log(`📧 Welcome email simulation for ${userEmail} (${subscriptionTier})`);
    
    // In production, would send actual welcome email with template
    return true;
  }

  // Send subscription renewal reminder
  async sendRenewalReminder(userEmail: string, daysRemaining: number): Promise<boolean> {
    console.log(`📧 Renewal reminder simulation for ${userEmail} (${daysRemaining} days remaining)`);
    
    return true;
  }

  // Send signal result notification (TP/SL hit)
  async sendSignalResultEmail(userEmail: string, signal: SignalAlert & { result: 'win' | 'loss', pnl: number }): Promise<boolean> {
    console.log(`📧 Signal result email simulation for ${userEmail}:`, {
      signal: signal.symbol,
      result: signal.result,
      pnl: signal.pnl
    });
    
    return true;
  }
}

export const emailNotificationService = new EmailNotificationService();
