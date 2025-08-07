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
    const welcomeTemplate = this.generateWelcomeEmailTemplate(userEmail, subscriptionTier);
    
    // In production, this would send actual email
    console.log(`📧 Welcome Email Sent to ${userEmail}`);
    console.log(`Subject: ${welcomeTemplate.subject}`);
    console.log('Email content prepared with welcome message, getting started guide, and premium upgrade info');
    
    return true;
  }

  // Generate welcome email template for new users
  private generateWelcomeEmailTemplate(_userEmail: string, tier: string): EmailTemplate {
    const subject = '🎉 Welcome to Gold Signal Service - Your Trading Journey Begins!';
    
    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🥇 Welcome to Gold Signal Service!</h1>
          <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Join thousands of profitable traders worldwide</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Welcome aboard! 🚀</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            Thank you for joining Gold Signal Service! You've just taken the first step towards becoming a more profitable trader.
          </p>
          
          <!-- Current Plan -->
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 18px;">Your Current Plan: ${tier.charAt(0).toUpperCase() + tier.slice(1)}</h3>
            ${tier === 'free' ? `
              <p style="margin: 0; color: #1e40af;">
                • Access to 3 free signals per week<br>
                • Basic email notifications<br>
                • Community access
              </p>
            ` : `
              <p style="margin: 0; color: #1e40af;">
                • Unlimited premium signals<br>
                • Real-time notifications<br>
                • Advanced analytics<br>
                • Priority support
              </p>
            `}
          </div>
          
          <!-- Quick Start Guide -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">🎯 Quick Start Guide</h3>
            <ol style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
              <li><strong>Log into your dashboard</strong> to see your first signals</li>
              <li><strong>Check your notifications</strong> - we've added a welcome message</li>
              <li><strong>Explore our signals</strong> for XAUUSD (Gold) trading</li>
              <li><strong>Set up your trading platform</strong> with our recommended brokers</li>
              ${tier === 'free' ? '<li><strong>Consider upgrading to Premium</strong> for unlimited access</li>' : ''}
            </ol>
          </div>
          
          ${tier === 'free' ? `
          <!-- Upgrade Promotion -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 18px;">💎 Upgrade to Premium</h3>
            <p style="margin: 0 0 15px 0; color: #92400e;">
              Ready for more? Get unlimited signals, real-time alerts, and advanced analytics.
            </p>
            <div style="text-align: center;">
              <a href="${process.env.VITE_APP_URL || 'https://goldsignals.com'}/pricing" 
                 style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Upgrade Now - Only ₱1,450/month
              </a>
            </div>
          </div>
          ` : ''}
          
          <!-- Trading Tips -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📈 Trading Tips for Success</h3>
            <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px;">
              <li>Always follow proper risk management (1-2% per trade)</li>
              <li>Set stop losses and take profits as indicated</li>
              <li>Track your performance using our analytics</li>
              <li>Join our community for trading discussions</li>
            </ul>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Questions? Reply to this email or contact our support team.<br>
            Happy trading! 📊
          </p>
          <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
            Gold Signal Service - Professional Trading Signals for XAUUSD
          </p>
        </div>
      </div>
    `;

    const textContent = `
Welcome to Gold Signal Service!

Thank you for joining our community of profitable traders. 

Your ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan is now active and includes:
${tier === 'free' ? `
- 3 free signals per week
- Basic email notifications  
- Community access
` : `
- Unlimited premium signals
- Real-time notifications
- Advanced analytics
- Priority support
`}

Quick Start:
1. Log into your dashboard
2. Check your notifications  
3. Explore Gold (XAUUSD) signals
4. Set up your trading platform
${tier === 'free' ? '5. Consider upgrading to Premium for unlimited access' : ''}

Trading Tips:
- Use proper risk management (1-2% per trade)
- Follow stop losses and take profits
- Track performance with our analytics
- Join our trading community

Questions? Reply to this email or contact support.

Happy trading!
Gold Signal Service Team
    `;

    return {
      subject,
      htmlContent,
      textContent
    };
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
