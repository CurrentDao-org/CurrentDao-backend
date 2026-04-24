import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CurrencyTransaction } from '../entities/currency-transaction.entity';

export interface PaymentProcessor {
  name: string;
  supportedCurrencies: string[];
  fees: {
    fixed: number;
    percentage: number;
  };
  limits: {
    minimum: number;
    maximum: number;
  };
  features: string[];
}

export interface PaymentRequest {
  processor: string;
  currency: string;
  amount: number;
  recipient: {
    type: 'account' | 'wallet' | 'card';
    identifier: string;
    details?: any;
  };
  sender?: {
    type: 'account' | 'wallet' | 'card';
    identifier: string;
    details?: any;
  };
  metadata?: any;
}

export interface PaymentResult {
  transactionId: string;
  processorTransactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  fee: number;
  exchangeRate?: number;
  estimatedCompletion: Date;
  trackingUrl?: string;
  metadata?: any;
}

export interface ProcessorCapabilities {
  currencies: string[];
  regions: string[];
  transactionTypes: string[];
  settlementTimes: Record<string, number>;
  complianceLevels: string[];
}

@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);
  private readonly processors: Map<string, PaymentProcessor> = new Map();
  private readonly apiKeys: Map<string, string> = new Map();

  constructor(private readonly httpService: HttpService) {
    this.initializeProcessors();
  }

  private initializeProcessors(): void {
    // Stripe
    this.processors.set('stripe', {
      name: 'Stripe',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK'],
      fees: { fixed: 0.30, percentage: 0.029 },
      limits: { minimum: 0.50, maximum: 999999.99 },
      features: ['cards', 'bank_transfers', 'wallets', 'instant_settlement'],
    });

    // PayPal
    this.processors.set('paypal', {
      name: 'PayPal',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'],
      fees: { fixed: 0.30, percentage: 0.034 },
      limits: { minimum: 0.01, maximum: 10000.00 },
      features: ['wallet', 'bank_transfers', 'buyer_protection'],
    });

    // Wise (formerly TransferWise)
    this.processors.set('wise', {
      name: 'Wise',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK'],
      fees: { fixed: 0.50, percentage: 0.005 },
      limits: { minimum: 1.00, maximum: 1000000.00 },
      features: ['bank_transfers', 'real_exchange_rates', 'multi_currency'],
    });

    // Square
    this.processors.set('square', {
      name: 'Square',
      supportedCurrencies: ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'JPY'],
      fees: { fixed: 0.10, percentage: 0.027 },
      limits: { minimum: 1.00, maximum: 50000.00 },
      features: ['cards', 'bank_transfers', 'pos_integration'],
    });

    // Adyen
    this.processors.set('adyen', {
      name: 'Adyen',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF'],
      fees: { fixed: 0.12, percentage: 0.025 },
      limits: { minimum: 0.01, maximum: 500000.00 },
      features: ['cards', 'bank_transfers', 'wallets', 'apple_pay', 'google_pay'],
    });

    // Load API keys from environment
    this.apiKeys.set('stripe', process.env.STRIPE_API_KEY);
    this.apiKeys.set('paypal', process.env.PAYPAL_API_KEY);
    this.apiKeys.set('wise', process.env.WISE_API_KEY);
    this.apiKeys.set('square', process.env.SQUARE_API_KEY);
    this.apiKeys.set('adyen', process.env.ADYEN_API_KEY);
  }

  async getSupportedProcessors(): Promise<PaymentProcessor[]> {
    return Array.from(this.processors.values());
  }

  async getProcessorCapabilities(processorName: string): Promise<ProcessorCapabilities> {
    const processor = this.processors.get(processorName);
    if (!processor) {
      throw new Error(`Processor ${processorName} not found`);
    }

    const capabilities: ProcessorCapabilities = {
      currencies: processor.supportedCurrencies,
      regions: this.getProcessorRegions(processorName),
      transactionTypes: processor.features,
      settlementTimes: this.getSettlementTimes(processorName),
      complianceLevels: this.getComplianceLevels(processorName),
    };

    return capabilities;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    this.logger.log(`Processing payment via ${request.processor}: ${request.amount} ${request.currency}`);

    const processor = this.processors.get(request.processor);
    if (!processor) {
      throw new Error(`Payment processor ${request.processor} not supported`);
    }

    if (!processor.supportedCurrencies.includes(request.currency)) {
      throw new Error(`Currency ${request.currency} not supported by ${request.processor}`);
    }

    if (request.amount < processor.limits.minimum || request.amount > processor.limits.maximum) {
      throw new Error(`Amount ${request.amount} outside limits for ${request.processor}`);
    }

    // Calculate fees
    const fee = processor.fees.fixed + (request.amount * processor.fees.percentage);
    const totalAmount = request.amount + fee;

    try {
      switch (request.processor) {
        case 'stripe':
          return await this.processStripePayment(request, totalAmount, fee);
        case 'paypal':
          return await this.processPayPalPayment(request, totalAmount, fee);
        case 'wise':
          return await this.processWisePayment(request, totalAmount, fee);
        case 'square':
          return await this.processSquarePayment(request, totalAmount, fee);
        case 'adyen':
          return await this.processAdyenPayment(request, totalAmount, fee);
        default:
          throw new Error(`Payment processor ${request.processor} not implemented`);
      }
    } catch (error) {
      this.logger.error(`Payment processing failed for ${request.processor}:`, error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  async getPaymentStatus(processorName: string, processorTransactionId: string): Promise<PaymentResult> {
    switch (processorName) {
      case 'stripe':
        return await this.getStripePaymentStatus(processorTransactionId);
      case 'paypal':
        return await this.getPayPalPaymentStatus(processorTransactionId);
      case 'wise':
        return await this.getWisePaymentStatus(processorTransactionId);
      case 'square':
        return await this.getSquarePaymentStatus(processorTransactionId);
      case 'adyen':
        return await this.getAdyenPaymentStatus(processorTransactionId);
      default:
        throw new Error(`Payment processor ${processorName} not implemented`);
    }
  }

  async cancelPayment(processorName: string, processorTransactionId: string): Promise<void> {
    this.logger.log(`Cancelling payment ${processorTransactionId} via ${processorName}`);

    switch (processorName) {
      case 'stripe':
        await this.cancelStripePayment(processorTransactionId);
        break;
      case 'paypal':
        await this.cancelPayPalPayment(processorTransactionId);
        break;
      case 'wise':
        await this.cancelWisePayment(processorTransactionId);
        break;
      case 'square':
        await this.cancelSquarePayment(processorTransactionId);
        break;
      case 'adyen':
        await this.cancelAdyenPayment(processorTransactionId);
        break;
      default:
        throw new Error(`Payment processor ${processorName} not implemented`);
    }
  }

  async refundPayment(
    processorName: string,
    processorTransactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<PaymentResult> {
    this.logger.log(`Refunding payment ${processorTransactionId} via ${processorName}`);

    switch (processorName) {
      case 'stripe':
        return await this.refundStripePayment(processorTransactionId, amount, reason);
      case 'paypal':
        return await this.refundPayPalPayment(processorTransactionId, amount, reason);
      case 'wise':
        return await this.refundWisePayment(processorTransactionId, amount, reason);
      case 'square':
        return await this.refundSquarePayment(processorTransactionId, amount, reason);
      case 'adyen':
        return await this.refundAdyenPayment(processorTransactionId, amount, reason);
      default:
        throw new Error(`Payment processor ${processorName} not implemented`);
    }
  }

  async estimatePaymentCost(
    processorName: string,
    currency: string,
    amount: number,
  ): Promise<{
    processorFee: number;
    totalCost: number;
    estimatedTime: number;
    exchangeRate?: number;
  }> {
    const processor = this.processors.get(processorName);
    if (!processor) {
      throw new Error(`Processor ${processorName} not found`);
    }

    const processorFee = processor.fees.fixed + (amount * processor.fees.percentage);
    const totalCost = amount + processorFee;
    const estimatedTime = this.getEstimatedProcessingTime(processorName, currency);

    return {
      processorFee,
      totalCost,
      estimatedTime,
    };
  }

  async validatePaymentMethod(
    processorName: string,
    paymentMethod: any,
  ): Promise<{
    valid: boolean;
    errors?: string[];
    metadata?: any;
  }> {
    switch (processorName) {
      case 'stripe':
        return await this.validateStripePaymentMethod(paymentMethod);
      case 'paypal':
        return await this.validatePayPalPaymentMethod(paymentMethod);
      case 'wise':
        return await this.validateWisePaymentMethod(paymentMethod);
      case 'square':
        return await this.validateSquarePaymentMethod(paymentMethod);
      case 'adyen':
        return await this.validateAdyenPaymentMethod(paymentMethod);
      default:
        throw new Error(`Payment processor ${processorName} not implemented`);
    }
  }

  // Stripe implementation
  private async processStripePayment(request: PaymentRequest, totalAmount: number, fee: number): Promise<PaymentResult> {
    const apiKey = this.apiKeys.get('stripe');
    if (!apiKey) throw new Error('Stripe API key not configured');

    const paymentData = {
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      payment_method: request.recipient.identifier,
      confirmation_method: 'manual',
      confirm: true,
      metadata: request.metadata,
    };

    const response = await firstValueFrom(
      this.httpService.post('https://api.stripe.com/v1/payment_intents', paymentData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    return {
      transactionId: crypto.randomUUID(),
      processorTransactionId: response.data.id,
      status: this.mapStripeStatus(response.data.status),
      amount: request.amount,
      currency: request.currency,
      fee,
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      trackingUrl: response.data.next_action?.redirect_to_url?.url,
      metadata: response.data,
    };
  }

  private async getStripePaymentStatus(processorTransactionId: string): Promise<PaymentResult> {
    const apiKey = this.apiKeys.get('stripe');
    if (!apiKey) throw new Error('Stripe API key not configured');

    const response = await firstValueFrom(
      this.httpService.get(`https://api.stripe.com/v1/payment_intents/${processorTransactionId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }),
    );

    return {
      transactionId: crypto.randomUUID(),
      processorTransactionId: response.data.id,
      status: this.mapStripeStatus(response.data.status),
      amount: response.data.amount / 100,
      currency: response.data.currency.toUpperCase(),
      fee: response.data.metadata?.fee || 0,
      estimatedCompletion: new Date(),
      metadata: response.data,
    };
  }

  private mapStripeStatus(stripeStatus: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    const statusMap: Record<string, any> = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'processing',
      'processing': 'processing',
      'succeeded': 'completed',
      'canceled': 'cancelled',
    };
    return statusMap[stripeStatus] || 'failed';
  }

  // PayPal implementation (simplified)
  private async processPayPalPayment(request: PaymentRequest, totalAmount: number, fee: number): Promise<PaymentResult> {
    const apiKey = this.apiKeys.get('paypal');
    if (!apiKey) throw new Error('PayPal API key not configured');

    // Simplified PayPal implementation
    return {
      transactionId: crypto.randomUUID(),
      processorTransactionId: `PAYPAL_${crypto.randomUUID()}`,
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      fee,
      estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      trackingUrl: `https://www.paypal.com/payment/${crypto.randomUUID()}`,
    };
  }

  // Wise implementation (simplified)
  private async processWisePayment(request: PaymentRequest, totalAmount: number, fee: number): Promise<PaymentResult> {
    const apiKey = this.apiKeys.get('wise');
    if (!apiKey) throw new Error('Wise API key not configured');

    return {
      transactionId: crypto.randomUUID(),
      processorTransactionId: `WISE_${crypto.randomUUID()}`,
      status: 'processing',
      amount: request.amount,
      currency: request.currency,
      fee,
      estimatedCompletion: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };
  }

  // Square implementation (simplified)
  private async processSquarePayment(request: PaymentRequest, totalAmount: number, fee: number): Promise<PaymentResult> {
    const apiKey = this.apiKeys.get('square');
    if (!apiKey) throw new Error('Square API key not configured');

    return {
      transactionId: crypto.randomUUID(),
      processorTransactionId: `SQUARE_${crypto.randomUUID()}`,
      status: 'completed',
      amount: request.amount,
      currency: request.currency,
      fee,
      estimatedCompletion: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
    };
  }

  // Adyen implementation (simplified)
  private async processAdyenPayment(request: PaymentRequest, totalAmount: number, fee: number): Promise<PaymentResult> {
    const apiKey = this.apiKeys.get('adyen');
    if (!apiKey) throw new Error('Adyen API key not configured');

    return {
      transactionId: crypto.randomUUID(),
      processorTransactionId: `ADYEN_${crypto.randomUUID()}`,
      status: 'processing',
      amount: request.amount,
      currency: request.currency,
      fee,
      estimatedCompletion: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    };
  }

  // Placeholder implementations for other methods
  private async cancelStripePayment(processorTransactionId: string): Promise<void> {
    // Implementation would cancel Stripe payment
  }

  private async cancelPayPalPayment(processorTransactionId: string): Promise<void> {
    // Implementation would cancel PayPal payment
  }

  private async cancelWisePayment(processorTransactionId: string): Promise<void> {
    // Implementation would cancel Wise payment
  }

  private async cancelSquarePayment(processorTransactionId: string): Promise<void> {
    // Implementation would cancel Square payment
  }

  private async cancelAdyenPayment(processorTransactionId: string): Promise<void> {
    // Implementation would cancel Adyen payment
  }

  private async refundStripePayment(processorTransactionId: string, amount?: number, reason?: string): Promise<PaymentResult> {
    // Implementation would process Stripe refund
    return {} as PaymentResult;
  }

  private async refundPayPalPayment(processorTransactionId: string, amount?: number, reason?: string): Promise<PaymentResult> {
    // Implementation would process PayPal refund
    return {} as PaymentResult;
  }

  private async refundWisePayment(processorTransactionId: string, amount?: number, reason?: string): Promise<PaymentResult> {
    // Implementation would process Wise refund
    return {} as PaymentResult;
  }

  private async refundSquarePayment(processorTransactionId: string, amount?: number, reason?: string): Promise<PaymentResult> {
    // Implementation would process Square refund
    return {} as PaymentResult;
  }

  private async refundAdyenPayment(processorTransactionId: string, amount?: number, reason?: string): Promise<PaymentResult> {
    // Implementation would process Adyen refund
    return {} as PaymentResult;
  }

  private async getPayPalPaymentStatus(processorTransactionId: string): Promise<PaymentResult> {
    // Implementation would get PayPal payment status
    return {} as PaymentResult;
  }

  private async getWisePaymentStatus(processorTransactionId: string): Promise<PaymentResult> {
    // Implementation would get Wise payment status
    return {} as PaymentResult;
  }

  private async getSquarePaymentStatus(processorTransactionId: string): Promise<PaymentResult> {
    // Implementation would get Square payment status
    return {} as PaymentResult;
  }

  private async getAdyenPaymentStatus(processorTransactionId: string): Promise<PaymentResult> {
    // Implementation would get Adyen payment status
    return {} as PaymentResult;
  }

  private async validateStripePaymentMethod(paymentMethod: any): Promise<any> {
    // Implementation would validate Stripe payment method
    return { valid: true };
  }

  private async validatePayPalPaymentMethod(paymentMethod: any): Promise<any> {
    // Implementation would validate PayPal payment method
    return { valid: true };
  }

  private async validateWisePaymentMethod(paymentMethod: any): Promise<any> {
    // Implementation would validate Wise payment method
    return { valid: true };
  }

  private async validateSquarePaymentMethod(paymentMethod: any): Promise<any> {
    // Implementation would validate Square payment method
    return { valid: true };
  }

  private async validateAdyenPaymentMethod(paymentMethod: any): Promise<any> {
    // Implementation would validate Adyen payment method
    return { valid: true };
  }

  private getProcessorRegions(processorName: string): string[] {
    const regions: Record<string, string[]> = {
      stripe: ['US', 'CA', 'EU', 'UK', 'AU'],
      paypal: ['US', 'CA', 'EU', 'UK', 'AU', 'JP', 'CN', 'IN'],
      wise: ['US', 'CA', 'EU', 'UK', 'AU', 'JP', 'CH'],
      square: ['US', 'CA', 'UK', 'EU', 'AU', 'JP'],
      adyen: ['US', 'CA', 'EU', 'UK', 'AU', 'JP', 'CH', 'SE', 'NO', 'DK'],
    };
    return regions[processorName] || [];
  }

  private getSettlementTimes(processorName: string): Record<string, number> {
    const times: Record<string, Record<string, number>> = {
      stripe: { card: 2, bank: 5, wallet: 1 },
      paypal: { wallet: 1, bank: 3 },
      wise: { bank: 1 },
      square: { card: 1, bank: 2 },
      adyen: { card: 2, bank: 3, wallet: 1 },
    };
    return times[processorName] || {};
  }

  private getComplianceLevels(processorName: string): string[] {
    const levels: Record<string, string[]> = {
      stripe: ['PCI-DSS', 'GDPR', 'SOC2'],
      paypal: ['PCI-DSS', 'GDPR', 'SOC2'],
      wise: ['PCI-DSS', 'GDPR', 'FCA'],
      square: ['PCI-DSS', 'GDPR', 'SOC2'],
      adyen: ['PCI-DSS', 'GDPR', 'SOC2', 'PCI-SSC'],
    };
    return levels[processorName] || [];
  }

  private getEstimatedProcessingTime(processorName: string, currency: string): number {
    const baseTimes: Record<string, number> = {
      stripe: 300, // 5 minutes
      paypal: 600, // 10 minutes
      wise: 3600, // 1 hour
      square: 120, // 2 minutes
      adyen: 900, // 15 minutes
    };
    return baseTimes[processorName] || 300;
  }
}
