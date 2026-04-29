import { Injectable } from '@nestjs/common';
import { Server, TransactionBuilder, Networks, Keypair, Asset } from '@stellar/stellar-sdk';

@Injectable()
export class StellarIntegrationService {
  private server: Server;

  constructor() {
    this.server = new Server('https://horizon-testnet.stellar.org'); // Use testnet for now
  }

  async recordTrade(trade: any): Promise<void> {
    // Create a transaction to record the trade on Stellar
    const keypair = Keypair.fromSecret(process.env.STELLAR_SECRET_KEY!);

    const account = await this.server.loadAccount(keypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation({
        // Some operation to record trade, e.g., payment or data
        type: 'manageData',
        name: `trade_${trade.id}`,
        value: JSON.stringify(trade),
      })
      .setTimeout(30)
      .build();

    transaction.sign(keypair);

    await this.server.submitTransaction(transaction);
  }
}