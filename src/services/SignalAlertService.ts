import { userService } from './UserService';
import { notificationService } from './NotificationService';
import { emailNotificationService } from './EmailNotificationService';
import type { Database } from '../lib/supabase';

type Signal = Database['public']['Tables']['signals']['Row'];

class SignalAlertService {
  
  // Send alerts when a new signal is created
  async sendNewSignalAlert(signal: Signal): Promise<void> {
    try {
      // Get premium and VIP users
      const premiumUsers = await userService.getUsersBySubscriptionTier('premium');
      const vipUsers = await userService.getUsersBySubscriptionTier('vip');
      const allPremiumUsers = [...premiumUsers, ...vipUsers];
      
      if (allPremiumUsers.length === 0) {
        console.log('No premium users to notify for signal:', signal.id);
        return;
      }

      // Create in-app notifications
      const notifications = allPremiumUsers.map(user => ({
        user_id: user.id,
        type: 'signal' as const,
        title: `🎯 New ${signal.symbol} Signal`,
        message: `${signal.type.toUpperCase()} signal at $${signal.entry_price} with ${signal.confidence}% confidence`
      }));

      await notificationService.sendBulkNotifications(notifications);

      // Send email notifications
      const userEmails = allPremiumUsers.map(user => user.email);
      await emailNotificationService.sendSignalAlert({
        id: signal.id,
        symbol: signal.symbol,
        type: signal.type,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit: signal.take_profit,
        confidence: signal.confidence,
        description: signal.description
      }, userEmails);

      console.log(`✅ Signal alerts sent to ${allPremiumUsers.length} premium users`);
      
    } catch (error) {
      console.error('Error sending signal alerts:', error);
    }
  }

  // Send alerts when signal hits TP or SL
  async sendSignalResultAlert(signal: Signal, result: 'win' | 'loss', pnlPercentage: number): Promise<void> {
    try {
      // Get premium and VIP users
      const premiumUsers = await userService.getUsersBySubscriptionTier('premium');
      const vipUsers = await userService.getUsersBySubscriptionTier('vip');
      const allPremiumUsers = [...premiumUsers, ...vipUsers];

      if (allPremiumUsers.length === 0) return;

      // Create in-app notifications
      const resultEmoji = result === 'win' ? '✅' : '❌';
      const resultText = result === 'win' ? 'WIN' : 'LOSS';
      const pnlText = pnlPercentage >= 0 ? `+${pnlPercentage.toFixed(1)}%` : `${pnlPercentage.toFixed(1)}%`;

      const notifications = allPremiumUsers.map(user => ({
        user_id: user.id,
        type: 'signal' as const,
        title: `${resultEmoji} Signal ${resultText}: ${signal.symbol}`,
        message: `${signal.type.toUpperCase()} signal closed with ${pnlText} result`
      }));

      await notificationService.sendBulkNotifications(notifications);

      // Send email notifications
      const userEmails = allPremiumUsers.map(user => user.email);
      await Promise.all(
        userEmails.map(email => 
          emailNotificationService.sendSignalResultEmail(email, {
            id: signal.id,
            symbol: signal.symbol,
            type: signal.type,
            entry_price: signal.entry_price,
            stop_loss: signal.stop_loss,
            take_profit: signal.take_profit,
            confidence: signal.confidence,
            description: signal.description,
            result,
            pnl: pnlPercentage
          })
        )
      );

      console.log(`✅ Signal result alerts sent: ${signal.symbol} ${resultText} (${pnlText})`);
      
    } catch (error) {
      console.error('Error sending signal result alerts:', error);
    }
  }

  // Send subscription upgrade notifications
  async sendUpgradeNotification(userEmail: string, subscriptionTier: string): Promise<void> {
    try {
      const user = await userService.getUserByEmail(userEmail);
      if (!user) return;

      // Create in-app notification
      await notificationService.createNotification({
        user_id: user.id,
        type: 'subscription',
        title: `🎉 Welcome to ${subscriptionTier.toUpperCase()}!`,
        message: `Your account has been upgraded. You now have access to all premium features.`
      });

      // Send welcome email
      await emailNotificationService.sendWelcomeEmail(userEmail, subscriptionTier);

      console.log(`✅ Upgrade notification sent to ${userEmail} (${subscriptionTier})`);
      
    } catch (error) {
      console.error('Error sending upgrade notification:', error);
    }
  }

  // Send subscription renewal reminders
  async sendRenewalReminders(): Promise<void> {
    try {
      // This would typically be called by a scheduled job
      // Get users with subscriptions ending in 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Note: This would require a subscription_end_date field in users table
      console.log('📅 Renewal reminder service - would check subscriptions ending soon');
      
      // Implementation would query users and send reminders
      // await emailNotificationService.sendRenewalReminder(userEmail, daysRemaining);
      
    } catch (error) {
      console.error('Error sending renewal reminders:', error);
    }
  }

  // Test notification system
  async testNotifications(testEmail: string): Promise<void> {
    try {
      console.log('🧪 Testing notification system...');
      
      // Test in-app notification
      const user = await userService.getUserByEmail(testEmail);
      if (user) {
        await notificationService.createNotification({
          user_id: user.id,
          type: 'system',
          title: '🧪 Test Notification',
          message: 'This is a test notification to verify the system is working.'
        });
      }

      // Test email notification
      await emailNotificationService.sendSignalAlert({
        id: 'test-signal-id',
        symbol: 'XAUUSD',
        type: 'buy',
        entry_price: 2650.50,
        stop_loss: 2640.00,
        take_profit: 2670.00,
        confidence: 85,
        description: 'Test signal for notification system verification. Gold showing bullish momentum above key support level.'
      }, [testEmail]);

      console.log('✅ Test notifications sent successfully');
      
    } catch (error) {
      console.error('Error testing notifications:', error);
    }
  }
}

export const signalAlertService = new SignalAlertService();
